export type HorarioDiasSemana = {
  segunda: boolean;
  terca: boolean;
  quarta: boolean;
  quinta: boolean;
  sexta: boolean;
  sabado: boolean;
  domingo: boolean;
};

export type Horario = {
  id: number;
  academias_id: number;
  atividades_id: number;
  atividade: string;
  capacidade: number;
  hora: number;
  minutos: number;
  tipoProgramacao: string;
} & HorarioDiasSemana;

export type CreateHorarioPayload = {
  condominio_id: number;
  atividades_id: number;
  atividade: string;
  capacidade: number;
  hora: number;
  minutos: number;
  tipoProgramacao: string;
} & HorarioDiasSemana;

export type HorarioDiaKey = keyof HorarioDiasSemana;
