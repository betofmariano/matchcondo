import type { ReservaUsuario } from '../types/reserva-usuario';
import {
  formatDiaSemanaLabel,
  resolveAtividadePadrao,
  resolveUsaMensalPorSemana,
} from '../utils/atividade-programacao';
import { normalizeMapaDiarioReservaFromApi } from '../utils/normalize-mapa-diario-reserva';
import { normalizeMapaSemanalFromApi } from '../utils/normalize-mapa-semanal';
import { buildMapaSemanalGrid } from '../utils/mapa-semanal-grid';
import { normalizeReservasSemanaisListFromApi } from '../utils/normalize-reservas-programacao';
import {
  isLimiteReservasDiariasNaSemanaAtingido,
  isLimiteReservasSemanaisAtingido,
} from '../utils/reserva-modalidade-limite';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(resolveAtividadePadrao('') === 'MensalPorSemana', 'tipo vazio permanece mensal');
assert(resolveAtividadePadrao('mensalPorSemana') === 'MensalPorSemana', 'mensal');
assert(resolveAtividadePadrao('diaria') === 'Diaria', 'diaria');
assert(resolveAtividadePadrao('semanal') === 'Semanal', 'semanal');
assert(resolveUsaMensalPorSemana({ atividade: { tipoProgramacao: 'diaria' } }) === false, 'diaria nao e mensal');
assert(formatDiaSemanaLabel(1) === 'Segunda-feira', 'segunda');
assert(formatDiaSemanaLabel(7) === 'Domingo', 'domingo');

const livre = normalizeMapaDiarioReservaFromApi({
  id: 10,
  condominio_id: 3,
  atividades_id: 8,
  dataAtividade: Date.UTC(2026, 9, 20, 15, 0, 0),
  capacidade: 2,
  reservasdiarias_id: 0,
});
assert(livre != null && livre.ocupacao === 0 && livre.capacidade === 2, 'vaga diaria livre');

const ocupado = normalizeMapaDiarioReservaFromApi({
  id: 11,
  condominio_id: 3,
  atividades_id: 8,
  dataAtividade: Date.UTC(2026, 9, 20, 16, 0, 0),
  capacidade: 2,
  reservasdiarias_id: 44,
});
assert(ocupado != null && ocupado.ocupacao === 2, 'vaga diaria ocupada pelo vinculo');

const semanal = normalizeMapaSemanalFromApi({
  id: 5,
  condominio_id: 3,
  atividades_id: 8,
  diaSemana: 2,
  hora: 19,
  minutos: 30,
  capacidade: 1,
  reservassemanais_id: 0,
});
assert(semanal?.disponivel === true && semanal.diaSemana === 2, 'horario semanal livre');

const semanalOcupado = normalizeMapaSemanalFromApi({
  id: 6,
  condominio_id: 3,
  atividades_id: 8,
  diaSemana: 2,
  hora: 20,
  minutos: 0,
  capacidade: 1,
  reservassemanais_id: 9,
});
assert(semanalOcupado?.disponivel === false, 'horario semanal ocupado');

const base = {
  id: 1,
  dataAtividade: new Date(2026, 9, 5, 10).getTime(),
  quadra: 0,
  academias_id: 3,
  atividades_id: 8,
  semana: null,
  mapadiariodamha_id: 0,
  reservasdamha_id: 0,
  mapadiario_id: 10,
  mapasemanal_id: 0,
  programacao: 'diaria',
  diaSemana: null,
  hora: null,
  minutos: null,
  atividadeunidade_id: null,
  unidadeNome: null,
  atividade: null,
  cancelado: false,
  users_id: 1,
  nome: null,
  foto: null,
  responsavel_id: 1,
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
} as ReservaUsuario;

const diarias = [
  base,
  { ...base, id: 2, dataAtividade: new Date(2026, 9, 6, 10).getTime() },
  { ...base, id: 3, dataAtividade: new Date(2026, 9, 12, 10).getTime() },
];

assert(
  isLimiteReservasDiariasNaSemanaAtingido(new Date(2026, 9, 7, 9).getTime(), diarias, 8, 2),
  'duas diarias na primeira semana bloqueiam a terceira',
);
assert(
  !isLimiteReservasDiariasNaSemanaAtingido(new Date(2026, 9, 7, 9).getTime(), diarias, 8, null),
  'sem limite configurado nao bloqueia',
);

const semanais = normalizeReservasSemanaisListFromApi([
  { id: 1, users_id: 4, atividades_id: 8, condominio_id: 3, diaSemana: 1, hora: 8, minutos: 0, cancelado: false, mapasemanal_id: 5 },
  { id: 2, users_id: 4, atividades_id: 8, condominio_id: 3, diaSemana: 3, hora: 8, minutos: 0, cancelado: false, mapasemanal_id: 6 },
  { id: 3, users_id: 4, atividades_id: 8, condominio_id: 3, diaSemana: 5, hora: 8, minutos: 0, cancelado: true, mapasemanal_id: 7 },
]);
assert(semanais.length === 3, 'lista semanal normalizada');
assert(isLimiteReservasSemanaisAtingido(semanais, 8, 2), 'duas vagas semanais ativas atingem o limite');
assert(
  semanais.filter((reserva) => !reserva.cancelado && reserva.programacao === 'semanal' && reserva.dataAtividade <= 0)
    .length === 2,
  'reserva semanal ativa nao depende de data',
);

const grade = buildMapaSemanalGrid([
  { id: 1, academias_id: 1, atividades_id: 1, capacidade: 1, atividadeunidade_id: null, atividadeUnidadeNome: null, tipoProgramacao: 'semanal', diaSemana: 5, hora: 8, minutos: 0, reservassemanais_id: 0, disponivel: true },
  { id: 2, academias_id: 1, atividades_id: 1, capacidade: 1, atividadeunidade_id: null, atividadeUnidadeNome: null, tipoProgramacao: 'semanal', diaSemana: 1, hora: 8, minutos: 0, reservassemanais_id: 3, disponivel: false },
  { id: 3, academias_id: 1, atividades_id: 1, capacidade: 1, atividadeunidade_id: null, atividadeUnidadeNome: null, tipoProgramacao: 'semanal', diaSemana: 1, hora: 9, minutos: 0, reservassemanais_id: 0, disponivel: true },
]);
assert(grade.columns.map((column) => column.weekdayLabel).join(',') === 'Seg,Sex', 'colunas na ordem segunda, sexta');
assert(grade.rows[0]?.timeLabel === '08:00', 'primeira linha e o horario mais cedo');
assert(grade.rows[0]?.cells['1']?.available === false, 'segunda 08 ocupada');
assert(grade.rows[0]?.cells['5']?.available === true, 'sexta 08 livre');

console.log('reservas modalidade ok');
