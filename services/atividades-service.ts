import {
  API_ENDPOINTS,
  buildAtividadeItemPath,
  buildAtividadesListPath,
} from '@/constants/api';
import {
  authDeleteRequest,
  authGetRequest,
  authPatchRequest,
  authPostRequest,
  getRequest,
} from '@/services/api-client';
import type { Atividade, AtividadeOption, CreateAtividadePayload } from '@/types/atividade';
import type { UpdateAtividadePayload } from '@/utils/atividade-form';
import { normalizeAtividadeFromApi, normalizeAtividadesFromApi } from '@/utils/normalize-atividade';

export async function getAtividades(academiasId?: number): Promise<Atividade[]> {
  const data = await getRequest<unknown>(buildAtividadesListPath(academiasId));
  const atividades = normalizeAtividadesFromApi(data);

  if (academiasId == null) {
    return atividades;
  }

  return filterAtividadesByAcademia(atividades, academiasId);
}

/** Lista atividades do condomínio via GET /atividades?condominio_id= */
export async function getAtividadesAcademia(academiasId: number): Promise<Atividade[]> {
  const data = await getRequest<unknown>(buildAtividadesListPath(academiasId));
  return filterAtividadesByAcademia(normalizeAtividadesFromApi(data), academiasId);
}

export async function getAtividadesByAcademia(
  academiasId: number,
  authToken: string,
): Promise<Atividade[]> {
  const data = await authGetRequest<unknown>(buildAtividadesListPath(academiasId), authToken);
  return filterAtividadesByAcademia(normalizeAtividadesFromApi(data), academiasId);
}

export async function getAtividadeById(
  atividadesId: number,
  authToken: string,
): Promise<Atividade> {
  const data = await authGetRequest<unknown>(buildAtividadeItemPath(atividadesId), authToken);
  const atividade = normalizeAtividadeFromApi(data);

  if (!atividade) {
    throw new Error('Atividade não encontrada.');
  }

  return atividade;
}

export async function createAtividade(
  payload: CreateAtividadePayload,
  authToken: string,
): Promise<Atividade> {
  const data = await authPostRequest<unknown>(API_ENDPOINTS.atividades, authToken, payload);
  const atividade = normalizeAtividadeFromApi(data);

  if (!atividade) {
    throw new Error('A atividade foi enviada, mas o nome ou o condomínio não foram gravados.');
  }

  return atividade;
}

export async function updateAtividade(
  atividadesId: number,
  payload: UpdateAtividadePayload,
  authToken: string,
): Promise<Atividade> {
  return authPatchRequest<Atividade>(buildAtividadeItemPath(atividadesId), authToken, payload);
}

export async function deleteAtividade(atividadesId: number, authToken: string): Promise<unknown> {
  return authDeleteRequest(buildAtividadeItemPath(atividadesId), authToken);
}

export function filterAtividadesByAcademia(
  atividades: Atividade[],
  academiasId: number,
): Atividade[] {
  return atividades
    .filter((item) => item.academias_id === academiasId)
    .sort((a, b) => a.atividade.localeCompare(b.atividade, 'pt-BR'));
}

export function mapAtividadesToOptions(atividades: Atividade[]): AtividadeOption[] {
  return atividades.map((item) => ({
    id: item.id,
    nome: item.atividade,
    tipoProgramacao: item.tipoProgramacao,
    limiteReservasSemana: item.limiteReservasSemana,
    temUnidades: item.temUnidades,
  }));
}
