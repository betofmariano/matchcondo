import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import {
  formatMapaMensalPorSemanaSemanaLabel,
  type MapaMensalPorSemanaSemanaOption,
} from '@/utils/mapa-mensal-por-semana-opcoes';

type MapaMensalPorSemanaSemanaSelectorProps = {
  atividadeNome: string;
  semanas: MapaMensalPorSemanaSemanaOption[];
  isBusy?: boolean;
  onSelectSemana: (semana: number) => void;
  onVoltar: () => void;
};

const COLORS = {
  navy: MATCHPOINT_COLORS.navy,
  blue: MATCHPOINT_COLORS.blue,
  white: MATCHPOINT_COLORS.white,
  muted: MATCHPOINT_COLORS.muted,
  border: MATCHPOINT_COLORS.borderLight,
};

/** Meio-termo entre 20 (antiga) e 16. */
const OPTION_FONT_SIZE = 18;

export function MapaMensalPorSemanaSemanaSelector({
  atividadeNome,
  semanas,
  isBusy = false,
  onSelectSemana,
  onVoltar,
}: MapaMensalPorSemanaSemanaSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.activityName}>{atividadeNome}</Text>

      <Text style={styles.instruction}>Selecione a semana</Text>

      {semanas.map((option) =>
        option.selecionavel ? (
          <Pressable
            key={option.semana}
            style={styles.optionButton}
            disabled={isBusy}
            onPress={() => onSelectSemana(option.semana)}>
            <Text style={styles.optionText}>{formatMapaMensalPorSemanaSemanaLabel(option)}</Text>
          </Pressable>
        ) : (
          <View key={option.semana} style={[styles.optionButton, styles.optionButtonDisabled]}>
            <Text style={styles.optionTextDisabled}>{formatMapaMensalPorSemanaSemanaLabel(option)}</Text>
            <Text style={styles.optionHint}>Limite de reservas atingido</Text>
          </View>
        ),
      )}

      <AuthButton
        label="Voltar"
        variant="voltar"
        onPress={onVoltar}
        disabled={isBusy}
        style={styles.voltarButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 16,
  },
  activityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 16,
  },
  instruction: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 16,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: '#E6F4EA',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  optionButtonDisabled: {
    backgroundColor: '#F4F6FA',
    opacity: 0.85,
  },
  optionText: {
    fontSize: OPTION_FONT_SIZE,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'center',
  },
  optionTextDisabled: {
    fontSize: OPTION_FONT_SIZE,
    fontWeight: '700',
    color: COLORS.muted,
    textAlign: 'center',
  },
  optionHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    textAlign: 'center',
  },
  voltarButton: {
    marginTop: 16,
    alignSelf: 'center',
    maxWidth: 280,
  },
});
