import { buildHorarioItemPath, buildHorariosListPath, API_ENDPOINTS } from '@/constants/api';
import { authDeleteRequest, authGetRequest, authPostRequest } from '@/services/api-client';
import type { CreateHorarioPayload, Horario } from '@/types/horario';
import {
  filterHorariosByAcademiaAndAtividade,
  normalizeHorarioFromApi,
  normalizeHorariosFromApi,
} from '@/utils/normalize-horario';

export async function getHorariosByAcademia(
  academiasId: number,
  authToken: string,
  atividadesId?: number | null,
): Promise<Horario[]> {
  const data = await authGetRequest<unknown>(
    buildHorariosListPath(academiasId, atividadesId ?? undefined),
    authToken,
  );
  const horarios = normalizeHorariosFromApi(data);
  return filterHorariosByAcademiaAndAtividade(horarios, academiasId, atividadesId);
}

export async function createHorario(payload: CreateHorarioPayload, authToken: string): Promise<Horario> {
  const data = await authPostRequest<unknown>(API_ENDPOINTS.horarios, authToken, payload);
  const horario = normalizeHorarioFromApi(data);

  if (!horario || horario.academias_id <= 0) {
    throw new Error('O horário foi enviado, mas o condomínio não foi gravado.');
  }

  return horario;
}

export async function deleteHorario(horariosId: number, authToken: string): Promise<unknown> {
  return authDeleteRequest(buildHorarioItemPath(horariosId), authToken);
}
