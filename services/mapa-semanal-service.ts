import { API_ENDPOINTS } from '@/constants/api';
import { authGetRequest } from '@/services/api-client';
import type { MapaSemanalItem } from '@/types/mapa-semanal';
import { normalizeMapaSemanalListFromApi } from '@/utils/normalize-mapa-semanal';

export type MapaSemanalQuery = {
  academias_id?: number;
  atividades_id?: number;
};

function filterMapaSemanal(items: MapaSemanalItem[], query?: MapaSemanalQuery): MapaSemanalItem[] {
  return items.filter((item) => {
    if (query?.academias_id != null && item.academias_id !== query.academias_id) {
      return false;
    }

    if (query?.atividades_id != null && item.atividades_id !== query.atividades_id) {
      return false;
    }

    return true;
  });
}

/** GET /mapasemanal. A lista do Xano não documenta filtro; a seleção fica no cliente. */
export async function getMapaSemanal(
  authToken: string,
  query?: MapaSemanalQuery,
): Promise<MapaSemanalItem[]> {
  const data = await authGetRequest<unknown>(API_ENDPOINTS.mapaSemanal, authToken);

  return filterMapaSemanal(normalizeMapaSemanalListFromApi(data), query);
}
