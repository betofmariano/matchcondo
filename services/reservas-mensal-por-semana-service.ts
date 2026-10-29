import {
  API_ENDPOINTS,
  buildMapaMensalPorSemanaItemPath,
  buildReservasMensalPorSemanaItemPath,
  buildReservasMensalPorSemanaListPath,
  buildReservasUsuarioMensalPorSemanaPath,
} from '@/constants/api';
import { authGetRequest, authPatchRequest, authPostRequest, getApiErrorMessage } from '@/services/api-client';
import { getMapaMensalPorSemanaById } from '@/services/mapa-mensal-por-semana-service';
import { notifyCriarReservaWhatsAppIfNeeded } from '@/services/reservas-service';
import type {
  CriarReservaMensalPorSemanaPayload,
  CriarReservaMensalPorSemanaResponse,
} from '@/types/reserva-mensal-por-semana';
import type { ReservasUsuarioResponse } from '@/types/reserva-usuario';
import {
  enrichReservasUsuarioOwner,
  normalizeReservasUsuarioListFromApi,
} from '@/utils/normalize-reserva-usuario';
import { unwrapReservaResponse } from '@/utils/reserva';
import {
  resolveNextNumeroCancelamento,
  type ReservaMensalPorSemanaCancelamentoKey,
} from '@/utils/reserva-mensal-por-semana-cancelamento';

/**
 * Fluxo MensalPorSemana. Não usado pelo padrão Diária.
 */
export async function getReservasUsuarioMensalPorSemana(
  userId: number,
  authToken: string,
): Promise<ReservasUsuarioResponse> {
  const data = await authGetRequest<unknown>(
    buildReservasUsuarioMensalPorSemanaPath(userId),
    authToken,
  );

  return enrichReservasUsuarioOwner(normalizeReservasUsuarioListFromApi(data), userId);
}

/** Reservas válidas do usuário no condomínio, incluindo passadas, para validar limite semanal. */
export async function getReservasMensalPorSemanaLimiteSemanalUsuario(
  userId: number,
  academiasId: number,
  authToken: string,
): Promise<ReservasUsuarioResponse> {
  if (userId <= 0) {
    return [];
  }

  const reservas = await getReservasUsuarioMensalPorSemana(userId, authToken);

  return reservas.filter((reserva) => {
    if (reserva.users_id !== userId && reserva.responsavel_id !== userId) {
      return false;
    }

    if (academiasId > 0 && reserva.academias_id > 0 && reserva.academias_id !== academiasId) {
      return false;
    }

    return true;
  });
}

export async function getReservasMensalPorSemanaByAcademia(
  academiasId: number,
  authToken: string,
): Promise<ReservasUsuarioResponse> {
  const data = await authGetRequest<unknown>(
    buildReservasMensalPorSemanaListPath(academiasId),
    authToken,
  );

  return normalizeReservasUsuarioListFromApi(data);
}

export type CancelarReservaMensalPorSemanaInput = ReservaMensalPorSemanaCancelamentoKey & {
  reservasMensalPorSemanaId: number;
  academias_id: number;
  responsavel_id?: number;
};

function isDuplicateRecordError(error: unknown): boolean {
  const message = getApiErrorMessage(error).toLowerCase();

  return (
    message.includes('duplicate record') ||
    message.includes('duplicidade') ||
    message.includes('já existe') ||
    message.includes('ja existe')
  );
}

async function loadReservasParaNumeroCancelamento(
  usersId: number,
  academiasId: number,
  authToken: string,
): Promise<ReservasUsuarioResponse> {
  const [byUser, byAcademia] = await Promise.all([
    usersId > 0 ? getReservasUsuarioMensalPorSemana(usersId, authToken) : Promise.resolve([]),
    academiasId > 0
      ? getReservasMensalPorSemanaByAcademia(academiasId, authToken)
      : Promise.resolve([]),
  ]);

  const byId = new Map<number, (typeof byUser)[number]>();

  for (const reserva of [...byUser, ...byAcademia]) {
    if (
      usersId > 0 &&
      reserva.users_id !== usersId &&
      reserva.responsavel_id !== usersId
    ) {
      continue;
    }

    byId.set(reserva.id, reserva);
  }

  return [...byId.values()];
}

