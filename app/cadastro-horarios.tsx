import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CadastroHorariosForm } from '@/components/cadastro-horarios-form';
import { ExcluirCadastroModal } from '@/components/excluir-cadastro-modal';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { WebScreenContainer } from '@/components/web-screen-container';
import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useCadastroHorariosScreen } from '@/hooks/use-cadastro-horarios-screen';
import type { Horario } from '@/types/horario';
import { CLUB_ADMIN_MESSAGES } from '@/utils/club-config';

const COLORS = {
  background: MATCHPOINT_COLORS.background,
  blue: MATCHPOINT_COLORS.blue,
  navy: MATCHPOINT_COLORS.navy,
  border: MATCHPOINT_COLORS.borderLight,
  error: MATCHPOINT_COLORS.error,
  muted: MATCHPOINT_COLORS.muted,
  white: MATCHPOINT_COLORS.white,
  readOnlyBackground: MATCHPOINT_COLORS.readOnlyBackground,
};

export default function CadastroHorariosScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { confirm } = useAppDialog();
  const { user, authToken, isLoading: isAuthLoading, signOut } = useAuth();

  const [horarioToDelete, setHorarioToDelete] = useState<Horario | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(async () => {
    await signOut();
    router.replace('/login');
  }, [router, signOut]);

  const {
    availableClubs,
    selectedClubId,
    atividades,
    selectedAtividadeId,
    isLoadingAtividades,
    atividadesLoadError,
    horaValue,
    minutosValue,
    diasSemana,
    fieldErrors,
    horarios,
    showListPanel,
    isLoadingClubs,
    clubsLoadError,
    isLoadingClub,
    clubLoadError,
    isLoadingItems,
    itemsLoadError,
    isRefreshing,
    isSaving,
    isDeleting,
    isAdministrador,
    canManageSelectedClub,
    showClubSelector,
    loadedClub,
    hasUnsavedInput,
    setSelectedAtividadeId,
    setShowListPanel,
    setSelectedClubId,
    handleHoraChange,
    handleMinutosChange,
    handleToggleDia,
    fetchAvailableClubs,
    fetchClubDetails,
    fetchAtividades,
    fetchHorarios,
    saveHorario,
    removeHorario,
    formatHorarioListLabel,
    messages,
  } = useCadastroHorariosScreen({
    user,
    authToken,
    isAuthLoading,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (isAuthLoading || !user || isLoadingClubs) {
      return;
    }

    if (!isAdministrador && availableClubs.length === 0 && !clubsLoadError) {
      showToast(CLUB_ADMIN_MESSAGES.permission, { variant: 'error' });
      router.replace('/');
    }
  }, [
    availableClubs.length,
    clubsLoadError,
    isAdministrador,
    isAuthLoading,
    isLoadingClubs,
    router,
    showToast,
    user,
  ]);

  useEffect(() => {
    if (!clubLoadError || clubLoadError === CLUB_ADMIN_MESSAGES.loadError) {
      return;
    }

    if (clubLoadError === CLUB_ADMIN_MESSAGES.permission) {
      showToast(clubLoadError, { variant: 'error' });
      router.replace('/');
    }
  }, [clubLoadError, router, showToast]);

  function navigateBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  async function handleCancel() {
    if (isSaving || isDeleting) {
      return;
    }

    if (!hasUnsavedInput) {
      navigateBack();
      return;
    }

    const confirmed = await confirm({
      title: CLUB_ADMIN_MESSAGES.unsavedTitle,
      message: CLUB_ADMIN_MESSAGES.unsavedMessage,
      cancelLabel: 'Continuar editando',
      confirmLabel: 'Sair',
      destructive: true,
    });

    if (confirmed) {
      navigateBack();
    }
  }

  async function handleSave() {
    const error = await saveHorario();

    if (error) {
      showToast(error, { variant: 'error' });
      return;
    }

    showToast(messages.saveSuccess, { variant: 'success' });
  }

  function handleDeletePress(item: Horario) {
    setDeleteError(null);
    setHorarioToDelete(item);
  }

  async function handleConfirmDelete() {
    if (!horarioToDelete) {
      return;
    }

    const error = await removeHorario(horarioToDelete);

    if (error) {
      setDeleteError(error);
      return;
    }

    setHorarioToDelete(null);
    showToast(messages.deleteSuccess, { variant: 'success' });
  }

  const isBaseFormDisabled =
    isLoadingClub ||
    isLoadingClubs ||
    !canManageSelectedClub ||
    isSaving ||
    isDeleting;

  const isAtividadeSelectorDisabled =
    isBaseFormDisabled || isLoadingAtividades || selectedClubId == null;

  const isScheduleFieldsDisabled =
    isBaseFormDisabled || isLoadingAtividades || !selectedAtividadeId;

  const showContent =
    !isLoadingClub && !clubLoadError && canManageSelectedClub && selectedClubId != null;

  const canSave = useMemo(
    () =>
      Boolean(selectedAtividadeId) &&
      horaValue.trim().length > 0 &&
      minutosValue.trim().length > 0 &&
      Object.values(diasSemana).some(Boolean),
    [diasSemana, horaValue, minutosValue, selectedAtividadeId],
  );

  if (isAuthLoading || !user) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'left', 'right']}>
        <WebScreenContainer maxWidth={WEB_MAX_CONTENT_WIDTH}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        </WebScreenContainer>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <WebScreenContainer maxWidth={WEB_MAX_CONTENT_WIDTH} style={styles.screenContainer}>
        <ScreenHeader user={user} title={'Cadastro de\nHorários'} />
        <ScreenHeaderDivider />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            showContent && selectedAtividadeId ? (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => void fetchHorarios({ refreshing: true })}
                tintColor={COLORS.blue}
                colors={[COLORS.blue]}
              />
            ) : undefined
          }>
          {isLoadingClubs ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={COLORS.blue} />
            </View>
          ) : null}

          {clubsLoadError ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>{clubsLoadError}</Text>
              <Pressable style={styles.retryButton} onPress={() => void fetchAvailableClubs()}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : null}

          {isLoadingClub ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={COLORS.blue} />
            </View>
          ) : null}

          {clubLoadError === CLUB_ADMIN_MESSAGES.loadError ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>{clubLoadError}</Text>
              {selectedClubId ? (
                <Pressable
                  style={styles.retryButton}
                  onPress={() => void fetchClubDetails(selectedClubId)}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {!isLoadingClubs && !clubsLoadError ? (
            <>
              <CadastroHorariosForm
                availableClubs={availableClubs}
                selectedClubId={selectedClubId}
                onClubChange={setSelectedClubId}
                isLoadingClubs={isLoadingClubs}
                clubsLoadError={clubsLoadError}
                onRetryClubs={() => void fetchAvailableClubs()}
                showClubSelector={showClubSelector}
                localNome={loadedClub?.nome ?? null}
                showFormFields={showContent}
                atividades={atividades}
                selectedAtividadeId={selectedAtividadeId}
                onAtividadeChange={setSelectedAtividadeId}
                isLoadingAtividades={isLoadingAtividades}
                atividadesLoadError={atividadesLoadError}
                onRetryAtividades={() => void fetchAtividades()}
                horaValue={horaValue}
                minutosValue={minutosValue}
                onHoraChange={handleHoraChange}
                onMinutosChange={handleMinutosChange}
                diasSemana={diasSemana}
                onToggleDia={handleToggleDia}
                fieldErrors={fieldErrors}
                atividadeSelectorDisabled={isAtividadeSelectorDisabled}
                localSelectorDisabled={isSaving || isDeleting}
                disabled={isScheduleFieldsDisabled}
              />

              {showContent && showListPanel && selectedAtividadeId ? (
                <View style={styles.listSection}>
                  <Text style={styles.listTitle}>Horários cadastrados</Text>

                  {isLoadingItems ? (
                    <View style={styles.centerContent}>
                      <ActivityIndicator size="large" color={COLORS.blue} />
                    </View>
                  ) : itemsLoadError ? (
                    <View style={styles.centerContent}>
                      <Text style={styles.errorText}>{itemsLoadError}</Text>
                      <Pressable style={styles.retryButton} onPress={() => void fetchHorarios()}>
                        <Text style={styles.retryText}>Tentar novamente</Text>
                      </Pressable>
                    </View>
                  ) : horarios.length === 0 ? (
                    <Text style={styles.emptyText}>{messages.emptyList}</Text>
                  ) : (
                    horarios.map((item) => (
                      <View key={item.id} style={styles.row}>
                        <Text style={styles.rowLabel}>{formatHorarioListLabel(item)}</Text>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDeletePress(item)}
                          disabled={isDeleting || isSaving}
                          accessibilityLabel="Excluir horário">
                          <Ionicons name="trash-outline" size={18} color={COLORS.blue} />
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        {showContent ? (
          <View style={styles.footer}>
            <Pressable
              style={[styles.footerButton, styles.backButton]}
              onPress={handleCancel}
              disabled={isSaving || isDeleting}>
              <Ionicons name="arrow-back" size={18} color={COLORS.navy} />
              <Text style={styles.backButtonText}>Voltar</Text>
            </Pressable>

            <Pressable
              style={[
                styles.footerButton,
                styles.saveButton,
                (!canSave || isSaving || isDeleting) && styles.footerButtonDisabled,
              ]}
              onPress={() => void handleSave()}
              disabled={!canSave || isSaving || isDeleting}>
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Salvar</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.iconButton, showListPanel && styles.iconButtonActive]}
              onPress={() => setShowListPanel((current) => !current)}
              disabled={!selectedAtividadeId}
              accessibilityLabel="Mostrar horários cadastrados">
              <Ionicons
                name="grid-outline"
                size={22}
                color={showListPanel ? COLORS.white : COLORS.navy}
              />
            </Pressable>
          </View>
        ) : null}

        <ExcluirCadastroModal
          visible={horarioToDelete != null}
          title="Excluir horário"
          message="Deseja realmente excluir este horário?"
          isDeleting={isDeleting}
          errorMessage={deleteError}
          onClose={() => {
            if (!isDeleting) {
              setHorarioToDelete(null);
              setDeleteError(null);
            }
          }}
          onConfirm={() => void handleConfirmDelete()}
        />
      </WebScreenContainer>
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
  screenContainer: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    minHeight: 120,
  },
  listSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
    textAlign: 'left',
    paddingRight: 12,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.muted,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 24,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  footerButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  backButton: {
    backgroundColor: MATCHPOINT_COLORS.voltarButtonBackground,
  },
  saveButton: {
    backgroundColor: COLORS.blue,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.readOnlyBackground,
  },
  iconButtonActive: {
    backgroundColor: COLORS.blue,
  },
});
