import {
  API_ENDPOINTS,
  buildMapaDiarioItemPath,
  buildReservasDiariasItemPath,
} from '@/constants/api';
import { authGetRequest, authPatchRequest, authPostRequest } from '@/services/api-client';
import type { CriarReservaResponse } from '@/types/reserva';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import { normalizeReservasDiariasListFromApi, reservaPertenceAoUsuario } from '@/utils/normalize-reservas-programacao';
import { unwrapReservaResponse } from '@/utils/reserva';

export async function getReservasDiariasDoUsuario(
  userId: number,
  authToken: string,
): Promise<ReservaUsuario[]> {
  if (userId <= 0) {
    return [];
  }

  const data = await authGetRequest<unknown>(API_ENDPOINTS.reservasDiarias, authToken);

  return normalizeReservasDiariasListFromApi(data).filter((reserva) =>
    reservaPertenceAoUsuario(reserva, userId),
  );
}

export async function criarReservaDiaria(
  mapadiarioId: number,
  authToken: string,
): Promise<CriarReservaResponse> {
  return unwrapReservaResponse(
    await authPostRequest<CriarReservaResponse>(API_ENDPOINTS.criarReservaDiaria, authToken, {
      mapadiario_id: mapadiarioId,
    }),
  );
}

export async function cancelarReservaDiaria(
  reserva: Pick<ReservaUsuario, 'id' | 'mapadiario_id'>,
  authToken: string,
): Promise<unknown> {
  if (reserva.id <= 0) {
    throw new Error('Não foi possível identificar a reserva para cancelar.');
  }

  await authPatchRequest(buildReservasDiariasItemPath(reserva.id), authToken, {
    cancelado: true,
  });

  if (reserva.mapadiario_id > 0) {
    await authPatchRequest(buildMapaDiarioItemPath(reserva.mapadiario_id), authToken, {
      reservasdiarias_id: 0,
    });
  }

  return { mensagem: 'Reserva cancelada com sucesso.' };
}
