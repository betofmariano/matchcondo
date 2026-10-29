import type { MapaDiarioFuturoItem } from '../types/mapa-diario-futuro';
import type { ReservaUsuario } from '../types/reserva-usuario';
import { resolveLimiteReservasSemana } from '../utils/atividade-programacao';
import {
  buildMensalPorSemanaCalendarRange,
  countReservasMensalPorSemanaValidasNoPeriodo,
  isSemanaMensalPorSemanaLimiteAtingido,
} from '../utils/mapa-mensal-por-semana-opcoes';
import { normalizeAtividadeFromApi } from '../utils/normalize-atividade';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const periodo = buildMensalPorSemanaCalendarRange(3, new Date(2026, 10, 15, 8, 0, 0, 0).getTime());
assert(periodo != null, 'periodo da semana 3');

const base = {
  cancelado: false,
  academias_id: 0,
  atividades_id: 0,
  semana: 3,
  dataAtividade: Date.UTC(2026, 10, 15, 0, 0, 0),
  reservasdamha_id: 0,
  users_id: 1,
  responsavel_id: 1,
  mapadiario_id: 0,
  mapadiariodamha_id: 0,
  quadra: 0,
  atividadeunidade_id: null,
  unidadeNome: null,
  atividade: null,
  nome: null,
  foto: null,
  limiteCancelamento: null,
  jogoDuplas: false,
  adversario_id: 0,
  parceiro1_id: 0,
  parceiro2_id: 0,
  created_at: 0,
  cancelamentoAutomatico: null,
  numeroCancelamento: 0,
  responsavel: null,
  adversario: null,
  parceiro1: null,
  parceiro2: null,
} as ReservaUsuario;

const reservas: ReservaUsuario[] = [
  { ...base, id: 11 },
  { ...base, id: 12, dataAtividade: Date.UTC(2026, 10, 16, 0, 0, 0) },
  { ...base, id: 13, atividades_id: 99 },
];

const count = countReservasMensalPorSemanaValidasNoPeriodo(reservas, 7, periodo!, 4, 3);
assert(count === 2, `esperava 2 reservas na semana, obteve ${count}`);

const atividade = normalizeAtividadeFromApi({
  id: 4,
  academias_id: 7,
  atividade: 'Quadra',
  limiteReservasSemana: '2',
  tipoProgramacao: 'mensalPorSemana',
});
const limite = resolveLimiteReservasSemana({ atividade });
assert(limite === 2, `limite lido da atividade: ${limite}`);

const mapa = [
  {
    id: 1,
    academias_id: 7,
    atividades_id: 4,
    semana: 3,
    dataAtividade: new Date(2026, 10, 15, 8).getTime(),
    hora: 8,
    minutos: 0,
    ocupacao: 1,
    capacidade: 1,
    quadra: 0,
    dataLiberacao: 0,
    atividadeunidade_id: null,
    tipoProgramacao: '',
  },
] as MapaDiarioFuturoItem[];

assert(
  isSemanaMensalPorSemanaLimiteAtingido(3, reservas.slice(0, 2), mapa, 7, limite, new Date(2026, 10, 15), 4),
  'semana deveria ficar bloqueada ao atingir o limite configurado',
);
assert(
  !isSemanaMensalPorSemanaLimiteAtingido(3, reservas.slice(0, 1), mapa, 7, limite, new Date(2026, 10, 15), 4),
  'uma reserva abaixo do limite ainda pode entrar na semana',
);
assert(
  !isSemanaMensalPorSemanaLimiteAtingido(3, reservas.slice(0, 2), mapa, 7, 3, new Date(2026, 10, 15), 4),
  'limite 3 nao pode ser tratado como 2',
);

console.log('limite semanal ok');
