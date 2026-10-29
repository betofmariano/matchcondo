import type { ReservaUsuario } from '@/types/reserva-usuario';
import type { JogoJogador } from '@/types/jogo';
import {
  normalizeBoolean,
  normalizeRecordId,
  readAcademiaId,
  readCanceladoFlag,
  readPersonName,
  readPersonPhoto,
  readString,
  readTimestamp,
  readUserId,
} from '@/utils/normalize-api-fields';
import { extractPhotoUrlFromApiPayload, normalizePhotoUrl } from '@/utils/user-photo';
import {
  readAtividadeUnidadeIdFromMapRecord,
  readAtividadeUnidadeNomeFromMapRecord,
} from '@/utils/normalize-atividade-unidade';

function readNestedRecord(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | null {
  for (const key of keys) {
    const value = record[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

function readNumber(record: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

function normalizeJogador(raw: unknown): JogoJogador | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const nome = readPersonName(record);

  if (!nome) {
    return null;
  }

  return {
    nome,
    email: readString(record, ['email']),
    telefone: readString(record, ['telefone']) || undefined,
    foto: readPersonPhoto(record),
  };
}

function readNestedUserId(
  record: Record<string, unknown> | null,
): number | null {
  if (!record) {
    return null;
  }

  const nestedUser = readNestedRecord(record, ['_users', 'users', 'user']);

  return (
    normalizeRecordId(record.users_id) ??
    normalizeRecordId(record.user_id) ??
    normalizeRecordId(record.userXano) ??
    normalizeRecordId(record.usuario_id) ??
    (nestedUser ? readUserId(nestedUser) : null) ??
    readUserIdFromUsersLocal(record)
  );
}

function readUserIdFromUsersLocal(record: Record<string, unknown>): number | null {
  const usersLocal = record.usersLocal ?? record.userslocal;

  if (!usersLocal || typeof usersLocal !== 'object') {
    return null;
  }

  return readUserId(usersLocal as Record<string, unknown>);
}

function normalizeJogadorFromRaw(raw: unknown): JogoJogador | null {
  if (typeof raw === 'string') {
    const nome = raw.trim();

    if (!nome) {
      return null;
    }

    return {
      nome,
      email: '',
      foto: '',
    };
  }

  return normalizeJogador(raw);
}

function resolveReservaResponsavel(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  jogoRecord: Record<string, unknown> | null,
): JogoJogador | null {
  const nestedUser =
    readNestedRecord(record, ['_users', 'users', 'user']) ??
    readNestedRecord(merged, ['_users', 'users', 'user']);

  return (
    normalizeJogadorFromRaw(jogoRecord?.responsavel ?? merged.responsavel) ??
    normalizeJogadorFromRaw(record.responsavel) ??
    normalizeJogador(nestedUser) ??
    null
  );
}

function resolveReservaUsersId(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  jogoRecord: Record<string, unknown> | null,
  mapaRecord: Record<string, unknown> | null,
): number {
  return (
    normalizeRecordId(record.users_id) ??
    normalizeRecordId(merged.users_id) ??
    readNestedUserId(record) ??
    readNestedUserId(merged) ??
    readNestedUserId(jogoRecord) ??
    readNestedUserId(mapaRecord) ??
    0
  );
}

function resolveReservaResponsavelId(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  jogoRecord: Record<string, unknown> | null,
): number {
  const responsavelRecord =
    readNestedRecord(merged, ['responsavel']) ??
    (jogoRecord ? readNestedRecord(jogoRecord, ['responsavel']) : null);

  return (
    normalizeRecordId(record.responsavel_id) ??
    normalizeRecordId(merged.responsavel_id) ??
    (responsavelRecord ? readUserId(responsavelRecord) : null) ??
    0
  );
}

function looksLikeReservaRecord(record: Record<string, unknown>): boolean {
  return (
    normalizeRecordId(record.id) != null ||
    normalizeRecordId(record.reservasmensalporsemana_id) != null ||
    normalizeRecordId(record.reservasMensalPorSemana_id) != null ||
    normalizeRecordId(record.reservasdamha_id) != null ||
    normalizeRecordId(record.reservasDamha_id) != null ||
    normalizeRecordId(record.mapamensalporsemana_id) != null ||
    normalizeRecordId(record.mapadiariodamha_id) != null ||
    normalizeRecordId(record.jogos_id) != null ||
    normalizeRecordId(record.jogo_id) != null ||
    readTimestamp(record, ['dataAtividade', 'data_atividade']) != null
  );
}

export function unwrapReservasUsuarioResponse(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== 'object') {
    return [];
  }

  const record = raw as Record<string, unknown>;

  if (looksLikeReservaRecord(record)) {
    return [record];
  }

  for (const key of [
    'jogos',
    'reservas',
    'items',
    'data',
    'reservasUsuario',
    'reservasMensalPorSemana1',
  ] as const) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object' && looksLikeReservaRecord(value as Record<string, unknown>)) {
      return [value];
    }
  }

  const reservasMensais: unknown[] = [];

  for (const [key, value] of Object.entries(record)) {
    if (
      !(/^reservasdamha/i.test(key) || /^reservasmensalporsemana/i.test(key)) ||
      !Array.isArray(value)
    ) {
      continue;
    }

    reservasMensais.push(...value);
  }

  if (reservasMensais.length > 0) {
    return reservasMensais;
  }

  return [];
}

function readAtividadeNomeFromRecord(record: Record<string, unknown> | null): string {
  if (!record) {
    return '';
  }

  return readString(record, [
    'atividade',
    'atividadeNome',
    'nomeAtividade',
    'nome_atividade',
    'nome',
  ]).trim();
}

/** Aceita string ou objeto aninhado (`atividade: { atividade: "..." }`). */
function readAtividadeNomeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return readAtividadeNomeFromRecord(value as Record<string, unknown>);
  }

  return '';
}

