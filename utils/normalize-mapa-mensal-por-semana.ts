import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import {
  normalizeRecordId,
  readAcademiaId,
  readCanceladoFlag,
  readString,
  readTimestamp,
  unwrapApiList,
} from '@/utils/normalize-api-fields';
import { readMapaMensalPorSemanaReservaResumoFromMapRecord } from '@/utils/mapa-mensal-por-semana-reserva';
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

function readHorarioFromTimestamp(timestamp: number): { hora: number; minutos: number } {
  const date = new Date(timestamp);

  return {
    hora: date.getHours(),
    minutos: date.getMinutes(),
  };
}

export function normalizeMapaMensalPorSemanaFromApi(raw: unknown): MapaDiarioFuturoItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeRecordId(record.id);
  const academiasId = readAcademiaId(record);
  const atividadesId = normalizeRecordId(record.atividades_id);
  const dataAtividade = readTimestamp(record, ['dataAtividade', 'data_atividade']);

  if (id == null || academiasId == null || atividadesId == null || dataAtividade == null) {
    return null;
  }

  const capacidade = readNumber(record, ['capacidade']);
  let reservasMensalPorSemanaId = readNumber(record, [
    'reservasmensalporsemana_id',
    'reservasMensalPorSemana_id',
    'reservasdamha_id',
    'reservasDamha_id',
  ]);
  let ocupacao = readNumber(record, ['ocupacao']);
  const horario = readHorarioFromTimestamp(dataAtividade);
  const semana = readNumber(record, ['semana']);
  const nestedReservaKeys = [
    '_reservasmensalporsemana',
    'reservasmensalporsemana',
    '_reservasMensalPorSemana',
    'reservasMensalPorSemana',
    '_reservasdamha',
    'reservasdamha',
    '_reservasDamha',
    'reservasDamha',
  ] as const;
  let nestedReservaCancelada = false;
  for (const key of nestedReservaKeys) {
    const nested = record[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      if (readCanceladoFlag(nested as Record<string, unknown>)) {
        nestedReservaCancelada = true;
        break;
      }
    }
  }
  // Mapa stale após soft-delete: reserva cancelada ainda apontada na célula.
  if (nestedReservaCancelada || (ocupacao <= 0 && reservasMensalPorSemanaId > 0)) {
    ocupacao = 0;
    reservasMensalPorSemanaId = 0;
  }
  const reservaMensalPorSemanaFromApi = nestedReservaCancelada
    ? null
    : readMapaMensalPorSemanaReservaResumoFromMapRecord(record);

  return {
    id,
    academias_id: academiasId,
    atividades_id: atividadesId,
    atividade: '',
    dataAtividade,
    /** Liberação para reserva neste slot mensal; usado no countdown. */
    dataLiberacao: readTimestamp(record, ['dataLiberacao', 'data_liberacao']),
    limiteCancelamento: readTimestamp(record, ['limiteCancelamento', 'limite_cancelamento']),
    limiteReserva: null,
    capacidade,
    ocupacao,
    totalPresentes: 0,
    contagemFeita: false,
    tipoProgramacao: '',
    hora: horario.hora,
    minutos: horario.minutos,
    semana: semana > 0 ? semana : null,
    reservasdamha_id: reservasMensalPorSemanaId,
    conteudo: readString(record, ['conteudo']).trim() || null,
    atividadeunidade_id: readAtividadeUnidadeIdFromMapRecord(record),
    atividadeUnidadeNome: readAtividadeUnidadeNomeFromMapRecord(record),
    reservaMensalPorSemana: reservaMensalPorSemanaFromApi,
    atividadeInfo: null,
  };
}

export function normalizeMapaMensalPorSemanaListFromApi(raw: unknown): MapaDiarioFuturoItem[] {
  return unwrapApiList(raw)
    .map((item) => normalizeMapaMensalPorSemanaFromApi(item))
    .filter((item): item is MapaDiarioFuturoItem => item !== null);
}
