import type { Academia } from '@/types/academia';
import type { PermissaoGestorModulo } from '@/types/academia-permissoes-gestor';
import type { UserContextPermissions } from '@/types/user-context';
import type { User } from '@/types/user';
import type { UserLocalAssociation } from '@/types/user-local';
import { isModuloAtivoNaAcademia } from '@/utils/academia-permissoes-gestor';
import { isModuloAtivoParaProfessor } from '@/utils/academia-permissoes-professor';
import { isModuloAtivoParaUsuario } from '@/utils/academia-permissoes-usuario';
import { isUserGloballyExcluded, isValidUserLocalAssociation } from '@/utils/user-local-validation';
import { resolveEffectiveLocalRoles } from '@/utils/user-local-roles';

type BuildUserContextPermissionsInput = {
  currentAcademia?: Academia | null;
};

function hasValidLocalAccess(
  user: User | null | undefined,
  currentUserLocal: UserLocalAssociation | null | undefined,
  bloqueado: boolean,
): boolean {
  return (
    !bloqueado &&
    !isUserGloballyExcluded(user) &&
    currentUserLocal != null &&
    isValidUserLocalAssociation(currentUserLocal, user)
  );
}

function canAccessModuloRelatorio(
  input: {
    administrador: boolean;
    gestor: boolean;
    professor: boolean;
    bloqueado: boolean;
    currentAcademia: Academia | null;
    currentUserLocal: UserLocalAssociation | null | undefined;
    user: User | null | undefined;
  },
  modulo: PermissaoGestorModulo,
): boolean {
  const { administrador, gestor, professor, bloqueado, currentAcademia, currentUserLocal, user } =
    input;

  if (!currentAcademia) {
    return false;
  }

  if (administrador) {
    return true;
  }

  if (!hasValidLocalAccess(user, currentUserLocal, bloqueado)) {
    return false;
  }

  if (gestor) {
    return isModuloAtivoNaAcademia(currentAcademia, modulo);
  }

  if (professor) {
    return isModuloAtivoParaProfessor(currentAcademia, modulo);
  }

  return false;
}

export function buildUserContextPermissions(
  user: User | null | undefined,
  currentUserLocal: UserLocalAssociation | null | undefined,
  input: BuildUserContextPermissionsInput = {},
): UserContextPermissions {
  const administrador = user?.administrador === true;
  const { gestor: gestorFromLocal, professor: professorFromLocal } = currentUserLocal
    ? resolveEffectiveLocalRoles(currentUserLocal)
    : { gestor: false, professor: false };
  // Fallback para user.gestor (me-fone / sessão) se o local ainda não trouxe o papel.
  const gestor = gestorFromLocal || user?.gestor === true;
  const professor = professorFromLocal || user?.professor === true;
  const aprovado = currentUserLocal?.aprovado === true;
  const bloqueado =
    isUserGloballyExcluded(user) || currentUserLocal?.bloqueado === true || user?.bloqueado === true;
  const currentAcademia = input.currentAcademia ?? null;
  const listaPresencaAtiva = currentAcademia
    ? isModuloAtivoNaAcademia(currentAcademia, 'listaPresenca')
    : false;
  const listaEsperaAtiva = currentAcademia
    ? isModuloAtivoNaAcademia(currentAcademia, 'listaEspera')
    : false;
  const listaReservasAtiva = currentAcademia
    ? isModuloAtivoNaAcademia(currentAcademia, 'listaReservas')
    : false;

  const moduloAccessInput = {
    administrador,
    gestor,
    professor,
    bloqueado,
    currentAcademia,
    currentUserLocal,
    user,
  };

  const podeGerirLocal = administrador || gestor;
  const podeAcessarListaPresenca =
    listaPresencaAtiva &&
    (administrador ||
      gestor ||
      (professor &&
        (isModuloAtivoParaProfessor(currentAcademia, 'listaPresenca') ||
          user?.professor === true)));
  const podeVerListaPresencaNaHome =
    podeAcessarListaPresenca &&
    !(gestor && !administrador) &&
    (administrador ||
      (professor &&
        (isModuloAtivoParaProfessor(currentAcademia, 'listaPresenca') ||
          user?.professor === true)));
  const podeAcessarRelatoriosGestor = hasValidLocalAccess(user, currentUserLocal, bloqueado) &&
    (administrador || gestor);
  const podeAcessarListaReservasAtividade = canAccessModuloRelatorio(
    moduloAccessInput,
    'listaReservasAtividade',
  );
  const podeAcessarListaReservasPeriodo = canAccessModuloRelatorio(
    moduloAccessInput,
    'resumoPeriodo',
  );
  const podeAcessarConfiguracaoLocal = administrador;
  const podeAcessarProgramacaoAtividades = canAccessModuloRelatorio(
    moduloAccessInput,
    'programacaoAtividades',
  );
  const podeAcessarMapaFrequencia = canAccessModuloRelatorio(
    moduloAccessInput,
    'mapaFrequencia',
  );
  const podeAcessarRelatorioListaEspera = canAccessModuloRelatorio(
    moduloAccessInput,
    'relatorioListaEspera',
  );
  const podeUsarLocal =
    !isUserGloballyExcluded(user) &&
    currentUserLocal != null &&
    isValidUserLocalAssociation(currentUserLocal, user);
  // Administrador abre a lista mesmo sem localPrioritario (escolhe o local na tela).
  const podeAcessarListaReservas =
    administrador ||
    (listaReservasAtiva &&
      (podeGerirLocal ||
        (podeUsarLocal && isModuloAtivoParaUsuario(currentAcademia, 'listaReservas')) ||
        (professor && isModuloAtivoParaProfessor(currentAcademia, 'listaReservas'))));
  const podeAcessarListaEspera = listaEsperaAtiva && podeUsarLocal;
  const podeVerListaEsperaNaHome =
    podeAcessarListaEspera && !administrador && !gestor && !professor;

  return {
    administrador,
    gestor,
    professor,
    aprovado,
    bloqueado,
    podeGerirLocal,
    podeAcessarListaPresenca,
    podeVerListaPresencaNaHome,
    podeAcessarListaReservasAtividade,
    podeAcessarListaReservasPeriodo,
    podeAcessarConfiguracaoLocal,
    podeAcessarProgramacaoAtividades,
    podeAcessarMapaFrequencia,
    podeAcessarRelatorioListaEspera,
    podeAcessarListaEspera,
    podeVerListaEsperaNaHome,
    podeAcessarListaReservas,
    podeUsarLocal,
  };
}
