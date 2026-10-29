import { getAcademias } from '@/services/academias-service';
import {
  cancelarReservaMensalPorSemana,
  criarReservaMensalPorSemana,
  getReservasUsuarioMensalPorSemana,
} from '@/services/reservas-mensal-por-semana-service';
import {
  cancelarReservaDiaria,
  getReservasDiariasDoUsuario,
} from '@/services/reservas-diarias-service';
import {
  cancelarReservaSemanal,
  getReservasSemanaisDoUsuario,
} from '@/services/reservas-semanais-service';
import { getMapaMensalPorSemana } from '@/services/mapa-mensal-por-semana-service';
import type { ReservaSummary } from '@/types/home-summary';
import type { User } from '@/types/user';
import type { Academia } from '@/types/academia';
import type { Atividade } from '@/types/atividade';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import type { CriarReservaResponse, ReservaResponsavelActor } from '@/types/reserva';
import type { ReservasUsuarioResponse } from '@/types/reserva-usuario';
import type { ListaEsperaPromocaoSlot } from '@/services/lista-espera-promocao-service';
import { findAcademiaById } from '@/utils/academia-publicidade';
import { isAcademiaSemPublicidade } from '@/utils/academia-publicidade';
import { enrichMapaMensalPorSemanaComReservas } from '@/utils/mapa-mensal-por-semana-reserva';
import {
  assertMapaDiarioFuturoTemCapacidadeDisponivel,
  type MapaDiarioFuturoFilters,
} from '@/utils/mapa-diario-futuro';

export async function resolveAcademiaForReserva(academiasId: number): Promise<Academia | null> {
  const academias = await getAcademias();

  return findAcademiaById(academias, academiasId);
}

export async function carregarMapaReservaHorario(
  authToken: string,
  filters: MapaDiarioFuturoFilters,
  _academia: Academia | null,
  options?: { usaMensalPorSemana?: boolean; userId?: number },
): Promise<MapaDiarioFuturoItem[]> {
  const [mapa, reservas] = await Promise.all([
    getMapaMensalPorSemana(authToken, {
      academias_id: filters.academias_id,
      atividades_id: filters.atividades_id,
    }),
    options?.userId
      ? getReservasUsuarioMensalPorSemana(options.userId, authToken)
      : Promise.resolve([]),
  ]);

  const doCondominio = mapa.filter(
    (item) =>
      item.academias_id === filters.academias_id && item.atividades_id === filters.atividades_id,
  );

  return enrichMapaMensalPorSemanaComReservas(doCondominio, reservas);
}

export async function confirmarReservaHorario(
  item: MapaDiarioFuturoItem,
  usersId: number,
  authToken: string,
  academia: Academia | null,
  _responsavelActor: ReservaResponsavelActor,
  options?: { usaMensalPorSemana?: boolean; atividade?: Atividade | null },
): Promise<CriarReservaResponse> {
  if (usersId <= 0) {
    throw new Error('Faça login para reservar.');
  }

  if (!academia || academia.id <= 0) {
    throw new Error('Selecione o condomínio.');
  }

  if (!options?.atividade || options.atividade.id <= 0) {
    throw new Error('Selecione a atividade.');
  }

  if (!item?.id || item.id <= 0) {
    throw new Error('Selecione um horário disponível para reservar.');
  }

  if (item.academias_id > 0 && item.academias_id !== academia.id) {
    throw new Error('O horário selecionado não pertence ao condomínio atual.');
  }

  if (item.atividades_id > 0 && item.atividades_id !== options.atividade.id) {
    throw new Error('O horário selecionado não pertence à atividade atual.');
  }

  if (
    options.atividade.temUnidades &&
    !(item.atividadeunidade_id != null && item.atividadeunidade_id > 0)
  ) {
    throw new Error('Selecione a unidade.');
  }

  assertMapaDiarioFuturoTemCapacidadeDisponivel(item);

  if (item.semana == null || item.semana <= 0) {
    throw new Error('Não foi possível identificar a semana do horário selecionado.');
  }

  return criarReservaMensalPorSemana(
    {
      mapamensalporsemana_id: item.id,
    },
    authToken,
    { incluirBannerReserva: !isAcademiaSemPublicidade(academia) },
  );
}

