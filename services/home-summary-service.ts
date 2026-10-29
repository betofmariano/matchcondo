import { getAtividadeUnidadesByAtividade } from '@/services/atividade-unidade-service';
import { getAcademias } from '@/services/academias-service';
import { filterActiveFutureReservas } from '@/services/reservas-service';
import { getReservasUsuarioForUser } from '@/services/reserva-horario-flow-service';
import type { Academia } from '@/types/academia';
import type { ListaEsperaSummary, ReservaParticipanteSummary, ReservaSummary } from '@/types/home-summary';
import type { JogoParticipante } from '@/types/jogo';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import type { ListaEsperaRegistro } from '@/types/lista-espera';
import { buildJogoParticipantesView } from '@/utils/jogo-participantes';
import {
  getMinutosLimiteRegistroAdversario,
  isAdversarioPendente,
} from '@/utils/reserva-adversario';
import { normalizePhotoUrl } from '@/utils/user-photo';
import { filterListaEsperaVisivelUsuario } from '@/utils/lista-espera-visivel';
import { buildListaEsperaPosicaoMap } from '@/utils/lista-espera-posicao';
import {
  buildAtividadesByIdMapForReservas,
  resolveReservaAtividadeNome,
} from '@/utils/reserva-atividade';
import type { Atividade } from '@/types/atividade';

const RESERVAS_ERROR_MESSAGE = 'Não foi possível carregar suas reservas.';

export type HomeSummaryFetchResult = {
  reservas: ReservaSummary[];
  listasEspera: ListaEsperaSummary[];
  reservasError: string | null;
  listaEsperaError: string | null;
};

function getAcademiaName(academiasId: number, academiasById: Map<number, Academia>): string {
  if (academiasId <= 0) {
    return '';
  }

  return academiasById.get(academiasId)?.nome?.trim() || `Local #${academiasId}`;
}

function resolveReservaAcademiasId(reserva: Pick<ReservaUsuario, 'academias_id'>, fallbackAcademiasId: number): number {
  return reserva.academias_id > 0 ? reserva.academias_id : fallbackAcademiasId;
}

function getModalidadeLabel(reserva: Pick<ReservaUsuario, 'jogoDuplas'>): string | null {
  if (reserva.jogoDuplas) {
    return 'Duplas';
  }

  return 'Simples';
}

function reservaSortTime(entry: {
  dataAtividade: number;
  programacao?: string | null;
  diaSemana?: number | null;
  hora?: number | null;
  minutos?: number | null;
}): number {
  if (entry.programacao === 'semanal') {
    const dia = entry.diaSemana ?? 7;
    const hora = entry.hora ?? 0;
    const minutos = entry.minutos ?? 0;

    return Number.MAX_SAFE_INTEGER - (8 - dia) * 24 * 60 - (24 * 60 - (hora * 60 + minutos));
  }

  return entry.dataAtividade > 0 ? entry.dataAtividade : Number.MAX_SAFE_INTEGER;
}

function sortReservasByDataHorarioAtividadeUnidade<
  T extends {
    dataAtividade: number;
    atividade?: string | null;
    unidadeNome?: string | null;
    programacao?: string | null;
    diaSemana?: number | null;
    hora?: number | null;
    minutos?: number | null;
  },
>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const timeA = reservaSortTime(a);
    const timeB = reservaSortTime(b);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    const atividadeCompare = (a.atividade ?? '').localeCompare(b.atividade ?? '', 'pt-BR', {
      sensitivity: 'base',
    });

    if (atividadeCompare !== 0) {
      return atividadeCompare;
    }

    return (a.unidadeNome ?? '').localeCompare(b.unidadeNome ?? '', 'pt-BR', {
      sensitivity: 'base',
    });
  });
}

