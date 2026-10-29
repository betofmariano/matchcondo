import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ReservaSummary } from '@/types/home-summary';
import { formatDateLabel, formatGameTime } from '@/utils/jogos-time';
import { formatReservaQuando } from '@/utils/reserva-periodo';

type ReservaSummaryListProps = {
  reservas: ReservaSummary[];
  showLocal?: boolean;
  canCancelReserva?: (reserva: ReservaSummary) => boolean;
  cancellingReservaId?: number | null;
  onCancelPress?: (reserva: ReservaSummary) => void;
};

const COL_DELETE_WIDTH = 32;
const COL_DATA_WIDTH = 160;
const COL_LOCAL_WIDTH = 120;
const COL_ATIVIDADE_WIDTH = 160;
const COL_UNIDADE_WIDTH = 72;
const ROW_GAP = 8;
const ROW_PADDING_H = 16;
const CENTER_TABLE_FROM_WIDTH = 500;

function formatReservaSummaryDataHora(timestamp: number): string {
  if (timestamp <= 0) {
    return 'Não informado';
  }

  return `${formatDateLabel(new Date(timestamp))} - ${formatGameTime(timestamp)} hs`;
}

function computeTableMinWidth(options: {
  showDeleteAction: boolean;
  showLocal: boolean;
  showUnidade: boolean;
}): number {
  let width = COL_DATA_WIDTH + COL_ATIVIDADE_WIDTH + ROW_PADDING_H;
  let columns = 2;

  if (options.showDeleteAction) {
    width += COL_DELETE_WIDTH;
    columns += 1;
  }

  if (options.showLocal) {
    width += COL_LOCAL_WIDTH;
    columns += 1;
  }

  if (options.showUnidade) {
    width += COL_UNIDADE_WIDTH;
    columns += 1;
  }

  return width + ROW_GAP * Math.max(0, columns - 1);
}

const COLORS = {
  navy: '#3A2154',
  error: '#D64545',
  border: '#E2E6EE',
};

export function ReservaSummaryList({
  reservas,
  showLocal = true,
  canCancelReserva,
  cancellingReservaId = null,
  onCancelPress,
}: ReservaSummaryListProps) {
  const { width: screenWidth } = useWindowDimensions();
  const showDeleteAction = Boolean(onCancelPress);
  const showUnidade = reservas.some(
    (reserva) => reserva.atividadeunidade_id != null && reserva.atividadeunidade_id > 0,
  );
  const tableMinWidth = computeTableMinWidth({
    showDeleteAction,
    showLocal,
    showUnidade,
  });
  const shouldCenterTable = screenWidth > CENTER_TABLE_FROM_WIDTH;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      directionalLockEnabled
      showsHorizontalScrollIndicator
      style={styles.horizontalScroll}
      contentContainerStyle={[
        styles.horizontalScrollContent,
        shouldCenterTable ? styles.horizontalScrollContentCentered : null,
      ]}>
      <View style={[styles.table, { width: tableMinWidth, minWidth: tableMinWidth }]}>
        <View style={[styles.tableRow, styles.headerRow]}>
          <Text style={[styles.headerCell, styles.colData]}>Data e Hora</Text>
          {showLocal ? <Text style={[styles.headerCell, styles.colLocal]}>Local</Text> : null}
          <Text style={[styles.headerCell, styles.colAtividade]}>Atividade</Text>
          {showDeleteAction ? <View style={styles.deleteCol} /> : null}
          {showUnidade ? <Text style={[styles.headerCell, styles.colUnidade]}>Local</Text> : null}
        </View>

        {reservas.map((reserva) => {
          const canCancel = canCancelReserva?.(reserva) ?? false;
          const isCancelling = cancellingReservaId === reserva.id;

          return (
            <View key={`${reserva.programacao}-${reserva.id}`} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colData]} numberOfLines={1}>
                {formatReservaQuando(reserva, formatReservaSummaryDataHora)}
              </Text>
              {showLocal ? (
                <Text style={[styles.tableCell, styles.colLocal]} numberOfLines={2}>
                  {reserva.localNome}
                </Text>
              ) : null}
              <Text style={[styles.tableCell, styles.colAtividade]} numberOfLines={2}>
                {reserva.atividade?.trim() || 'Não informada'}
              </Text>
              {showDeleteAction ? (
                <View style={styles.deleteCol}>
                  {canCancel ? (
                    <Pressable
                      onPress={() => onCancelPress?.(reserva)}
                      disabled={isCancelling}
                      accessibilityLabel="Cancelar reserva">
                      {isCancelling ? (
                        <ActivityIndicator size="small" color={COLORS.error} />
                      ) : (
                        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {showUnidade ? (
                <Text style={[styles.tableCell, styles.colUnidade]} numberOfLines={1}>
                  {reserva.unidadeNome?.trim() || ''}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  horizontalScroll: {
    width: '100%',
  },
  horizontalScrollContent: {
    flexGrow: 1,
  },
  horizontalScrollContentCentered: {
    justifyContent: 'center',
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    backgroundColor: '#F4F6FA',
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
  },
  tableCell: {
    fontSize: 16,
    color: COLORS.navy,
  },
  deleteCol: {
    width: COL_DELETE_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  colData: {
    width: COL_DATA_WIDTH,
    flexShrink: 0,
  },
  colLocal: {
    width: COL_LOCAL_WIDTH,
    flexShrink: 0,
  },
  colAtividade: {
    width: COL_ATIVIDADE_WIDTH,
    flexShrink: 0,
  },
  colUnidade: {
    width: COL_UNIDADE_WIDTH,
    flexShrink: 0,
  },
});
