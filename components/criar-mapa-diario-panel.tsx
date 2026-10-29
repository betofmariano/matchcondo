import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { HOME_MAX_BUTTON_WIDTH } from '@/constants/web-layout';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import { useAppToast } from '@/contexts/app-toast-context';
import {
  CRIAR_MAPA_DIARIO_MESSAGES,
  useCriarMapaDiario,
} from '@/hooks/use-criar-mapa-diario';
import type { User } from '@/types/user';

type CriarMapaDiarioPanelProps = {
  user: User;
  disabled?: boolean;
  enabled?: boolean;
};

export function CriarMapaDiarioPanel({
  user,
  disabled = false,
  enabled = true,
}: CriarMapaDiarioPanelProps) {
  const { showToast } = useAppToast();

  const {
    isLoading,
    loadError,
    isCreating,
    createError,
    ultimaDataLabel,
    dataSugerida,
    setDataSugerida,
    dataSugeridaValida,
    loadDates,
    criarMapa,
  } = useCriarMapaDiario({
    enabled: enabled && user.administrador === true,
  });

  async function handleCreate() {
    if (disabled || isLoading || isCreating) {
      return;
    }

    const error = await criarMapa();

    if (error) {
      showToast(error, { variant: 'error' });
      return;
    }

    showToast(CRIAR_MAPA_DIARIO_MESSAGES.createSuccess, { variant: 'success' });
  }

  const isActionDisabled = disabled || isLoading || isCreating || !dataSugeridaValida;

  return (
    <View style={styles.container}>
      <Text style={styles.fieldLabel}>Data pra criar:</Text>

      <View style={styles.dateBox}>
        {isLoading ? (
          <ActivityIndicator size="small" color={MATCHPOINT_COLORS.white} />
        ) : (
          <TextInput
            value={dataSugerida}
            onChangeText={setDataSugerida}
            placeholder="YYYY-mm-dd"
            placeholderTextColor="rgba(255,255,255,0.55)"
            editable={!disabled && !isCreating}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            style={styles.dateBoxText}
          />
        )}
      </View>

      {loadError ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable onPress={() => void loadDates()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : null}

      {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

      <AuthButton
        label={isCreating ? 'Criando...' : 'Criar Mapa Diario'}
        onPress={() => void handleCreate()}
        disabled={isActionDisabled}
        style={styles.createButton}
      />

      <Text style={styles.lastDateLabel}>Último dia criado</Text>
      <Text style={styles.lastDateValue}>{isLoading ? '...' : ultimaDataLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
  },
  dateBox: {
    width: '100%',
    maxWidth: HOME_MAX_BUTTON_WIDTH,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateBoxText: {
    width: '100%',
    fontSize: 18,
    fontWeight: '600',
    color: MATCHPOINT_COLORS.white,
    textAlign: 'center',
    padding: 0,
  },
  createButton: {
    width: '100%',
    maxWidth: HOME_MAX_BUTTON_WIDTH,
  },
  lastDateLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
    marginTop: 4,
  },
  lastDateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
  },
  errorBlock: {
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: MATCHPOINT_COLORS.error,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.blue,
    textDecorationLine: 'underline',
  },
});
