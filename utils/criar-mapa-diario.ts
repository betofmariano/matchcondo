import type { MapaDiarioItem } from '@/types/mapa-diario';
import { readTimestamp } from '@/utils/normalize-api-fields';

export function startOfLocalDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function toDiaSemanaApi(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function findLatestDataAtividadeTimestamp(items: MapaDiarioItem[]): number | null {
  let latest: number | null = null;

  for (const item of items) {
    if (item.dataAtividade == null || !Number.isFinite(item.dataAtividade)) {
      continue;
    }

    if (latest === null || item.dataAtividade > latest) {
      latest = item.dataAtividade;
    }
  }

  return latest;
}

export function findLatestDataAtividadeTimestampFromApi(raw: unknown): number | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  let latest: number | null = null;

  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const timestamp = readTimestamp(item as Record<string, unknown>, [
      'dataAtividade',
      'data_atividade',
    ]);

    if (timestamp == null) {
      continue;
    }

    if (latest === null || timestamp > latest) {
      latest = timestamp;
    }
  }

  return latest;
}

/** Dia civil local da `dataAtividade`. */
export function localCalendarDateFromTimestamp(ms: number): Date {
  return startOfLocalDay(new Date(ms));
}

/** Próximo dia do calendário, sem somar 24 horas ao timestamp. */
export function nextCalendarDate(date: Date): Date {
  return addDaysToDate(startOfLocalDay(date), 1);
}

export function suggestNextMapaDiarioDate(
  latestDataAtividadeMs: number | null,
  referenceDate = new Date(),
): Date {
  if (latestDataAtividadeMs === null) {
    return startOfLocalDay(referenceDate);
  }

  return nextCalendarDate(localCalendarDateFromTimestamp(latestDataAtividadeMs));
}

export function formatMapaDiarioShortDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

export function formatMapaDiarioFullDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/** Data no formato esperado por GET /mapaDiarioGerar (`YYYY-MM-DD`). */
export function formatMapaDiarioApiDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${year}-${month}-${day}`;
}

const MAPA_DIARIO_API_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isMapaDiarioApiDate(value: string): boolean {
  const match = MAPA_DIARIO_API_DATE_RE.exec(value.trim());

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}