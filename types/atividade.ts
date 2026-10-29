export type Atividade = {
  id: number;
  atividade: string;
  academias_id: number;
  capacidade: number;
  controlePresenca: boolean;
  horasAntes: number;
  minutosCancelamento: number;
  observacao: string;
  tolerancia: number;
  qtdeHorarios: number;
  tipoProgramacao: string;
  checkinAntes: number;
  checkinDepois: number;
  checkinSeguro: boolean;
  limiteReservasSemana: number;
  /** Indica se a atividade possui unidades cadastradas (ex.: Quadra 1/2). */
  temUnidades: boolean;
};

export type AtividadeOption = {
  id: number;
  nome: string;
  tipoProgramacao?: string;
  limiteReservasSemana?: number;
  temUnidades?: boolean;
};

export type CreateAtividadePayload = {
  nome: string;
  condominio_id: number;
};
