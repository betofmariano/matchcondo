import { formatDiaSemanaLabel, formatHoraMinutos } from '@/utils/atividade-programacao';

type ReservaQuando = {
  programacao?: string | null;
  dataAtividade: number;
  diaSemana?: number | null;
  hora?: number | null;
  minutos?: number | null;
};

export function formatReservaSemanalQuando(
  reserva: Pick<ReservaQuando, 'diaSemana' | 'hora' | 'minutos'>,
): string {
  return `${formatDiaSemanaLabel(reserva.diaSemana)} · ${formatHoraMinutos(
    reserva.hora ?? 0,
    reserva.minutos ?? 0,
  )}`;
}

export function formatReservaQuando(
  reserva: ReservaQuando,
  formatDated: (timestamp: number) => string,
): string {
  if (reserva.programacao === 'semanal') {
    return formatReservaSemanalQuando(reserva);
  }

  if (reserva.dataAtividade <= 0) {
    return 'Não informado';
  }

  return formatDated(reserva.dataAtividade);
}