function readAtividadeNomeFromFields(
  source: Record<string, unknown> | null,
  keys: string[],
): string {
  if (!source) {
    return '';
  }

  for (const key of keys) {
    const nome = readAtividadeNomeValue(source[key]);

    if (nome) {
      return nome;
    }
  }

  return '';
}

function resolveAtividadeFromApi(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  mapaRecord: Record<string, unknown> | null,
  jogoRecord: Record<string, unknown> | null,
): string | null {
  const nestedAtividade =
    readNestedRecord(merged, ['_atividades', 'atividades', 'atividade']) ??
    readNestedRecord(record, ['_atividades', 'atividades', 'atividade']) ??
    (mapaRecord
      ? readNestedRecord(mapaRecord, ['_atividades', 'atividades', 'atividade'])
      : null) ??
    (jogoRecord
      ? readNestedRecord(jogoRecord, ['_atividades', 'atividades', 'atividade'])
      : null);

  const fieldKeys = ['atividade', 'atividadeNome', 'nomeAtividade', 'nome_atividade'];
  const candidates = [
    readAtividadeNomeFromFields(merged, fieldKeys),
    readAtividadeNomeFromFields(record, fieldKeys),
    readAtividadeNomeFromFields(mapaRecord, fieldKeys),
    readAtividadeNomeFromFields(jogoRecord, fieldKeys),
    readAtividadeNomeFromRecord(nestedAtividade),
  ];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function resolveAtividadesIdFromApi(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  mapaRecord: Record<string, unknown> | null,
  jogoRecord: Record<string, unknown> | null,
): number {
  const nestedAtividade =
    readNestedRecord(merged, ['_atividades', 'atividades']) ??
    readNestedRecord(record, ['_atividades', 'atividades']) ??
    (mapaRecord ? readNestedRecord(mapaRecord, ['_atividades', 'atividades']) : null) ??
    (jogoRecord ? readNestedRecord(jogoRecord, ['_atividades', 'atividades']) : null);

  return (
    normalizeRecordId(merged.atividades_id) ??
    normalizeRecordId(record.atividades_id) ??
    (mapaRecord ? normalizeRecordId(mapaRecord.atividades_id) : null) ??
    (jogoRecord ? normalizeRecordId(jogoRecord.atividades_id) : null) ??
    (nestedAtividade ? normalizeRecordId(nestedAtividade.id) : null) ??
    0
  );
}

function resolveSemanaFromApi(
  record: Record<string, unknown>,
  merged: Record<string, unknown>,
  mapaRecord: Record<string, unknown> | null,
): number | null {
  const semana =
    readNumber(record, ['semana']) ||
    readNumber(merged, ['semana']) ||
    (mapaRecord ? readNumber(mapaRecord, ['semana']) : 0);

  return semana > 0 ? semana : null;
}

export function normalizeReservaUsuarioFromApi(raw: unknown): ReservaUsuario | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const jogoRecord = readNestedRecord(record, ['jogo', 'jogos', '_jogos', 'jogoCriado']);
  const mapaRecord = readNestedRecord(record, [
    'mapadiario',
    'mapaDiario',
    '_mapadiario',
    '_mapadiarioFuturo',
    'mapadiarioFuturo',
    'mapamensalporsemana',
    'mapaMensalPorSemana',
    '_mapamensalporsemana',
    '_mapaMensalPorSemana',
    'mapadiariodamha',
    'mapaDiarioDamha',
    '_mapadiariodamha',
    '_mapaDiarioDamha',
  ]);

  const merged: Record<string, unknown> = {
    ...(mapaRecord ?? {}),
    ...(jogoRecord ?? {}),
    ...record,
  };

  const reservasMensalPorSemanaId =
    normalizeRecordId(record.reservasmensalporsemana_id) ??
    normalizeRecordId(record.reservasMensalPorSemana_id) ??
    normalizeRecordId(record.reservasdamha_id) ??
    normalizeRecordId(record.reservasDamha_id) ??
    0;

  const mapaMensalPorSemanaId =
    normalizeRecordId(record.mapamensalporsemana_id) ??
    normalizeRecordId(record.mapaMensalPorSemana_id) ??
    normalizeRecordId(record.mapadiariodamha_id) ??
    normalizeRecordId(record.mapadiario_damha_id) ??
    normalizeRecordId(merged.mapamensalporsemana_id) ??
    normalizeRecordId(merged.mapadiariodamha_id) ??
    (mapaRecord ? normalizeRecordId(mapaRecord.id) : null) ??
    0;

  const isMensalPorSemanaReserva = reservasMensalPorSemanaId > 0 || mapaMensalPorSemanaId > 0;

  const id = isMensalPorSemanaReserva && reservasMensalPorSemanaId > 0
    ? reservasMensalPorSemanaId
    : (
      normalizeRecordId(record.id) ??
      normalizeRecordId(record.reservas_id) ??
      (reservasMensalPorSemanaId > 0 ? reservasMensalPorSemanaId : null) ??
      normalizeRecordId(record.jogos_id) ??
      normalizeRecordId(record.jogo_id) ??
      normalizeRecordId(jogoRecord?.id)
    );

  if (id == null) {
    return null;
  }

  const resolvedReservasMensalPorSemanaId = reservasMensalPorSemanaId > 0 ? reservasMensalPorSemanaId : isMensalPorSemanaReserva ? id : 0;

  const dataAtividade =
    readTimestamp(merged, ['dataAtividade', 'data_atividade']) ??
    (mapaRecord ? readTimestamp(mapaRecord, ['dataAtividade']) : null) ??
    (jogoRecord ? readTimestamp(jogoRecord, ['dataAtividade']) : null);

  if (dataAtividade == null && mapaMensalPorSemanaId <= 0) {
    return null;
  }

  const atividade = resolveAtividadeFromApi(record, merged, mapaRecord, jogoRecord);
  const atividadesId = resolveAtividadesIdFromApi(record, merged, mapaRecord, jogoRecord);
  const semana = resolveSemanaFromApi(record, merged, mapaRecord);

  const usersId = resolveReservaUsersId(record, merged, jogoRecord, mapaRecord);
  const responsavel = resolveReservaResponsavel(record, merged, jogoRecord);
  const responsavelId = resolveReservaResponsavelId(record, merged, jogoRecord);
  const ownerId = usersId > 0 ? usersId : responsavelId;
  const nestedUsers =
    readNestedRecord(record, ['_users', 'users', 'user']) ??
    readNestedRecord(merged, ['_users', 'users', 'user']);
  // Addon `_users.Foto` (e variantes) em GET /reservasmensalporsemana
  const foto =
    extractPhotoUrlFromApiPayload(record) ||
    extractPhotoUrlFromApiPayload(merged) ||
    normalizePhotoUrl(
      (nestedUsers ? readPersonPhoto(nestedUsers) : '') || responsavel?.foto?.trim() || '',
    ) ||
    null;

  const mapadiarioId = isMensalPorSemanaReserva
    ? 0
    : (
      normalizeRecordId(record.mapadiario_id) ??
      normalizeRecordId(record.mapadiarioId) ??
      normalizeRecordId(merged.mapadiario_id) ??
      (mapaRecord && mapaMensalPorSemanaId <= 0 ? normalizeRecordId(mapaRecord.id) : null) ??
      0
    );

  const atividadeunidadeId =
    readAtividadeUnidadeIdFromMapRecord(record) ??
    readAtividadeUnidadeIdFromMapRecord(merged) ??
    (mapaRecord ? readAtividadeUnidadeIdFromMapRecord(mapaRecord) : null);

  const unidadeNome =
    readAtividadeUnidadeNomeFromMapRecord(record) ??
    readAtividadeUnidadeNomeFromMapRecord(merged) ??
    (mapaRecord ? readAtividadeUnidadeNomeFromMapRecord(mapaRecord) : null);

  return {
    id,
    dataAtividade: dataAtividade ?? 0,
    quadra: readNumber(merged, ['quadra'], mapaRecord ? readNumber(mapaRecord, ['quadra']) : 0),
    academias_id:
      readAcademiaId(merged) ??
      (mapaRecord ? readAcademiaId(mapaRecord) : null) ??
      0,
    atividades_id: atividadesId,
    semana,
    mapadiario_id: mapadiarioId,
    mapasemanal_id: 0,
    programacao: 'mensalPorSemana',
    diaSemana: null,
    hora: null,
    minutos: null,
    mapadiariodamha_id: mapaMensalPorSemanaId,
    reservasdamha_id: resolvedReservasMensalPorSemanaId,
    atividadeunidade_id: atividadeunidadeId,
    unidadeNome,
    atividade,
    // Prioriza o registro da reserva (não o mapa), para soft-delete liberar limite semanal.
    cancelado: readCanceladoFlag(record, merged),
    users_id: ownerId,
    nome:
      readString(record, ['nome']).trim() ||
      readString(merged, ['nome']).trim() ||
      null,
    foto,
    responsavel_id: responsavelId > 0 ? responsavelId : ownerId,
    limiteCancelamento:
      readTimestamp(merged, ['limiteCancelamento', 'limite_cancelamento']) ??
      (mapaRecord ? readTimestamp(mapaRecord, ['limiteCancelamento', 'limite_cancelamento']) : null) ??
      (jogoRecord ? readTimestamp(jogoRecord, ['limiteCancelamento', 'limite_cancelamento']) : null),
    jogoDuplas: normalizeBoolean(merged.jogoDuplas),
    adversario_id: normalizeRecordId(merged.adversario_id) ?? 0,
    parceiro1_id: normalizeRecordId(merged.parceiro1_id) ?? 0,
    parceiro2_id: normalizeRecordId(merged.parceiro2_id) ?? 0,
    created_at:
      readTimestamp(record, ['createdAt', 'created_at']) ??
      readTimestamp(merged, ['createdAt', 'created_at']) ??
      0,
    cancelamentoAutomatico: readTimestamp(merged, ['cancelamentoAutomatico']),
    numeroCancelamento: Math.max(
      0,
      readNumber(record, ['numeroCancelamento', 'numero_cancelamento'], readNumber(merged, ['numeroCancelamento', 'numero_cancelamento'])),
    ),
    responsavel,
    adversario: normalizeJogador(jogoRecord?.adversario ?? merged.adversario),
    parceiro1: normalizeJogador(jogoRecord?.parceiro1 ?? merged.parceiro1),
    parceiro2: normalizeJogador(jogoRecord?.parceiro2 ?? merged.parceiro2),
  };
}

export function normalizeReservasUsuarioListFromApi(raw: unknown): ReservaUsuario[] {
  return unwrapReservasUsuarioResponse(raw)
    .map((item) => normalizeReservaUsuarioFromApi(item))
    .filter((item): item is ReservaUsuario => item !== null);
}

export function enrichReservasUsuarioOwner(
  reservas: ReservaUsuario[],
  ownerUserId: number,
): ReservaUsuario[] {
  if (ownerUserId <= 0) {
    return reservas;
  }

  return reservas.map((reserva) => {
    const usersId = reserva.users_id > 0 ? reserva.users_id : ownerUserId;
    const responsavelId = reserva.responsavel_id > 0 ? reserva.responsavel_id : usersId;

    return {
      ...reserva,
      users_id: usersId,
      responsavel_id: responsavelId,
    };
  });
}
