export type MapaSemanalItem = {
  id: number;
  academias_id: number;
  atividades_id: number;
  capacidade: number;
  atividadeunidade_id: number | null;
  atividadeUnidadeNome: string | null;
  tipoProgramacao: string;
  diaSemana: number;
  hora: number;
  minutos: number;
  reservassemanais_id: number;
  disponivel: boolean;
};