async function buildUnidadesLabelByIdForReservas(
  reservas: ReservaUsuario[],
  authToken: string,
): Promise<Map<number, string>> {
  const atividadesIds = [
    ...new Set(
      reservas
        .filter((reserva) => (reserva.atividadeunidade_id ?? 0) > 0)
        .map((reserva) => reserva.atividades_id)
        .filter((id) => id > 0),
    ),
  ];

  if (atividadesIds.length === 0) {
    return new Map();
  }

  const unidadesLists = await Promise.all(
    atividadesIds.map(async (atividadesId) => {
      try {
        return await getAtividadeUnidadesByAtividade(atividadesId, authToken);
      } catch {
        return [];
      }
    }),
  );

  const unidadesById = new Map<number, string>();

  for (const unidades of unidadesLists) {
    for (const unidade of unidades) {
      unidadesById.set(unidade.id, unidade.unidade);
    }
  }

  return unidadesById;
}

function mapReservaParticipante(
  users_id: number,
  nome: string | null | undefined,
  foto: string | null | undefined,
): ReservaParticipanteSummary | null {
  if (users_id <= 0 || !nome?.trim()) {
    return null;
  }

  return {
    users_id,
    nome: nome.trim(),
    foto: normalizePhotoUrl(foto),
  };
}

function collectConvidados(reserva: ReservaUsuario): ReservaParticipanteSummary[] {
  const view = buildJogoParticipantesView(reserva as unknown as Parameters<typeof buildJogoParticipantesView>[0]);

  if (!reserva.jogoDuplas) {
    const adversario = view.dupla2[0];

    if (!adversario || reserva.adversario_id <= 0) {
      return [];
    }

    return [
      {
        users_id: reserva.adversario_id,
        nome: adversario.nome,
        foto: adversario.foto,
      },
    ];
  }

  const candidatos: Array<{ id: number; participante: JogoParticipante | undefined }> = [
    { id: reserva.adversario_id, participante: view.dupla2[0] },
    { id: reserva.parceiro1_id, participante: view.dupla1[1] },
    { id: reserva.parceiro2_id, participante: view.dupla2[1] },
  ];

  return candidatos
    .filter(
      (item): item is { id: number; participante: JogoParticipante } =>
        item.id > 0 && item.participante !== undefined,
    )
    .map(({ id, participante }) => ({
      users_id: id,
      nome: participante.nome,
      foto: participante.foto,
    }));
}

export function mapReservaUsuarioToReservaSummary(
  reserva: ReservaUsuario,
  academiasById: Map<number, Academia>,
  atividadesById: Map<number, Atividade> = new Map(),
  unidadesById: Map<number, string> = new Map(),
  fallbackAcademiasId = 0,
): ReservaSummary {
  const participantesView = buildJogoParticipantesView(
    reserva as unknown as Parameters<typeof buildJogoParticipantesView>[0],
  );
  const adversario = participantesView.dupla2[0] ?? null;
  const responsavel = participantesView.dupla1[0] ?? null;
  const adversarioPendente = isAdversarioPendente(reserva);
  const convidados = collectConvidados(reserva);
  const unidadeId =
    reserva.atividadeunidade_id != null && reserva.atividadeunidade_id > 0
      ? reserva.atividadeunidade_id
      : null;
  const unidadeNome =
    (unidadeId != null ? unidadesById.get(unidadeId)?.trim() : null) ||
    reserva.unidadeNome?.trim() ||
    null;
  const academiasId = resolveReservaAcademiasId(reserva, fallbackAcademiasId);

  return {
    id: reserva.id,
    reservasdamha_id: reserva.reservasdamha_id,
    mapadiariodamha_id: reserva.mapadiariodamha_id,
    mapadiario_id: reserva.mapadiario_id,
    mapasemanal_id: reserva.mapasemanal_id,
    programacao: reserva.programacao,
    diaSemana: reserva.diaSemana,
    hora: reserva.hora,
    minutos: reserva.minutos,
    dataAtividade: reserva.dataAtividade,
    quadra: reserva.quadra,
    academias_id: academiasId,
    atividades_id: reserva.atividades_id,
    semana: reserva.semana,
    localNome: getAcademiaName(academiasId, academiasById),
    atividade: resolveReservaAtividadeNome(reserva, atividadesById),
    modalidade: resolveReservaAtividadeNome(reserva, atividadesById) ? null : getModalidadeLabel(reserva),
    atividadeunidade_id: unidadeId,
    unidadeNome,
    cancelado: reserva.cancelado,
    users_id: reserva.users_id,
    responsavel_id: reserva.responsavel_id,
    jogoDuplas: reserva.jogoDuplas,
    clubeJogoSimples: !reserva.jogoDuplas,
    clubeJogoDuplas: reserva.jogoDuplas === true,
    adversarioPendente,
    minutosLimiteRegistro: getMinutosLimiteRegistroAdversario(
      reserva.created_at,
      reserva.cancelamentoAutomatico,
    ),
    limiteCancelamento: reserva.limiteCancelamento,
    created_at: reserva.created_at > 0 ? reserva.created_at : 0,
    responsavel: mapReservaParticipante(
      reserva.responsavel_id,
      responsavel?.nome ?? reserva.responsavel?.nome,
      responsavel?.foto ?? reserva.responsavel?.foto,
    ),
    adversario: adversarioPendente ? null : adversario
      ? {
          users_id: reserva.adversario_id,
          nome: adversario.nome,
          foto: adversario.foto,
        }
      : null,
    convidados,
  };
}

