import { API_ENDPOINTS, buildMapaDiarioGerarPath, buildMapaDiarioItemPath } from '@/constants/api';
import { authDeleteRequest, authGetRequest, authPatchRequest, getRequest } from '@/services/api-client';
import type { MapaDiarioResponse } from '@/types/mapa-diario';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import { findLatestDataAtividadeTimestampFromApi } from '@/utils/criar-mapa-diario';
import { normalizeMapaDiarioFuturoListFromApi } from '@/utils/normalize-mapa-diario-futuro';

function buildMapaDiarioPath(academiasId: number): string {
  const params = new URLSearchParams({
    academias_id: String(academiasId),
  });

  return `${API_ENDPOINTS.mapaDiario}?${params.toString()}`;
}

export async function getMapaDiarioAll(
  academiasId: number,
  authToken: string,
): Promise<MapaDiarioResponse> {
  return authGetRequest<MapaDiarioResponse>(buildMapaDiarioPath(academiasId), authToken);
}

/** Horários de atividades (passados e futuros) via GET /mapadiario. */
export async function getMapaDiarioAtividadeHorarios(
  academiasId: number,
  authToken: string,
): Promise<MapaDiarioFuturoItem[]> {
  const data = await authGetRequest<unknown>(buildMapaDiarioPath(academiasId), authToken);

  return normalizeMapaDiarioFuturoListFromApi(data);
}

export async function deleteMapaDiarioItem(
  mapaDiarioId: number,
  authToken: string,
): Promise<unknown> {
  return authDeleteRequest(buildMapaDiarioItemPath(mapaDiarioId), authToken);
}

export type UpdateMapaDiarioItemPayload = {
  capacidade: number;
};

export async function updateMapaDiarioItem(
  mapaDiarioId: number,
  authToken: string,
  payload: UpdateMapaDiarioItemPayload,
): Promise<unknown> {
  return authPatchRequest(buildMapaDiarioItemPath(mapaDiarioId), authToken, payload);
}

export type ApagarMapaDiarioResponse = Record<string, unknown>;

export async function apagarMapaDiario(authToken: string): Promise<ApagarMapaDiarioResponse> {
  console.log('Limpeza de registros diários anteriores a 6 horas atrás solicitada');

  const data = await authGetRequest<ApagarMapaDiarioResponse>(
    API_ENDPOINTS.apagarMapaDiario,
    authToken,
  );

  console.log('Resposta da limpeza do mapa diário recebida');

  return data;
}

/** Maior `dataAtividade` já gerada. A API não tem filtro; a data mais recente sai da lista. */
export async function getUltimaDataAtividadeMapaDiario(): Promise<number | null> {
  const data = await getRequest<unknown>(API_ENDPOINTS.mapaDiario);

  return findLatestDataAtividadeTimestampFromApi(data);
}

export type CriarMapaDiarioResponse = Record<string, unknown>;

export async function criarMapaDiario(data: string): Promise<CriarMapaDiarioResponse> {
  console.log('Criação de mapa diário solicitada', data);

  const response = await getRequest<CriarMapaDiarioResponse>(buildMapaDiarioGerarPath(data));

  console.log('Resposta da criação do mapa diário recebida');

  return response;
}