export async function getReservasUsuarioForUser(
  userId: number,
  authToken: string,
  academiasId: number,
  _options?: { usaMensalPorSemana?: boolean },
): Promise<ReservasUsuarioResponse> {
  const [mensais, diarias, semanais] = await Promise.all([
    getReservasUsuarioMensalPorSemana(userId, authToken),
    getReservasDiariasDoUsuario(userId, authToken),
    getReservasSemanaisDoUsuario(userId, authToken),
  ]);
  const reservas = [...mensais, ...diarias, ...semanais];

  if (academiasId <= 0) {
    return reservas;
  }

  return reservas
    .filter((reserva) => reserva.academias_id <= 0 || reserva.academias_id === academiasId)
    .map((reserva) =>
      reserva.academias_id > 0 ? reserva : { ...reserva, academias_id: academiasId },
    );
}

export function resolveReservasMensalPorSemanaCancelId(
  reserva: Pick<ReservaSummary, 'id' | 'reservasdamha_id' | 'mapadiariodamha_id'>,
): number | null {
  if (reserva.reservasdamha_id > 0) {
    return reserva.reservasdamha_id;
  }

  if (reserva.mapadiariodamha_id > 0 && reserva.id > 0) {
    return reserva.id;
  }

  return null;
}

export function buildListaEsperaPromocaoSlotFromReserva(
  reserva: Pick<
    ReservaSummary,
    | 'academias_id'
    | 'atividades_id'
    | 'dataAtividade'
    | 'mapadiario_id'
    | 'mapadiariodamha_id'
    | 'semana'
    | 'atividade'
    | 'atividadeunidade_id'
  >,
): ListaEsperaPromocaoSlot {
  return {
    academias_id: reserva.academias_id,
    atividades_id: reserva.atividades_id,
    dataAtividade: reserva.dataAtividade,
    mapadiario_id: reserva.mapadiario_id,
    mapadiariodamha_id: reserva.mapadiariodamha_id,
    semana: reserva.semana,
    atividade: reserva.atividade,
    atividadeunidade_id: reserva.atividadeunidade_id,
  };
}

export async function cancelarReservaForUser(
  reserva: Pick<
    ReservaSummary,
    | 'id'
    | 'academias_id'
    | 'reservasdamha_id'
    | 'mapadiariodamha_id'
    | 'atividades_id'
    | 'dataAtividade'
    | 'mapadiario_id'
    | 'mapasemanal_id'
    | 'programacao'
    | 'semana'
    | 'atividade'
    | 'atividadeunidade_id'
    | 'users_id'
    | 'responsavel_id'
  >,
  _user: Pick<User, 'id' | 'nome'>,
  authToken: string,
): Promise<unknown> {
  if (reserva.programacao === 'diaria') {
    return cancelarReservaDiaria(
      { id: reserva.id, mapadiario_id: reserva.mapadiario_id },
      authToken,
    );
  }

  if (reserva.programacao === 'semanal') {
    return cancelarReservaSemanal(
      { id: reserva.id, mapasemanal_id: reserva.mapasemanal_id },
      authToken,
    );
  }

  const reservasMensalPorSemanaId = resolveReservasMensalPorSemanaCancelId(reserva) ?? (
    reserva.id > 0 ? reserva.id : null
  );

  if (reservasMensalPorSemanaId == null) {
    throw new Error('Não foi possível identificar a reserva para cancelar.');
  }

  return cancelarReservaMensalPorSemana(
    {
      reservasMensalPorSemanaId,
      users_id: reserva.users_id,
      atividades_id: reserva.atividades_id,
      mapadiariodamha_id: reserva.mapadiariodamha_id,
      dataAtividade: reserva.dataAtividade,
      atividadeunidade_id: reserva.atividadeunidade_id,
      academias_id: reserva.academias_id,
      responsavel_id: reserva.responsavel_id,
    },
    authToken,
  );
}
