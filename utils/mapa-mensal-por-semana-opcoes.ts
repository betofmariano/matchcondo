import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import type { MapaDiarioFuturoFilters } from '@/utils/mapa-diario-futuro';
import { getServerDate } from '@/utils/server-time';

export type MapaMensalPorSemanaSemanaOption = {
  semana: number;
  primeiraDataAtividade: number;
  ultimaDataAtividade: number;
  selecionavel: boolean;
};

export function buildMapaMensalPorSemanaSemanaOptions(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  referenceDate: Date = getServerDate(),
): Omit<MapaMensalPorSemanaSemanaOption, 'selecionavel'>[] {
  const now = referenceDate.getTime();
  const grouped = new Map<number, { min: number; max: number }>();

  for (const item of items) {
    if (item.academias_id !== filters.academias_id) {
      continue;
    }

    if (item.atividades_id !== filters.atividades_id) {
      continue;
    }

    if (item.semana == null || item.semana <= 0) {
      continue;
    }

    if (item.dataAtividade <= now) {
      continue;
    }

    const current = grouped.get(item.semana);

    if (!current) {
      grouped.set(item.semana, { min: item.dataAtividade, max: item.dataAtividade });
      continue;
    }

    current.min = Math.min(current.min, item.dataAtividade);
    current.max = Math.max(current.max, item.dataAtividade);
  }

  return [...grouped.entries()]
    .map(([semana, range]) => {
      // Datas do botão = ciclo fixo do mês (não min/max dos horários liberados).
      const periodo = buildMensalPorSemanaCalendarRange(semana, range.min);

      return {
        semana,
        primeiraDataAtividade: periodo?.inicio ?? range.min,
        ultimaDataAtividade: periodo?.fim ?? range.max,
      };
    })
    .sort((a, b) => a.primeiraDataAtividade - b.primeiraDataAtividade);
}

function buildSemanaDateRangesFromMapa(
  mapaItems: MapaDiarioFuturoItem[],
): Map<number, { min: number; max: number }> {
  const ranges = new Map<number, { min: number; max: number }>();

  for (const item of mapaItems) {
    if (item.semana == null || item.semana <= 0) {
      continue;
    }

    const current = ranges.get(item.semana);

    if (!current) {
      ranges.set(item.semana, { min: item.dataAtividade, max: item.dataAtividade });
      continue;
    }

    current.min = Math.min(current.min, item.dataAtividade);
    current.max = Math.max(current.max, item.dataAtividade);
  }

  return ranges;
}

/** Semana MensalPorSemana fixa no mês: dias 1–7, 8–14, 15–21, 22–28 e 29–fim. */
export function resolveMensalPorSemanaFromDataAtividade(dataAtividade: number): number | null {
  if (dataAtividade <= 0) {
    return null;
  }

  const day = new Date(dataAtividade).getDate();

  if (day <= 7) {
    return 1;
  }

  if (day <= 14) {
    return 2;
  }

  if (day <= 21) {
    return 3;
  }

  if (day <= 28) {
    return 4;
  }

  return 5;
}

export function buildMensalPorSemanaCalendarRange(
  semana: number,
  anchorTimestamp: number,
): { inicio: number; fim: number } | null {
  if (semana <= 0 || anchorTimestamp <= 0) {
    return null;
  }

  const anchor = new Date(anchorTimestamp);
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  // Ciclo fixo: 1–7, 8–14, 15–21, 22–28, 29–último dia (30/31; ou 29 em fev bissexto).
  const ranges: [number, number][] = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, Math.min(28, lastDay)],
  ];

  if (lastDay >= 29) {
    ranges.push([29, lastDay]);
  }

  const range = ranges[semana - 1];

  if (!range || range[0] > range[1]) {
    return null;
  }

  return {
    inicio: new Date(year, month, range[0], 0, 0, 0, 0).getTime(),
    fim: new Date(year, month, range[1], 23, 59, 59, 999).getTime(),
  };
}

function resolveReservaMensalPorSemanaDedupeKey(reserva: ReservaUsuario): number {
  if (reserva.reservasdamha_id > 0) {
    return reserva.reservasdamha_id;
  }

  return reserva.id;
}

