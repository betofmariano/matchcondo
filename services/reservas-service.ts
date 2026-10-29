import { API_ENDPOINTS, buildReservaItemPath, buildReservasUsuarioPath } from '@/constants/api';
import { authDeleteRequest, authGetRequest, authPostRequest } from '@/services/api-client';
import { sendWzapReserva, sendWzapReservaReact } from '@/services/jogos-service';
import type { Jogo, JogosResponse } from '@/types/jogo';
import {
  type CancelarReservaPayload,
  type CriarReservaListaEsperaPayload,
  type CriarReservaPayload,
  type CriarReservaResponse,
} from '@/types/reserva';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import type { ReservasUsuarioResponse } from '@/types/reserva-usuario';
import { normalizeJogoFromApi } from '@/utils/normalize-jogo';
import { normalizeReservasUsuarioListFromApi, enrichReservasUsuarioOwner } from '@/utils/normalize-reserva-usuario';
import {
  extractReservaIdFromCriarReservaResponse,
  isReservaResponseSuccess,
  unwrapReservaResponse,
} from '@/utils/reserva';

function buildMeusJogosPath(userId: number): string {
  return `${API_ENDPOINTS.meusJogos}/${userId}`;
}

function unwrapJogosResponse(data: unknown): Jogo[] {
  if (Array.isArray(data)) {
    return data as Jogo[];
  }

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;

    for (const key of ['jogos', 'reservas', 'items', 'data'] as const) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value as Jogo[];
      }
    }
  }

  return [];
}

async function fetchJogosList(path: string, authToken: string): Promise<JogosResponse> {
  const data = await authGetRequest<unknown>(path, authToken);

  return unwrapJogosResponse(data).map((jogo) => normalizeJogoFromApi(jogo));
}

export async function getMeusJogos(
  userId: number,
  authToken: string,
): Promise<JogosResponse> {
  return fetchJogosList(buildMeusJogosPath(userId), authToken);
}

export async function getReservasUsuario(
  userId: number,
  authToken: string,
): Promise<ReservasUsuarioResponse> {
  const data = await authGetRequest<unknown>(buildReservasUsuarioPath(userId), authToken);

  return enrichReservasUsuarioOwner(normalizeReservasUsuarioListFromApi(data), userId);
}

export async function cancelarReservaUsuario(
  payload: CancelarReservaPayload,
  authToken: string,
): Promise<unknown> {
  return authDeleteRequest(
    buildReservaItemPath(payload.reservasId),
    authToken,
    {
      users_id: payload.users_id,
      responsavel: payload.responsavel,
      responsavel_id: payload.responsavel_id,
    },
  );
}

export async function notifyReservaViaWhatsApp(
  reservasId: number,
  options?: { mensalSemana?: boolean },
): Promise<void> {
  try {
    const payload = { reservas_id: reservasId };

    if (options?.mensalSemana) {
      await sendWzapReservaReact(payload);
    } else {
      await sendWzapReserva(payload);
    }

    if (__DEV__) {
      console.log('WhatsApp da reserva solicitado');
    }
  } catch {
    console.log('Não foi possível enviar WhatsApp da reserva');
  }
}

export async function notifyCriarReservaWhatsAppIfNeeded(
  data: CriarReservaResponse,
  options?: { incluirBannerReserva?: boolean; mensalSemana?: boolean },
): Promise<boolean> {
  const incluirBannerReserva = options?.incluirBannerReserva ?? true;
  const reservasId = extractReservaIdFromCriarReservaResponse(data);

  if (!isReservaResponseSuccess(data) || !reservasId || !incluirBannerReserva) {
    return false;
  }

  await notifyReservaViaWhatsApp(reservasId, { mensalSemana: options?.mensalSemana });

  return true;
}

export async function notifyCriarReservaWhatsAppFromResponses(
  responses: CriarReservaResponse[],
  options?: { incluirBannerReserva?: boolean; mensalSemana?: boolean },
): Promise<boolean> {
  for (const response of responses) {
    if (await notifyCriarReservaWhatsAppIfNeeded(response, options)) {
      return true;
    }
  }

  if (__DEV__) {
    const hasSuccess = responses.some((response) => isReservaResponseSuccess(response));

    if (hasSuccess) {
      console.warn('Reserva concluída sem IDReserva; WhatsApp não enviado');
    }
  }

  return false;
}

async function postCriarReserva(
  endpoint: string,
  payload: CriarReservaPayload | CriarReservaListaEsperaPayload,
  authToken: string,
  options?: { incluirBannerReserva?: boolean },
): Promise<CriarReservaResponse> {
  const data = unwrapReservaResponse(
    await authPostRequest<CriarReservaResponse>(endpoint, authToken, payload),
  );

  const incluirBannerReserva = options?.incluirBannerReserva ?? true;
  const whatsAppViaClient = endpoint === API_ENDPOINTS.criarReservaReact;

  if (whatsAppViaClient) {
    await notifyCriarReservaWhatsAppIfNeeded(data, {
      incluirBannerReserva,
      mensalSemana: true,
    });
  } else if (isReservaResponseSuccess(data) && !incluirBannerReserva && __DEV__) {
    console.log('Banner de reserva omitido: academia sem publicidade');
  }

  return data;
}

export async function criarReserva(
  payload: CriarReservaPayload,
  authToken: string,
  options?: { incluirBannerReserva?: boolean },
): Promise<CriarReservaResponse> {
  console.log('Reserva iniciada');

  const data = await postCriarReserva(
    API_ENDPOINTS.criarReserva,
    payload,
    authToken,
    options,
  );

  console.log('Resposta de criarReserva recebida');

  return data;
}

export async function criarReservaReact(
  payload: CriarReservaPayload,
  authToken: string,
  options?: { incluirBannerReserva?: boolean },
): Promise<CriarReservaResponse> {
  console.log('Reserva React iniciada');

  const data = await postCriarReserva(
    API_ENDPOINTS.criarReservaReact,
    payload,
    authToken,
    options,
  );

  console.log('Resposta de criarReservaReact recebida');

  return data;
}

export async function validarCondicoesCriarReserva(
  payload: CriarReservaListaEsperaPayload,
  authToken: string,
): Promise<CriarReservaResponse> {
  console.log('Validando condições de reserva');

  const data = unwrapReservaResponse(
    await authPostRequest<CriarReservaResponse>(
      API_ENDPOINTS.criarReserva,
      authToken,
      payload,
    ),
  );

  console.log('Resposta de criarReserva recebida');

  return data;
}

/** @deprecated Use validarCondicoesCriarReserva */
export const criarReservaFromListaEspera = validarCondicoesCriarReserva;

export function filterActiveFutureReservas(
  reservas: ReservaUsuario[],
  referenceDate: Date = new Date(),
): ReservaUsuario[] {
  const now = referenceDate.getTime();

  return reservas.filter((reserva) => {
    if (reserva.cancelado) {
      return false;
    }

    if (reserva.programacao === 'semanal') {
      return true;
    }

    if (!reserva.dataAtividade || reserva.dataAtividade < now) {
      return false;
    }

    return true;
  });
}
