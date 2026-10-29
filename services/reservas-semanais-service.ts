import {
  API_ENDPOINTS,
  buildMapaSemanalItemPath,
  buildReservasSemanaisItemPath,
} from '@/constants/api';
import { authGetRequest, authPatchRequest, authPostRequest } from '@/services/api-client';
import type { CriarReservaResponse } from '@/types/reserva';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import {
  normalizeReservasSemanaisListFromApi,
  reservaPertenceAoUsuario,
} from '@/utils/normalize-reservas-programacao';
import { unwrapReservaResponse } from '@/utils/reserva';

export async function getReservasSemanaisDoUsuario(
  userId: number,
  authToken: string,
): Promise<ReservaUsuario[]> {
  if (userId <= 0) {
    return [];
  }

  const data = await authGetRequest<unknown>(API_ENDPOINTS.reservasSemanais, authToken);

  return normalizeReservasSemanaisListFromApi(data).filter((reserva) =>
    reservaPertenceAoUsuario(reserva, userId),
  );
}

export async function criarReservaSemanal(
  mapasemanalId: number,
  authToken: string,
): Promise<CriarReservaResponse> {
  return unwrapReservaResponse(
    await authPostRequest<CriarReservaResponse>(API_ENDPOINTS.criarReservaSemanal, authToken, {
      mapasemanal_id: mapasemanalId,
    }),
  );
}

export async function cancelarReservaSemanal(
  reserva: Pick<ReservaUsuario, 'id' | 'mapasemanal_id'>,
  authToken: string,
): Promise<unknown> {
  if (reserva.id <= 0) {
    throw new Error('Não foi possível identificar a reserva para cancelar.');
  }

  await authPatchRequest(buildReservasSemanaisItemPath(reserva.id), authToken, {
    cancelado: true,
  });

  if (reserva.mapasemanal_id > 0) {
    await authPatchRequest(buildMapaSemanalItemPath(reserva.mapasemanal_id), authToken, {
      reservassemanais_id: 0,
    });
  }

  return { mensagem: 'Reserva cancelada com sucesso.' };
}
