import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AtividadeSelector } from '@/components/atividade-selector';
import { ClubSelector } from '@/components/club-selector';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import type { AtividadeOption } from '@/types/atividade';
import type { Club } from '@/types/club';
import type { HorarioDiaKey, HorarioDiasSemana } from '@/types/horario';
import { HORARIO_DIAS_SEMANA_OPTIONS } from '@/utils/horario-cadastro-form';

type CadastroHorariosFormProps = {
  availableClubs: Club[];
  selectedClubId: number | null;
  onClubChange: (clubId: number) => void;
  isLoadingClubs: boolean;
  clubsLoadError: string | null;
  onRetryClubs?: () => void;
  showClubSelector: boolean;
  localNome?: string | null;
  showFormFields: boolean;
  atividades: AtividadeOption[];
  selectedAtividadeId: number | null;
  onAtividadeChange: (atividadeId: number) => void;
  isLoadingAtividades: boolean;
  atividadesLoadError: string | null;
  onRetryAtividades?: () => void;
  horaValue: string;
  minutosValue: string;
  onHoraChange: (value: string) => void;
  onMinutosChange: (value: string) => void;
  diasSemana: HorarioDiasSemana;
  onToggleDia: (key: HorarioDiaKey) => void;
  fieldErrors: {
    hora?: string;
    minutos?: string;
    dias?: string;
    atividade?: string;
  };
  atividadeSelectorDisabled?: boolean;
  localSelectorDisabled?: boolean;
  disabled?: boolean;
};

const COLORS = {
  navy: MATCHPOINT_COLORS.navy,
  blue: MATCHPOINT_COLORS.blue,
  border: MATCHPOINT_COLORS.border,
  error: MATCHPOINT_COLORS.error,
  white: MATCHPOINT_COLORS.white,
};

export function CadastroHorariosForm({
  availableClubs,
  selectedClubId,
  onClubChange,
  isLoadingClubs,
  clubsLoadError,
  onRetryClubs,
  showClubSelector,
  localNome = null,
  showFormFields,
  atividades,
  selectedAtividadeId,
  onAtividadeChange,
  isLoadingAtividades,
  atividadesLoadError,
  onRetryAtividades,
  horaValue,
  minutosValue,
  onHoraChange,
  onMinutosChange,
  diasSemana,
  onToggleDia,
  fieldErrors,
  atividadeSelectorDisabled = false,
  localSelectorDisabled = false,
  disabled = false,
}: CadastroHorariosFormProps) {
  const showLocalSelector = showClubSelector && !isLoadingClubs;

  return (
    <View style={styles.form}>
      {showLocalSelector ? (
        <ClubSelector
          clubs={availableClubs}
          value={selectedClubId}
          onChange={onClubChange}
          isLoading={isLoadingClubs}
          error={clubsLoadError}
          onRetry={onRetryClubs}
          disabled={localSelectorDisabled}
          label="Escolha o local"
          placeholder="Selecione o local"
          modalTitle="Escolha o local"
        />
      ) : localNome ? (
        <View style={styles.readonlyField}>
          <Text style={styles.readonlyLabel}>Local</Text>
          <Text style={styles.readonlyValue}>{localNome}</Text>
        </View>
      ) : null}

      {!showFormFields ? null : (
        <>
      <AtividadeSelector
        atividades={atividades}
        value={selectedAtividadeId}
        onChange={onAtividadeChange}
        isLoading={isLoadingAtividades}
        error={atividadesLoadError}
        onRetry={onRetryAtividades}
        disabled={atividadeSelectorDisabled}
      />
      {fieldErrors.atividade ? <Text style={styles.fieldError}>{fieldErrors.atividade}</Text> : null}

      <Text style={styles.label}>Horário</Text>
      <View style={styles.timeRow}>
        <TextInput
          style={[styles.timeInput, fieldErrors.hora && styles.timeInputError]}
          value={horaValue}
          onChangeText={onHoraChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="00"
          placeholderTextColor={MATCHPOINT_COLORS.placeholder}
          editable={!disabled}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          style={[styles.timeInput, fieldErrors.minutos && styles.timeInputError]}
          value={minutosValue}
          onChangeText={onMinutosChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="00"
          placeholderTextColor={MATCHPOINT_COLORS.placeholder}
          editable={!disabled}
        />
      </View>
      {fieldErrors.hora ? <Text style={styles.fieldError}>{fieldErrors.hora}</Text> : null}
      {fieldErrors.minutos ? <Text style={styles.fieldError}>{fieldErrors.minutos}</Text> : null}

      <Text style={styles.sectionTitle}>Marque os dias da atividade</Text>
      <View style={styles.daysList}>
        {HORARIO_DIAS_SEMANA_OPTIONS.map((option) => {
          const isChecked = diasSemana[option.key];

          return (
            <Pressable
              key={option.key}
              style={styles.dayRow}
              onPress={() => onToggleDia(option.key)}
              disabled={disabled}>
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked ? <Ionicons name="checkmark" size={16} color={COLORS.white} /> : null}
              </View>
              <Text style={styles.dayLabel}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {fieldErrors.dias ? <Text style={styles.fieldError}>{fieldErrors.dias}</Text> : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    paddingTop: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: 8,
    marginBottom: 12,
  },
  readonlyField: {
    marginBottom: 4,
  },
  readonlyLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 8,
  },
  readonlyValue: {
    fontSize: 16,
    color: COLORS.navy,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#F8FAFD',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  timeInput: {
    width: 72,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  timeInputError: {
    borderColor: COLORS.error,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.navy,
  },
  daysList: {
    gap: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  dayLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
  fieldError: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
    color: COLORS.error,
    fontWeight: '600',
  },
});
