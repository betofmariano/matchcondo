import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import type { MapaSemanalItem } from '@/types/mapa-semanal';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { buildMapaSemanalGrid } from '@/utils/mapa-semanal-grid';

type MapaSemanalGridProps = {
  horarios: MapaSemanalItem[];
  isBusy?: boolean;
  onSelectHorario: (item: MapaSemanalItem) => void;
};

const COLORS = {
  navy: MATCHPOINT_COLORS.navy,
  white: MATCHPOINT_COLORS.white,
  border: '#9AA3B5',
  cellAvailable: '#E6F4EA',
  cellUnavailable: '#F8D7DA',
};

const TIME_COLUMN_WIDTH = 72;
const DATE_COLUMN_WIDTH = 88;
const DATA_ROW_HEIGHT = 64;
const INDISPONIVEL_MESSAGE = 'Este horário não está disponível para reserva.';

export function MapaSemanalGrid({
  horarios,
  isBusy = false,
  onSelectHorario,
}: MapaSemanalGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { alert } = useAppDialog();
  const grid = buildMapaSemanalGrid(horarios);
  const columnCount = Math.max(grid.columns.length, 1);
  const useHorizontalScroll = screenWidth <= WEB_MAX_CONTENT_WIDTH;
  const datesWidth = DATE_COLUMN_WIDTH * columnCount;
  const dateColumnStyle = useHorizontalScroll ? styles.dateColumnFixed : styles.dateColumnFlexible;

  function renderDateCell(
    columnKey: string,
    cell: (typeof grid.rows)[number]['cells'][string] | undefined,
  ): ReactNode {
    if (!cell) {
      return <View key={columnKey} style={[styles.dataCell, dateColumnStyle]} />;
    }

    if (!cell.available) {
      return (
        <Pressable
          key={columnKey}
          style={[styles.dataCell, dateColumnStyle, styles.cellUnavailable]}
          onPress={() => {
            void alert({
              title: 'Horário indisponível',
              message: INDISPONIVEL_MESSAGE,
            });
          }}>
          <Text style={styles.cellWeekday} numberOfLines={1}>
            {cell.weekdayLabel}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        key={columnKey}
        style={[styles.dataCell, dateColumnStyle, styles.cellAvailable]}
        disabled={isBusy}
        onPress={() => onSelectHorario(cell.item)}>
        <Text style={styles.cellWeekday} numberOfLines={1}>
          {cell.weekdayLabel}
        </Text>
      </Pressable>
    );
  }

  const datesBody = (
    <View style={useHorizontalScroll ? { width: datesWidth } : styles.datesTableFlexible}>
      {grid.rows.map((row) => (
        <View key={row.key} style={styles.dataRow}>
          {grid.columns.map((column) => renderDateCell(column.key, row.cells[column.key]))}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tableFrame}>
        {useHorizontalScroll ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            showsHorizontalScrollIndicator
            style={styles.datesScroll}
            contentContainerStyle={styles.datesScrollContent}>
            <View style={styles.scrollInner}>
              <View style={styles.timeSpacer} />
              {datesBody}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.wideInner}>
            <View style={styles.timeSpacer} />
            <View style={styles.datesContainer}>{datesBody}</View>
          </View>
        )}

        <View style={styles.frozenTimeOverlay} pointerEvents="box-none">
          {grid.rows.map((row) => (
            <View key={row.key} style={[styles.dataCell, styles.timeDataCell]}>
              <Text style={styles.timeText} numberOfLines={1}>
                {row.timeLabel}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 16,
  },
  tableFrame: {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  datesScroll: {
    width: '100%',
  },
  datesScrollContent: {
    flexGrow: 1,
  },
  scrollInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wideInner: {
    flexDirection: 'row',
    width: '100%',
  },
  timeSpacer: {
    width: TIME_COLUMN_WIDTH,
    flexShrink: 0,
  },
  datesContainer: {
    flex: 1,
    minWidth: 0,
  },
  datesTableFlexible: {
    flex: 1,
    minWidth: 0,
  },
  frozenTimeOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TIME_COLUMN_WIDTH,
    zIndex: 2,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  dataRow: {
    flexDirection: 'row',
    height: DATA_ROW_HEIGHT,
  },
  dataCell: {
    height: DATA_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  timeDataCell: {
    width: TIME_COLUMN_WIDTH,
    borderRightWidth: 0,
    backgroundColor: COLORS.white,
  },
  dateColumnFixed: {
    width: DATE_COLUMN_WIDTH,
    flexShrink: 0,
  },
  dateColumnFlexible: {
    flex: 1,
    minWidth: 0,
  },
  timeText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.navy,
    textAlign: 'center',
  },
  cellAvailable: {
    backgroundColor: COLORS.cellAvailable,
  },
  cellUnavailable: {
    backgroundColor: COLORS.cellUnavailable,
  },
  cellWeekday: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
});