async function persistCancelamentoNoRegistro(
  reservasMensalPorSemanaId: number,
  numeroCancelamento: number,
  authToken: string,
): Promise<void> {
  try {
    await authPatchRequest(buildReservasMensalPorSemanaItemPath(reservasMensalPorSemanaId), authToken, {
      cancelado: true,
      numeroCancelamento,
    });
  } catch (error) {
    if (isDuplicateRecordError(error)) {
      throw error;
    }

    await authPatchRequest(buildReservasMensalPorSemanaItemPath(reservasMensalPorSemanaId), authToken, {
      cancelado: true,
      numero_cancelamento: numeroCancelamento,
    });
  }
}

async function liberarHorarioMapaMensalPorSemana(
  mapadiariodamhaId: number,
  authToken: string,
): Promise<void> {
  if (mapadiariodamhaId <= 0) {
    return;
  }

  const mapa = await getMapaMensalPorSemanaById(mapadiariodamhaId, authToken);

  if (!mapa) {
    return;
  }

  await authPatchRequest(buildMapaMensalPorSemanaItemPath(mapadiariodamhaId), authToken, {
    ocupacao: Math.max(0, mapa.ocupacao - 1),
    reservasmensalporsemana_id: 0,
  });
}

export async function cancelarReservaMensalPorSemana(
  reserva: CancelarReservaMensalPorSemanaInput,
  authToken: string,
): Promise<unknown> {
  const ownerId = reserva.users_id > 0 ? reserva.users_id : reserva.responsavel_id ?? 0;
  const reservas = await loadReservasParaNumeroCancelamento(
    ownerId,
    reserva.academias_id,
    authToken,
  );
  const current =
    reservas.find(
      (item) =>
        item.id === reserva.reservasMensalPorSemanaId ||
        item.reservasdamha_id === reserva.reservasMensalPorSemanaId,
    ) ?? null;
  const cancelKey = {
    users_id: ownerId,
    atividades_id: current?.atividades_id || reserva.atividades_id,
    mapadiariodamha_id: current?.mapadiariodamha_id || reserva.mapadiariodamha_id,
    dataAtividade: current?.dataAtividade || reserva.dataAtividade,
    atividadeunidade_id: current?.atividadeunidade_id ?? reserva.atividadeunidade_id,
    numeroCancelamento: current?.numeroCancelamento ?? 0,
  };
  const historico = current
    ? reservas.some(
        (item) =>
          item.id === current.id || item.reservasdamha_id === current.reservasdamha_id,
      )
      ? reservas
      : [...reservas, current]
    : [...reservas, cancelKey];
  let numeroAtual = resolveNextNumeroCancelamento(cancelKey, historico);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await persistCancelamentoNoRegistro(
        reserva.reservasMensalPorSemanaId,
        numeroAtual,
        authToken,
      );
      await liberarHorarioMapaMensalPorSemana(cancelKey.mapadiariodamha_id, authToken);
      return { mensagem: 'Reserva cancelada com sucesso.' };
    } catch (error) {
      if (!isDuplicateRecordError(error) || attempt === 7) {
        throw error;
      }

      numeroAtual += 1;
    }
  }

  throw new Error('Não foi possível cancelar esta reserva. Tente novamente.');
}

export async function criarReservaMensalPorSemana(
  payload: CriarReservaMensalPorSemanaPayload,
  authToken: string,
  options?: { incluirBannerReserva?: boolean },
): Promise<CriarReservaMensalPorSemanaResponse> {
  console.log('Reserva MensalPorSemana iniciada');

  const data = unwrapReservaResponse(
    await authPostRequest<CriarReservaMensalPorSemanaResponse>(
      API_ENDPOINTS.criarReservaMensalPorSemana,
      authToken,
      {
        mapamensalporsemana_id: payload.mapamensalporsemana_id,
      },
    ),
  );

  console.log('Resposta de criarReservaMensalPorSemana recebida');

  await notifyCriarReservaWhatsAppIfNeeded(data, {
    incluirBannerReserva: options?.incluirBannerReserva ?? true,
    mensalSemana: true,
  });

  return data;
}
