import type {
  MapaDiarioFuturoAtividadeInfo,
  MapaDiarioFuturoItem,
} from '@/types/mapa-diario-futuro';
import {
  normalizeBoolean,
  normalizeRecordId,
  readString,
  readTimestamp,
} from '@/utils/normalize-api-fields';
import {
  readAtividadeUnidadeIdFromMapRecord,
  readAtividadeUnidadeNomeFromMapRecord,
} from '@/utils/normalize-atividade-unidade';

function readNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
}

function normalizeAtividadeInfo(raw: unknown): MapaDiarioFuturoAtividadeInfo | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  return {
    atividade: readString(record, ['atividade']),
    observacao: readString(record, ['observacao']),
    capacidade: readNumber(record, ['capacidade']),
    controlePresenca: normalizeBoolean(record.controlePresenca),
    horasAntes: readNumber(record, ['horasAntes']),
    minutosCancelamento: readNumber(record, ['minutosCancelamento']),
    tolerancia: readNumber(record, ['tolerancia']),
  };
}

export function normalizeMapaDiarioFuturoFromApi(raw: unknown): MapaDiarioFuturoItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeRecordId(record.id);
  const academiasId = normalizeRecordId(record.academias_id);
  const atividadesId = normalizeRecordId(record.atividades_id);
  const dataAtividade = readTimestamp(record, ['dataAtividade', 'data_atividade']);

  if (id == null || academiasId == null || atividadesId == null || dataAtividade == null) {
    return null;
  }

  const nestedAtividade = record._atividades ?? record.atividades;

  return {
    id,
    academias_id: academiasId,
    atividades_id: atividadesId,
    atividade: readString(record, ['atividade']),
    dataAtividade,
    /** Liberação para reserva; usado no countdown. */
    dataLiberacao: readTimestamp(record, ['dataLiberacao', 'data_liberacao']),
    limiteCancelamento: readTimestamp(record, ['limiteCancelamento', 'limite_cancelamento']),
    limiteReserva: readTimestamp(record, ['limiteReserva', 'limite_reserva']),
    capacidade: readNumber(record, ['capacidade']),
    ocupacao: readNumber(record, ['ocupacao']),
    totalPresentes: readNumber(record, ['totalPresentes']),
    contagemFeita: normalizeBoolean(record.contagemFeita),
    tipoProgramacao: readString(record, ['tipoProgramacao']),
    hora: readNumber(record, ['hora']),
    minutos: readNumber(record, ['minutos']),
    semana: null,
    reservasdamha_id: 0,
    conteudo: readString(record, ['conteudo']).trim() || null,
    atividadeunidade_id: readAtividadeUnidadeIdFromMapRecord(record),
    atividadeUnidadeNome: readAtividadeUnidadeNomeFromMapRecord(record),
    reservaMensalPorSemana: null,
    atividadeInfo: normalizeAtividadeInfo(nestedAtividade),
  };
}

export function normalizeMapaDiarioFuturoListFromApi(raw: unknown): MapaDiarioFuturoItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => normalizeMapaDiarioFuturoFromApi(item))
    .filter((item): item is MapaDiarioFuturoItem => item !== null);
}
