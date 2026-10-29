import { API_ENDPOINTS } from '@/constants/api';
import { authGetRequest } from '@/services/api-client';
import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import { normalizeMapaDiarioReservaListFromApi } from '@/utils/normalize-mapa-diario-reserva';

export type MapaDiarioReservaQuery = {
  academias_id?: number;
  atividades_id?: number;
};

function filterMapaDiarioReserva(
  items: MapaDiarioFuturoItem[],
  query?: MapaDiarioReservaQuery,
): MapaDiarioFuturoItem[] {
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

/** GET /mapadiario. A lista do Xano não documenta filtro; a seleção fica no cliente. */
export async function getMapaDiarioReserva(
  authToken: string,
  query?: MapaDiarioReservaQuery,
): Promise<MapaDiarioFuturoItem[]> {
  const data = await authGetRequest<unknown>(API_ENDPOINTS.mapaDiario, authToken);

  return filterMapaDiarioReserva(normalizeMapaDiarioReservaListFromApi(data), query);
}
