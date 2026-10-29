import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LogadoBooleanCell } from '@/components/logado-boolean-cell';
import { LogadoTableCell } from '@/components/logado-table-cell';
import { LOGADOS_TABLE_MIN_WIDTH } from '@/constants/web-layout';
import type { LogadoRecord } from '@/types/logado';
import { formatLogadoCreatedAt, formatLogadoTelefone, getLogadoClubeNome } from '@/utils/logado-lista-format';
import {
  LOGADOS_COL_WIDTHS,
  LOGADOS_TABLE_GAP,
  LOGADOS_TABLE_ROW_MIN_HEIGHT,
  LOGADOS_TABLE_ROW_PADDING_H,
  LOGADOS_TABLE_ROW_PADDING_V,
} from '@/utils/logado-table-layout';

type LogadoListItemProps = {
  logado: LogadoRecord;
  layout: 'card' | 'table';
  onPress: () => void;
  onDeletePress: () => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  muted: '#5C6475',
  border: '#E2E6EE',
};

export function LogadoListItem({
  logado,
  layout,
  onPress,
  onDeletePress,
}: LogadoListItemProps) {
  const createdLabel = formatLogadoCreatedAt(logado.created_at);
  const clubeLabel = getLogadoClubeNome(logado);

  if (layout === 'table') {
    return (
      <Pressable style={styles.tableRow} onPress={onPress}>
        <Pressable style={styles.deleteButton} onPress={onDeletePress} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color={COLORS.blue} />
        </Pressable>

        <LogadoTableCell width={LOGADOS_COL_WIDTHS.data} textStyle={styles.tableCell}>
          {createdLabel}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.id} textStyle={styles.tableCell}>
          {logado.users_id}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.nome} align="left" textStyle={styles.tableCell}>
          {logado.nome || '—'}
        </LogadoTableCell>

        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.aprovado} />
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.gestor} />
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.administrador} />
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.bloqueado} />
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.logadoXano} />
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.flag}>
          <LogadoBooleanCell value={logado.logadoBubble === true} />
        </LogadoTableCell>

        <LogadoTableCell width={LOGADOS_COL_WIDTHS.width} textStyle={styles.tableCell}>
          {logado.larguraPagina}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.clube} align="left" textStyle={styles.tableCell}>
          {clubeLabel}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.telefone} textStyle={styles.tableCell}>
          {formatLogadoTelefone(logado)}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.plataforma} textStyle={styles.tableCell}>
          {logado.plataforma || '—'}
        </LogadoTableCell>
        <LogadoTableCell width={LOGADOS_COL_WIDTHS.dispositivo} align="left" textStyle={styles.tableCell}>
          {logado.dispositivo || '—'}
        </LogadoTableCell>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{createdLabel}</Text>
        <Pressable style={styles.deleteButton} onPress={onDeletePress} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color={COLORS.blue} />
        </Pressable>
      </View>

      <Text style={styles.cardNome} numberOfLines={1}>
        {logado.nome || '—'}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        ID: {logado.users_id}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {clubeLabel}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {formatLogadoTelefone(logado)}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        Plataforma: {logado.plataforma || '—'}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={2}>
        Dispositivo: {logado.dispositivo || '—'}
      </Text>
      <Text style={styles.cardFlags} numberOfLines={2}>
        {[
          logado.aprovado ? 'Aprov' : null,
          logado.gestor ? 'Gestor' : null,
          logado.administrador ? 'Adm' : null,
          logado.bloqueado ? 'Bloq' : null,
        ]
          .filter(Boolean)
          .join(' · ') || '—'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LOGADOS_TABLE_GAP,
    minHeight: LOGADOS_TABLE_ROW_MIN_HEIGHT,
    paddingVertical: LOGADOS_TABLE_ROW_PADDING_V,
    paddingHorizontal: LOGADOS_TABLE_ROW_PADDING_H,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minWidth: LOGADOS_TABLE_MIN_WIDTH,
  },
  tableCell: {
    color: COLORS.navy,
  },
  deleteButton: {
    width: LOGADOS_COL_WIDTHS.delete,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  card: {
    width: '100%',
    maxWidth: 960,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.blue,
    flex: 1,
    marginRight: 8,
  },
  cardNome: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 3,
  },
  cardFlags: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginTop: 4,
  },
});
