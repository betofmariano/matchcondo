import type { MapaSemanalItem } from '@/types/mapa-semanal';
import { formatHoraMinutos } from '@/utils/atividade-programacao';

const WEEKDAY_SHORT_LABELS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export type MapaSemanalGridColumn = {
  key: string;
  diaSemana: number;
  weekdayLabel: string;
};

export type MapaSemanalGridCell = {
  item: MapaSemanalItem;
  available: boolean;
  weekdayLabel: string;
};

export type MapaSemanalGridRow = {
  key: string;
  hora: number;
  minutos: number;
  timeLabel: string;
  cells: Record<string, MapaSemanalGridCell | null>;
};

export type MapaSemanalGridData = {
  columns: MapaSemanalGridColumn[];
  rows: MapaSemanalGridRow[];
};

export function formatDiaSemanaCurto(diaSemana: number): string {
  return WEEKDAY_SHORT_LABELS[diaSemana] ?? '';
}

function slotDisponivel(item: MapaSemanalItem): boolean {
  return item.disponivel && item.capacidade > 0;
}

export function buildMapaSemanalGrid(horarios: MapaSemanalItem[]): MapaSemanalGridData {
  const columnMap = new Map<number, MapaSemanalGridColumn>();
  const rowMap = new Map<string, MapaSemanalGridRow>();

  for (const item of horarios) {
    if (item.diaSemana < 1 || item.diaSemana > 7) {
      continue;
    }

    const timeKey = `${item.hora}:${item.minutos}`;

    if (!columnMap.has(item.diaSemana)) {
      columnMap.set(item.diaSemana, {
        key: String(item.diaSemana),
        diaSemana: item.diaSemana,
        weekdayLabel: formatDiaSemanaCurto(item.diaSemana),
      });
    }

    let row = rowMap.get(timeKey);

    if (!row) {
      row = {
        key: timeKey,
        hora: item.hora,
        minutos: item.minutos,
        timeLabel: formatHoraMinutos(item.hora, item.minutos),
        cells: {},
      };
      rowMap.set(timeKey, row);
    }

    row.cells[String(item.diaSemana)] = {
      item,
      available: slotDisponivel(item),
      weekdayLabel: formatDiaSemanaCurto(item.diaSemana),
    };
  }

  const columns = [...columnMap.values()].sort((a, b) => a.diaSemana - b.diaSemana);
  const rows = [...rowMap.values()].sort((a, b) => {
    if (a.hora !== b.hora) {
      return a.hora - b.hora;
    }

    return a.minutos - b.minutos;
  });

  return { columns, rows };
}
