import type { ReservaUsuario } from '@/types/reserva-usuario';
import { resolveMensalPorSemanaFromDataAtividade } from '@/utils/mapa-mensal-por-semana-opcoes';

function mesmaSemanaDoMes(referencia: number, candidato: number): boolean {
  const semana = resolveMensalPorSemanaFromDataAtividade(referencia);
  const semanaCandidata = resolveMensalPorSemanaFromDataAtividade(candidato);

  if (semana == null || semanaCandidata == null || semana !== semanaCandidata) {
    return false;
  }

  const dataReferencia = new Date(referencia);
  const dataCandidata = new Date(candidato);

  return (
    dataReferencia.getFullYear() === dataCandidata.getFullYear() &&
    dataReferencia.getMonth() === dataCandidata.getMonth()
  );
}

function pertenceAAtividade(reserva: Pick<ReservaUsuario, 'atividades_id'>, atividadesId: number): boolean {
  if (atividadesId <= 0 || reserva.atividades_id <= 0) {
    return true;
  }

  return reserva.atividades_id === atividadesId;
}

/**
 * Diária usa os mesmos blocos do mês (dias 1–7, 8–14, …) de `limiteReservasSemana`.
 * Limite ausente ou zero não bloqueia.
 */
export function isLimiteReservasDiariasNaSemanaAtingido(
  dataAtividade: number,
  reservas: ReservaUsuario[],
  atividadesId: number,
  limite: number | null,
): boolean {
  if (limite == null || limite <= 0 || dataAtividade <= 0) {
    return false;
  }

  const count = reservas.filter((reserva) => {
    if (reserva.cancelado || reserva.programacao !== 'diaria') {
      return false;
    }

    if (!pertenceAAtividade(reserva, atividadesId)) {
      return false;
    }

    return mesmaSemanaDoMes(dataAtividade, reserva.dataAtividade);
  }).length;

  return count >= limite;
}

/**
 * Cada reserva semanal ativa é uma vaga fixa (dia + hora), sem data.
 * A contagem usa `limiteReservasSemana` da atividade. Limite ausente ou zero não bloqueia.
 */
export function isLimiteReservasSemanaisAtingido(
  reservas: ReservaUsuario[],
  atividadesId: number,
  limite: number | null,
): boolean {
  if (limite == null || limite <= 0) {
    return false;
  }

  const count = reservas.filter(
    (reserva) =>
      !reserva.cancelado &&
      reserva.programacao === 'semanal' &&
      pertenceAAtividade(reserva, atividadesId),
  ).length;

  return count >= limite;
}
