import type { ReservaProgramacao } from '@/types/reserva-usuario';

export type ReservaParticipanteSummary = {
  users_id: number;
  nome: string;
  foto: string | null;
};

export type ReservaSummary = {
  id: number;
  reservasdamha_id: number;
  mapadiariodamha_id: number;
  mapadiario_id: number;
  mapasemanal_id: number;
  programacao: ReservaProgramacao;
  diaSemana: number | null;
  hora: number | null;
  minutos: number | null;
  dataAtividade: number;
  quadra: number;
  academias_id: number;
  atividades_id: number;
  semana: number | null;
  localNome: string;
  atividade: string | null;
  modalidade: string | null;
  atividadeunidade_id: number | null;
  unidadeNome: string | null;
  cancelado: boolean;
  users_id: number;
  responsavel_id: number;
  jogoDuplas: boolean;
  clubeJogoSimples: boolean;
  clubeJogoDuplas: boolean;
  adversarioPendente: boolean;
  minutosLimiteRegistro: number | null;
  limiteCancelamento: number | null;
  /** Timestamp de criação (para desempate / inconsistência de limite semanal). */
  created_at: number;
  responsavel: ReservaParticipanteSummary | null;
  adversario: ReservaParticipanteSummary | null;
  convidados: ReservaParticipanteSummary[];
};

export type ListaEsperaSummary = {
  id: number;
  dataAtividade: number;
  academias_id: number;
  localNome: string;
  atividade: string;
  avisado: boolean;
  posicao: number | null;
  totalNaLista: number | null;
};

export type HomeSummaryState = {
  reservas: ReservaSummary[];
  listasEspera: ListaEsperaSummary[];
  proximaReserva: ReservaSummary | null;
  proximaListaEspera: ListaEsperaSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  reservasError: string | null;
  listaEsperaError: string | null;
};
