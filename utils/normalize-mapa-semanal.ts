import type { MapaSemanalItem } from '@/types/mapa-semanal';
import {
  normalizeRecordId,
  readAcademiaId,
  readString,
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

export function normalizeMapaSemanalFromApi(raw: unknown): MapaSemanalItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeRecordId(record.id);
  const academiasId = readAcademiaId(record);
  const atividadesId = normalizeRecordId(record.atividades_id);
  const diaSemana = readInteger(record, ['diaSemana', 'dia_semana']);

  if (id == null || academiasId == null || atividadesId == null || diaSemana <= 0) {
    return null;
  }

  const reservassemanaisId = readInteger(record, ['reservassemanais_id', 'reservasSemanais_id']);

  return {
    id,
    academias_id: academiasId,
    atividades_id: atividadesId,
    capacidade: readInteger(record, ['capacidade']),
    atividadeunidade_id: readAtividadeUnidadeIdFromMapRecord(record),
    atividadeUnidadeNome: readAtividadeUnidadeNomeFromMapRecord(record),
    tipoProgramacao: readString(record, ['tipoProgramacao']) || 'semanal',
    diaSemana,
    hora: readInteger(record, ['hora']),
    minutos: readInteger(record, ['minutos']),
    reservassemanais_id: reservassemanaisId,
    disponivel: reservassemanaisId <= 0,
  };
}

export function normalizeMapaSemanalListFromApi(raw: unknown): MapaSemanalItem[] {
  return unwrapApiList(raw)
    .map((item) => normalizeMapaSemanalFromApi(item))
    .filter((item): item is MapaSemanalItem => item !== null);
}
