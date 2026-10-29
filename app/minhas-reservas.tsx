import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CancelarReservaModal } from '@/components/cancelar-reserva-modal';
import { ReservaSummaryList } from '@/components/reserva-summary-list';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { useAuth } from '@/contexts/auth-context';
import { useUserContext } from '@/contexts/user-context';
import { fetchHomeSummary } from '@/services/home-summary-service';
import type { ReservaSummary } from '@/types/home-summary';
import { canCancelReservaUsuarioList } from '@/utils/reserva-adversario';
import { formatFullDateLabel, formatGameTime } from '@/utils/jogos-time';
import { formatReservaQuando } from '@/utils/reserva-periodo';

const COLORS = {
  background: '#FFFFFF',
  navy: '#3A2154',
  blue: '#0F7A6C',
  error: '#D64545',
  muted: '#5C6475',
  cardBg: '#F4F6FA',
  border: '#E2E6EE',
};

const LOAD_ERROR_MESSAGE = 'Não foi possível carregar suas reservas.';
const EMPTY_MESSAGE = 'Você não possui reservas futuras ativas.';

function ReservaCard({
  reserva,
  showLocal,
  onCancelPress,
}: {
  reserva: ReservaSummary;
  showLocal: boolean;
  onCancelPress: () => void;
}) {
  const canCancelReserva = canCancelReservaUsuarioList(reserva);
  const quandoLabel = formatReservaQuando(
    reserva,
    (timestamp) => `${formatFullDateLabel(new Date(timestamp))} · ${formatGameTime(timestamp)}`,
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.clubName}>
          {showLocal ? reserva.localNome : reserva.atividade?.trim() || 'Reserva'}
        </Text>
        {canCancelReserva ? (
          <Pressable
            style={styles.trashHeaderButton}
            onPress={onCancelPress}
            accessibilityLabel="Cancelar reserva">
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.detailLine}>{quandoLabel}</Text>
      {showLocal ? (
        <Text style={styles.detailLine}>{reserva.atividade?.trim() || 'Não informada'}</Text>
      ) : null}
      {reserva.unidadeNome?.trim() ? (
        <Text style={styles.detailLine}>Unidade: {reserva.unidadeNome.trim()}</Text>
      ) : null}
    </View>
  );
}

export default function MinhasReservasScreen() {
  const { user, authToken, isLoading: isAuthLoading } = useAuth();
  const {
    effectiveAcademiasId,
    selectableUserLocals,
    isLoading: isContextLoading,
  } = useUserContext();
  const [reservas, setReservas] = useState<ReservaSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reservaParaCancelar, setReservaParaCancelar] = useState<ReservaSummary | null>(null);
  const showLocalColumn = selectableUserLocals.length > 1;

  const loadData = useCallback(
    async (options?: { refreshing?: boolean }) => {
      if (!user?.id || !authToken || isContextLoading) {
        if (!isContextLoading) {
          setErrorMessage('Não foi possível identificar o usuário.');
          setReservas([]);
        }
        setIsLoading(isContextLoading);
        setIsRefreshing(false);
        return;
      }

      if (!effectiveAcademiasId) {
        setErrorMessage('Selecione um local prioritário para continuar.');
        setReservas([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (options?.refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage(null);

      const result = await fetchHomeSummary(user.id, authToken, effectiveAcademiasId);

      if (result.reservasError) {
        setErrorMessage(LOAD_ERROR_MESSAGE);
        setReservas([]);
      } else {
        setReservas(result.reservas);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [authToken, effectiveAcademiasId, isContextLoading, user?.id],
  );

  useEffect(() => {
    if (isAuthLoading || !user || !authToken) {
      return;
    }

    void loadData();
  }, [authToken, isAuthLoading, loadData, user]);

  if (isAuthLoading || !user) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScreenHeader user={user} title="Minhas Reservas" />
      <ScreenHeaderDivider />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadData({ refreshing: true })}
            tintColor={COLORS.blue}
            colors={[COLORS.blue]}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Reservas futuras</Text>

        {isLoading && !isRefreshing ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : errorMessage && reservas.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadData()}>
              <Text style={styles.retryText}>Tentar novamente</Text>
            </Pressable>
          </View>
        ) : reservas.length === 0 ? (
          <Text style={styles.emptyText}>{EMPTY_MESSAGE}</Text>
        ) : reservas.length > 1 ? (
          <ReservaSummaryList
            reservas={reservas}
            showLocal={false}
            canCancelReserva={canCancelReservaUsuarioList}
            onCancelPress={setReservaParaCancelar}
          />
        ) : (
          <ReservaCard
            reserva={reservas[0]}
            showLocal={showLocalColumn}
            onCancelPress={() => setReservaParaCancelar(reservas[0])}
          />
        )}
      </ScrollView>

      <CancelarReservaModal
        visible={reservaParaCancelar !== null}
        reserva={reservaParaCancelar}
        user={user}
        authToken={authToken}
        onClose={() => setReservaParaCancelar(null)}
        onSuccess={() => {
          void loadData({ refreshing: true });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 14,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.error,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.blue,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trashHeaderButton: {
    padding: 4,
  },
  cardContent: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
    flex: 1,
    marginRight: 8,
  },
  detailLine: {
    fontSize: 14,
    color: COLORS.navy,
    marginTop: 2,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.navy,
    marginTop: 2,
  },
});
