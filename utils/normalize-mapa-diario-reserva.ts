import type { MapaDiarioFuturoItem } from '@/types/mapa-diario-futuro';
import {
  normalizeRecordId,
  readAcademiaId,
  readString,
  readTimestamp,
  unwrapApiList,
} from '@/utils/normalize-api-fields';
import {
  readAtividadeUnidadeIdFromMapRecord,
  readAtividadeUnidadeNomeFromMapRecord,
} from '@/utils/normalize-atividade-unidade';

function readInteger(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const parsed = normalizeRecordId(record[key]);

    if (parsed != null) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Linha de MapaDiario usada na reserva diária.
 * Ocupação vem de `reservasdiarias_id`: um vínculo preenche a vaga da linha.
 */
export function normalizeMapaDiarioReservaFromApi(raw: unknown): MapaDiarioFuturoItem | null {
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

  const capacidade = readInteger(record, ['capacidade']);
  const reservasdiariasId = readInteger(record, ['reservasdiarias_id', 'reservasDiarias_id']);
  const ocupado = reservasdiariasId > 0;
  const quando = new Date(dataAtividade);
  const dataLiberacao = readTimestamp(record, ['dataLiberacao', 'data_liberacao']);

  return {
    id,
    academias_id: academiasId,
    atividades_id: atividadesId,
    atividade: readString(record, ['atividade']),
    dataAtividade,
    dataLiberacao: dataLiberacao ?? 1,
    limiteCancelamento: readTimestamp(record, ['limiteCancelamento', 'limite_cancelamento']),
    limiteReserva: null,
    capacidade,
    ocupacao: ocupado ? Math.max(capacidade, 1) : 0,
    totalPresentes: 0,
    contagemFeita: false,
    tipoProgramacao: 'diaria',
    hora: quando.getHours(),
    minutos: quando.getMinutes(),
    semana: null,
    reservasdamha_id: 0,
    conteudo: null,
    atividadeunidade_id: readAtividadeUnidadeIdFromMapRecord(record),
    atividadeUnidadeNome: readAtividadeUnidadeNomeFromMapRecord(record),
    reservaMensalPorSemana: null,
    atividadeInfo: null,
  };
}

export function normalizeMapaDiarioReservaListFromApi(raw: unknown): MapaDiarioFuturoItem[] {
  return unwrapApiList(raw)
    .map((item) => normalizeMapaDiarioReservaFromApi(item))
    .filter((item): item is MapaDiarioFuturoItem => item !== null);
}
