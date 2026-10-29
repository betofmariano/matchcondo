export const LOGADOS_TABLE_GAP = 6;
export const LOGADOS_TABLE_ROW_PADDING_H = 8;
export const LOGADOS_TABLE_ROW_PADDING_V = 8;
export const LOGADOS_TABLE_ROW_MIN_HEIGHT = 38;

export const LOGADOS_COL_WIDTHS = {
  delete: 32,
  data: 110,
  id: 72,
  nome: 194,
  flag: 42,
  width: 56,
  clube: 150,
  telefone: 130,
  plataforma: 100,
  dispositivo: 100,
} as const;

/** aprov, gest, adm, bloq, xano e bubble. */
const FLAG_COLUMN_COUNT = 6;
const COLUMN_COUNT = 9 + FLAG_COLUMN_COUNT;
const GAP_COUNT = COLUMN_COUNT - 1;

export const LOGADOS_TABLE_MIN_WIDTH =
  LOGADOS_COL_WIDTHS.delete +
  LOGADOS_COL_WIDTHS.data +
  LOGADOS_COL_WIDTHS.id +
  LOGADOS_COL_WIDTHS.nome +
  LOGADOS_COL_WIDTHS.flag * FLAG_COLUMN_COUNT +
  LOGADOS_COL_WIDTHS.width +
  LOGADOS_COL_WIDTHS.clube +
  LOGADOS_COL_WIDTHS.telefone +
  LOGADOS_COL_WIDTHS.plataforma +
  LOGADOS_COL_WIDTHS.dispositivo +
  LOGADOS_TABLE_GAP * GAP_COUNT +
  LOGADOS_TABLE_ROW_PADDING_H * 2;

export const LOGADOS_SCREEN_MAX_WIDTH = LOGADOS_TABLE_MIN_WIDTH;
