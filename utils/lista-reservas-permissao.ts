import type { Academia } from '@/types/academia';
import type { User } from '@/types/user';
import type { UserLocalAssociation } from '@/types/user-local';
import {
  canManageAcademia,
  isUserAdministrador,
  isUserGestorOfAcademiaFromAssociation,
} from '@/utils/club-config';
import { isModuloAtivoNaAcademia } from '@/utils/academia-permissoes-gestor';
import { isModuloAtivoParaProfessor } from '@/utils/academia-permissoes-professor';
import { isModuloAtivoParaUsuario } from '@/utils/academia-permissoes-usuario';
import { isUserProfessorOfAcademia } from '@/utils/lista-presenca-permissao';
import { normalizeRecordId } from '@/utils/normalize-api-fields';

function academiaTemModuloListaReservas(academia: Academia): boolean {
  return isModuloAtivoNaAcademia(academia, 'listaReservas');
}

function academiaListaReservasLiberadaParaUsuario(academia: Academia): boolean {
  return (
    academiaTemModuloListaReservas(academia) &&
    isModuloAtivoParaUsuario(academia, 'listaReservas')
  );
}

export function isReservableUserLocalAssociation(association: UserLocalAssociation): boolean {
  return association.aprovado && !association.bloqueado;
}

export function userIsAssociadoAprovadoAcademia(
  academiasId: number,
  associations: UserLocalAssociation[],
): boolean {
  const normalizedAcademiasId = normalizeRecordId(academiasId);

  if (normalizedAcademiasId == null) {
    return false;
  }

  return associations.some((association) => {
    const associationAcademiasId = normalizeRecordId(association.academias_id);

    return (
      associationAcademiasId === normalizedAcademiasId &&
      isReservableUserLocalAssociation(association)
    );
  });
}

function buildListaReservasUsuarioAcademiaIds(academias: Academia[]): Set<number> {
  const academiaIds = new Set<number>();

  for (const academia of academias) {
    if (!academiaListaReservasLiberadaParaUsuario(academia)) {
      continue;
    }

    const normalizedId = normalizeRecordId(academia.id);

    if (normalizedId != null) {
      academiaIds.add(normalizedId);
    }
  }

  return academiaIds;
}

export function userHasReservableMensalPorSemanaAssociation(
  academias: Academia[],
  associations: UserLocalAssociation[],
): boolean {
  const academiaIds = buildListaReservasUsuarioAcademiaIds(academias);

  if (academiaIds.size === 0) {
    return false;
  }

  return associations.some((association) => {
    const associationAcademiasId = normalizeRecordId(association.academias_id);

    return (
      associationAcademiasId != null &&
      academiaIds.has(associationAcademiasId) &&
      isReservableUserLocalAssociation(association)
    );
  });
}

export function canAccessAcademiaListaReservas(
  academia: Academia | null | undefined,
  associations: UserLocalAssociation[] = [],
  user?: User | null,
): boolean {
  if (!academia || !user) {
    return false;
  }

  if (isUserAdministrador(user)) {
    return true;
  }

  if (!academiaTemModuloListaReservas(academia)) {
    return false;
  }

  if (canManageAcademia(user, academia.id, associations)) {
    return true;
  }

  if (
    isUserProfessorOfAcademia(user, academia.id, associations) &&
    isModuloAtivoParaProfessor(academia, 'listaReservas')
  ) {
    return true;
  }

  return (
    isModuloAtivoParaUsuario(academia, 'listaReservas') &&
    userIsAssociadoAprovadoAcademia(academia.id, associations)
  );
}

export function filterAcademiasForListaReservas(
  academias: Academia[],
  associations: UserLocalAssociation[] = [],
  user?: User | null,
): Academia[] {
  return academias.filter((academia) =>
    canAccessAcademiaListaReservas(academia, associations, user),
  );
}

export function canAccessListaReservasPage(
  academias: Academia[],
  associations: UserLocalAssociation[] = [],
  user?: User | null,
): boolean {
  if (!user) {
    return userHasReservableMensalPorSemanaAssociation(academias, associations);
  }

  if (isUserAdministrador(user)) {
    return true;
  }

  if (
    academias.some(
      (academia) =>
        academiaTemModuloListaReservas(academia) &&
        canManageAcademia(user, academia.id, associations),
    )
  ) {
    return true;
  }

  return userHasReservableMensalPorSemanaAssociation(academias, associations);
}

export function canExcluirReservaLista(
  user: User | null | undefined,
  academiasId: number,
  associations: UserLocalAssociation[] = [],
): boolean {
  if (!user) {
    return false;
  }

  return (
    canManageAcademia(user, academiasId, associations) ||
    isUserGestorOfAcademiaFromAssociation(user, academiasId, associations)
  );
}