function resolveAnchorTimestampForSemana(
  semana: number,
  mapaItems: MapaDiarioFuturoItem[],
  referenceDate: Date,
): number {
  for (const item of mapaItems) {
    if (item.semana === semana && item.dataAtividade > 0) {
      return item.dataAtividade;
    }
  }

  return referenceDate.getTime();
}

function inferSemanaFromDataAtividade(
  dataAtividade: number,
  ranges: Map<number, { min: number; max: number }>,
): number | null {
  if (dataAtividade <= 0) {
    return null;
  }

  for (const [semana, range] of ranges) {
    if (dataAtividade >= range.min && dataAtividade <= range.max) {
      return semana;
    }
  }

  return null;
}

export function enrichReservasMensalPorSemanaComSemana(
  reservas: ReservaUsuario[],
  mapaItems: MapaDiarioFuturoItem[],
): ReservaUsuario[] {
  const mapaById = new Map(mapaItems.map((item) => [item.id, item]));
  const mapaByDataAtividade = new Map(
    mapaItems
      .filter((item) => item.semana != null && item.semana > 0)
      .map((item) => [`${item.academias_id}:${item.dataAtividade}`, item]),
  );
  const semanaRanges = buildSemanaDateRangesFromMapa(mapaItems);

  return reservas.map((reserva) => {
    let semana = reserva.semana;
    let dataAtividade = reserva.dataAtividade;
    let academias_id = reserva.academias_id;
    let atividades_id = reserva.atividades_id;

    const mapaItem =
      (reserva.mapadiariodamha_id > 0 ? mapaById.get(reserva.mapadiariodamha_id) : undefined) ??
      (dataAtividade > 0
        ? mapaByDataAtividade.get(`${academias_id}:${dataAtividade}`) ??
          (academias_id <= 0
            ? mapaItems.find((item) => item.dataAtividade === dataAtividade)
            : undefined)
        : undefined);

    if (mapaItem) {
      if (semana == null || semana <= 0) {
        semana = mapaItem.semana;
      }

      if (dataAtividade <= 0) {
        dataAtividade = mapaItem.dataAtividade;
      }

      if (academias_id <= 0) {
        academias_id = mapaItem.academias_id;
      }

      if (atividades_id <= 0) {
        atividades_id = mapaItem.atividades_id;
      }
    }

    if ((semana == null || semana <= 0) && dataAtividade > 0) {
      semana = inferSemanaFromDataAtividade(dataAtividade, semanaRanges);
    }

    if ((semana == null || semana <= 0) && dataAtividade > 0) {
      semana = resolveMensalPorSemanaFromDataAtividade(dataAtividade);
    }

    if (semana == null || semana <= 0) {
      return reserva;
    }

    return {
      ...reserva,
      semana,
      dataAtividade,
      academias_id,
      atividades_id,
    };
  });
}

function isSameCalendarMonth(left: number, right: number): boolean {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth()
  );
}

