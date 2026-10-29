import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import { getServerDate } from '@/utils/server-time';

export type MapaDiarioFuturoFilters = {
  academias_id: number;
  atividades_id: number;
};

export function formatMapaDiarioFuturoDataLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month} - ${hours}:${minutes}`;
}

export function getMapaDiarioFuturoVagasLivres(item: MapaDiarioFuturoItem): number {
  return Math.max(0, item.capacidade - item.ocupacao);
}

/** True quando ainda existe vaga real (ocupacao < capacidade e capacidade > 0). */
export function mapaDiarioFuturoTemCapacidadeDisponivel(
  item: Pick<MapaDiarioFuturoItem, 'capacidade' | 'ocupacao'>,
): boolean {
  if (!Number.isFinite(item.capacidade) || item.capacidade <= 0) {
    return false;
  }

  if (!Number.isFinite(item.ocupacao) || item.ocupacao < 0) {
    return false;
  }

  return item.ocupacao < item.capacidade;
}

export const CAPACIDADE_ESGOTADA_MESSAGE =
  'Não há vagas disponíveis neste horário. A capacidade já está esgotada.';

export function assertMapaDiarioFuturoTemCapacidadeDisponivel(
  item: Pick<MapaDiarioFuturoItem, 'capacidade' | 'ocupacao'>,
): void {
  if (!mapaDiarioFuturoTemCapacidadeDisponivel(item)) {
    throw new Error(CAPACIDADE_ESGOTADA_MESSAGE);
  }
}

const MS_PER_HOUR = 60 * 60 * 1000;

/** Horas antes da atividade em que a reserva é liberada (equivalente ao horasLiberacao do MatchPoint). */
export function resolveMapaDiarioFuturoDataLiberacao(item: MapaDiarioFuturoItem): number | null {
  const horasAntes = item.atividadeInfo?.horasAntes ?? 0;

  if (horasAntes > 0 && item.dataAtividade > 0) {
    return item.dataAtividade - horasAntes * MS_PER_HOUR;
  }

  return item.dataLiberacao;
}

function sortMapaDiarioFuturoDesc(
  items: MapaDiarioFuturoItem[],
): MapaDiarioFuturoItem[] {
  return [...items].sort((a, b) => b.dataAtividade - a.dataAtividade);
}

export function sortMapaDiarioFuturoAsc(
  items: MapaDiarioFuturoItem[],
): MapaDiarioFuturoItem[] {
  return [...items].sort((a, b) => a.dataAtividade - b.dataAtividade);
}

function filterMapaDiarioFuturoByAvailability(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date,
  matchesAvailability: (item: MapaDiarioFuturoItem) => boolean,
): MapaDiarioFuturoItem[] {
  const now = referenceDate.getTime();

  return sortMapaDiarioFuturoDesc(
    items.filter((item) => {
      if (item.academias_id !== filters.academias_id) {
        return false;
      }

      if (item.atividades_id !== filters.atividades_id) {
        return false;
      }

      const dataLiberacao = resolveMapaDiarioFuturoDataLiberacao(item);

      if (dataLiberacao == null || dataLiberacao > now) {
        return false;
      }

      if (item.dataAtividade <= now) {
        return false;
      }

      if (!matchesAvailability(item)) {
        return false;
      }

      if (item.limiteReserva != null && item.limiteReserva <= now) {
        return false;
      }

      return true;
    }),
  );
}

export function filterMapaDiarioFuturoReservaveis(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): MapaDiarioFuturoItem[] {
  return filterMapaDiarioFuturoByAvailability(items, filters, referenceDate, (item) =>
    getMapaDiarioFuturoVagasLivres(item) > 0,
  );
}

/** Horários já liberados, incluindo lotados — o mapa precisa aparecer mesmo completo. */
export function filterMapaDiarioFuturoExibiveis(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): MapaDiarioFuturoItem[] {
  return filterMapaDiarioFuturoByAvailability(items, filters, referenceDate, () => true);
}

export function filterMapaDiarioFuturoListaEspera(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): MapaDiarioFuturoItem[] {
  return filterMapaDiarioFuturoByAvailability(items, filters, referenceDate, (item) =>
    getMapaDiarioFuturoVagasLivres(item) === 0,
  );
}

export function resolveMapaDiarioFuturoObservacao(
  item: MapaDiarioFuturoItem,
  fallbackObservacao = '',
): string {
  return item.atividadeInfo?.observacao?.trim() || fallbackObservacao.trim();
}

export function resolveMapaDiarioCelulaConteudo(item: MapaDiarioFuturoItem): string {
  const conteudo = item.conteudo?.trim();

  if (conteudo) {
    return conteudo;
  }

  return 'Este horário não está disponível para reserva.';
}


function isMapaDiarioFuturoItemEligibleForLiberacao(
  item: MapaDiarioFuturoItem,
  filters: MapaDiarioFuturoFilters,
  now: number,
): boolean {
  if (item.academias_id !== filters.academias_id) {
    return false;
  }

  if (item.atividades_id !== filters.atividades_id) {
    return false;
  }

  const dataLiberacao = resolveMapaDiarioFuturoDataLiberacao(item);

  if (dataLiberacao == null) {
    return false;
  }

  if (item.dataAtividade <= now) {
    return false;
  }

  if (item.limiteReserva != null && item.limiteReserva <= now) {
    return false;
  }

  if (getMapaDiarioFuturoVagasLivres(item) <= 0) {
    return false;
  }

  return true;
}

export function getProximaLiberacaoTimestamp(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): number | null {
  const now = referenceDate.getTime();

  const nextPendingItem = items
    .filter(
      (item) =>
        isMapaDiarioFuturoItemEligibleForLiberacao(item, filters, now) &&
        resolveMapaDiarioFuturoDataLiberacao(item)! > now,
    )
    .sort((a, b) => a.dataAtividade - b.dataAtividade)[0];

  if (!nextPendingItem) {
    return getProximaDataLiberacaoFromMapaItems(items, filters, referenceDate);
  }

  return resolveMapaDiarioFuturoDataLiberacao(nextPendingItem);
}

/**
 * Fallback para countdown: menor dataLiberacao futura nos itens do mapa
 * já carregado (diário ou mensal).
 */
export function getProximaDataLiberacaoFromMapaItems(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): number | null {
  const now = referenceDate.getTime();
  let next: number | null = null;

  for (const item of items) {
    if (item.academias_id !== filters.academias_id) {
      continue;
    }

    if (item.atividades_id !== filters.atividades_id) {
      continue;
    }

    if (item.dataAtividade <= now) {
      continue;
    }

    const dataLiberacao =
      resolveMapaDiarioFuturoDataLiberacao(item) ?? item.dataLiberacao;

    if (dataLiberacao == null || dataLiberacao <= now) {
      continue;
    }

    if (next == null || dataLiberacao < next) {
      next = dataLiberacao;
    }
  }

  return next;
}