export function mapRegistroToListaEsperaSummary(
  registro: ListaEsperaRegistro,
  academiasById: Map<number, Academia>,
  posicao: number | null = null,
  totalNaLista: number | null = null,
): ListaEsperaSummary {
  return {
    id: registro.id,
    dataAtividade: registro.dataAtividade!,
    academias_id: registro.academias_id,
    localNome: getAcademiaName(registro.academias_id, academiasById),
    atividade: registro.atividade,
    avisado: registro.avisado,
    posicao,
    totalNaLista,
  };
}

export function filterActiveFutureListaEspera(
  registros: ListaEsperaRegistro[],
  referenceDate: Date = new Date(),
): ListaEsperaRegistro[] {
  return filterListaEsperaVisivelUsuario(registros, referenceDate);
}

export function sortListaEsperaByNearest<T extends { dataAtividade: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.dataAtividade - b.dataAtividade);
}

export function pickNearestReserva(reservas: ReservaSummary[]): ReservaSummary | null {
  if (reservas.length === 0) {
    return null;
  }

  return sortReservasByDataHorarioAtividadeUnidade([...reservas])[0];
}

export function pickNearestListaEspera(
  listasEspera: ListaEsperaSummary[],
): ListaEsperaSummary | null {
  if (listasEspera.length === 0) {
    return null;
  }

  return sortListaEsperaByNearest(listasEspera)[0];
}

export async function fetchHomeSummary(
  userId: number,
  authToken: string,
  academiasId: number,
): Promise<HomeSummaryFetchResult> {
  console.log('Carregando resumo da Home');

  let reservasError: string | null = null;
  let reservas: ReservaSummary[] = [];

  let academias: Academia[] = [];

  try {
    academias = await getAcademias();
  } catch {
    academias = [];
  }

  const academiasById = new Map(academias.map((academia) => [academia.id, academia]));

  try {
    const reservasUsuario = await getReservasUsuarioForUser(userId, authToken, academiasId);
    const activeReservas = filterActiveFutureReservas(reservasUsuario);
    const needsUnidadeLabels = activeReservas.some(
      (reserva) =>
        (reserva.atividadeunidade_id ?? 0) > 0 && !reserva.unidadeNome?.trim(),
    );
    const [atividadesById, unidadesById] = await Promise.all([
      buildAtividadesByIdMapForReservas(activeReservas),
      needsUnidadeLabels
        ? buildUnidadesLabelByIdForReservas(activeReservas, authToken)
        : Promise.resolve(new Map<number, string>()),
    ]);
    reservas = sortReservasByDataHorarioAtividadeUnidade(
      activeReservas.map((reserva) =>
        mapReservaUsuarioToReservaSummary(
          reserva,
          academiasById,
          atividadesById,
          unidadesById,
          academiasId,
        ),
      ),
    );
  } catch {
    reservasError = RESERVAS_ERROR_MESSAGE;
  }

  console.log('Reservas encontradas:', reservas.length);
  console.log('Resumo da Home atualizado');

  return {
    reservas,
    listasEspera: [],
    reservasError,
    listaEsperaError: null,
  };
}
