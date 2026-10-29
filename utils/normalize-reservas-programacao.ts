import type { ReservaProgramacao, ReservaUsuario } from '@/types/reserva-usuario';
import {
  normalizeRecordId,
  readAcademiaId,
  readCanceladoFlag,
  readString,
  readTimestamp,
  unwrapApiList,
} from '@/utils/normalize-api-fields';
import { readAtividadeUnidadeIdFromMapRecord } from '@/utils/normalize-atividade-unidade';

function readInteger(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const parsed = normalizeRecordId(record[key]);

    if (parsed != null) {
      return parsed;
    }
  }

  return 0;
}

function normalizeProgramacaoReserva(
  raw: unknown,
  programacao: ReservaProgramacao,
): ReservaUsuario | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const id = normalizeRecordId(record.id);
  const atividadesId = normalizeRecordId(record.atividades_id) ?? 0;
  const usersId = readInteger(record, ['users_id']);
  const responsavelId = readInteger(record, ['responsavel_id']);

  if (id == null) {
    return null;
  }

  const dataAtividade = readTimestamp(record, ['dataAtividade', 'data_atividade']) ?? 0;
  const diaSemana = readInteger(record, ['diaSemana', 'dia_semana']);
  const hora = readInteger(record, ['hora']);
  const minutos = readInteger(record, ['minutos']);

  return {
    id,
    dataAtividade,
    quadra: 0,
    academias_id: readAcademiaId(record) ?? 0,
    atividades_id: atividadesId,
    semana: null,
    mapadiariodamha_id: 0,
    reservasdamha_id: 0,
    mapadiario_id: readInteger(record, ['mapadiario_id']),
    mapasemanal_id: readInteger(record, ['mapasemanal_id']),
    programacao,
    diaSemana: diaSemana > 0 ? diaSemana : null,
    hora: programacao === 'semanal' ? hora : null,
    minutos: programacao === 'semanal' ? minutos : null,
    atividadeunidade_id: readAtividadeUnidadeIdFromMapRecord(record),
    unidadeNome: null,
    atividade: null,
    cancelado: readCanceladoFlag(record),
    users_id: usersId > 0 ? usersId : responsavelId,
    nome: readString(record, ['nome']).trim() || null,
    foto: null,
    responsavel_id: responsavelId > 0 ? responsavelId : usersId,
    limiteCancelamento: readTimestamp(record, ['limiteCancelamento', 'limite_cancelamento']),
    jogoDuplas: false,
    adversario_id: 0,
    parceiro1_id: 0,
    parceiro2_id: 0,
    created_at: readTimestamp(record, ['createdAt', 'created_at']) ?? 0,
    cancelamentoAutomatico: null,
    numeroCancelamento: Math.max(0, readInteger(record, ['numeroCancelamento'])),
    responsavel: null,
    adversario: null,
  };
}

export function normalizeReservasDiariasListFromApi(raw: unknown): ReservaUsuario[] {
  return unwrapApiList(raw)
    .map((item) => normalizeProgramacaoReserva(item, 'diaria'))
    .filter((item): item is ReservaUsuario => item !== null);
}

export function normalizeReservasSemanaisListFromApi(raw: unknown): ReservaUsuario[] {
  return unwrapApiList(raw)
    .map((item) => normalizeProgramacaoReserva(item, 'semanal'))
    .filter((item): item is ReservaUsuario => item !== null);
}

export function reservaPertenceAoUsuario(
  reserva: Pick<ReservaUsuario, 'users_id' | 'responsavel_id'>,
  userId: number,
): boolean {
  if (userId <= 0) {
    return false;
  }

  return reserva.users_id === userId || reserva.responsavel_id === userId;
}