export function countReservasMensalPorSemanaValidasNoPeriodo(
  reservas: ReservaUsuario[],
  academiasId: number,
  periodo: { inicio: number; fim: number },
  /** Limite semanal é por atividade; sem id, conta todas (legado). */
  atividadesId?: number | null,
  semana?: number | null,
): number {
  const seen = new Set<number>();
  let count = 0;

  for (const reserva of reservas) {
    if (reserva.cancelado) {
      continue;
    }

    if (
      reserva.academias_id > 0 &&
      academiasId > 0 &&
      reserva.academias_id !== academiasId
    ) {
      continue;
    }

    // Limite é por atividade. Reserva sem atividades_id ainda conta, para não liberar a semana.
    if (
      atividadesId != null &&
      atividadesId > 0 &&
      reserva.atividades_id > 0 &&
      reserva.atividades_id !== atividadesId
    ) {
      continue;
    }

    const noPeriodo =
      reserva.dataAtividade > 0 &&
      reserva.dataAtividade >= periodo.inicio &&
      reserva.dataAtividade <= periodo.fim;
    const mesmaSemanaDoMes =
      semana != null &&
      semana > 0 &&
      reserva.semana === semana &&
      reserva.dataAtividade > 0 &&
      isSameCalendarMonth(reserva.dataAtividade, periodo.inicio);

    if (!noPeriodo && !mesmaSemanaDoMes) {
      continue;
    }

    const dedupeKey = resolveReservaMensalPorSemanaDedupeKey(reserva);

    if (dedupeKey <= 0 || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    count += 1;
  }

  return count;
}

export function countReservasMensalPorSemanaAtivasPorSemana(
  reservas: ReservaUsuario[],
  academiasId: number,
  semana: number,
  anchorTimestamp: number,
  atividadesId?: number | null,
): number {
  const periodo = buildMensalPorSemanaCalendarRange(semana, anchorTimestamp);

  if (!periodo) {
    return 0;
  }

  return countReservasMensalPorSemanaValidasNoPeriodo(
    reservas,
    academiasId,
    periodo,
    atividadesId,
    semana,
  );
}

export function enrichMapaMensalPorSemanaSemanaOptions(
  options: Omit<MapaMensalPorSemanaSemanaOption, 'selecionavel'>[],
  reservas: ReservaUsuario[],
  academiasId: number,
  limiteReservasPorSemana: number | null,
  atividadesId?: number | null,
): MapaMensalPorSemanaSemanaOption[] {
  return options.map((option) => {
    const periodo = buildMensalPorSemanaCalendarRange(option.semana, option.primeiraDataAtividade);
    const reservasNaSemana =
      periodo != null
        ? countReservasMensalPorSemanaValidasNoPeriodo(
            reservas,
            academiasId,
            periodo,
            atividadesId,
            option.semana,
          )
        : 0;
    return {
      ...option,
      selecionavel:
        limiteReservasPorSemana == null
          ? true
          : reservasNaSemana >= limiteReservasPorSemana
            ? false
            : true,
    };
  });
}

export function buildMapaMensalPorSemanaSemanaOptionsWithLimit(
  items: MapaDiarioFuturoItem[],
  filters: MapaDiarioFuturoFilters,
  reservas: ReservaUsuario[],
  limiteReservasPorSemana: number | null,
  referenceDate: Date = getServerDate(),
): MapaMensalPorSemanaSemanaOption[] {
  const options = buildMapaMensalPorSemanaSemanaOptions(items, filters, referenceDate);
  const reservasComSemana = enrichReservasMensalPorSemanaComSemana(reservas, items);

  return enrichMapaMensalPorSemanaSemanaOptions(
    options,
    reservasComSemana,
    filters.academias_id,
    limiteReservasPorSemana,
    filters.atividades_id,
  );
}

function formatMensalPorSemanaDateOnly(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}`;
}

export function formatMapaMensalPorSemanaSemanaLabel(option: MapaMensalPorSemanaSemanaOption): string {
  const periodo = buildMensalPorSemanaCalendarRange(
    option.semana,
    option.primeiraDataAtividade || option.ultimaDataAtividade,
  );
  const inicio = formatMensalPorSemanaDateOnly(periodo?.inicio ?? option.primeiraDataAtividade);
  const fim = formatMensalPorSemanaDateOnly(periodo?.fim ?? option.ultimaDataAtividade);

  return `Semana ${option.semana} : ${inicio} a ${fim}`;
}

export function filterMapaDiarioFuturoBySemana(
  items: MapaDiarioFuturoItem[],
  semana: number,
): MapaDiarioFuturoItem[] {
  return items.filter((item) => item.semana === semana);
}

export function isSemanaMensalPorSemanaLimiteAtingido(
  semana: number,
  reservas: ReservaUsuario[],
  mapaItems: MapaDiarioFuturoItem[],
  academiasId: number,
  limiteReservasPorSemana: number | null,
  referenceDate: Date = getServerDate(),
  atividadesId?: number | null,
): boolean {
  if (limiteReservasPorSemana == null || limiteReservasPorSemana <= 0) {
    return false;
  }

  const reservasComSemana = enrichReservasMensalPorSemanaComSemana(reservas, mapaItems);
  const anchorTimestamp = resolveAnchorTimestampForSemana(semana, mapaItems, referenceDate);
  const periodo = buildMensalPorSemanaCalendarRange(semana, anchorTimestamp);

  if (!periodo) {
    return false;
  }

  const reservasNaSemana = countReservasMensalPorSemanaValidasNoPeriodo(
    reservasComSemana,
    academiasId,
    periodo,
    atividadesId,
    semana,
  );

  return reservasNaSemana >= limiteReservasPorSemana;
}
