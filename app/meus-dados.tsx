import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AlterarSenhaModal } from '@/components/alterar-senha-modal';
import { ChangePhotoModal } from '@/components/change-photo-modal';
import { MeusDadosForm } from '@/components/meus-dados-form';
import { ScreenHeader, ScreenHeaderDivider } from '@/components/screen-header';
import { WebScreenContainer } from '@/components/web-screen-container';
import { WEB_MAX_CONTENT_WIDTH } from '@/constants/web-layout';
import { MATCHPOINT_COLORS } from '@/constants/theme';
import { useAppDialog } from '@/contexts/app-dialog-context';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import { useUserContext } from '@/contexts/user-context';
import { useMeusDadosScreen } from '@/hooks/use-meus-dados-screen';
import { getApiErrorMessage } from '@/services/api-client';
import { excluirContaDoUsuario } from '@/services/user-service';
import { MEUS_DADOS_MESSAGES } from '@/utils/meus-dados';

const COLORS = {
  background: MATCHPOINT_COLORS.background,
  blue: MATCHPOINT_COLORS.blue,
};

export default function MeusDadosScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { confirm } = useAppDialog();
  const { user, authToken, isLoading: isAuthLoading, signOut } = useAuth();
  const { isLoading: isUserContextLoading } = useUserContext();

  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isExcluindoConta, setIsExcluindoConta] = useState(false);

  const {
    nome,
    telefone,
    matricula,
    complemento,
    complementoRegistrado,
    showComplementoField,
    photoPreviewUri,
    nomeError,
    telefoneError,
    complementoError,
    isSubmitting,
    hasChanges,
    handleNomeChange,
    handleTelefoneChange,
    handleComplementoChange,
    submitSolicitacoes,
  } = useMeusDadosScreen({ user, authToken });

  function navigateBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  async function handleCancel() {
    if (isSubmitting) {
      return;
    }

    if (!hasChanges) {
      navigateBack();
      return;
    }

    const confirmed = await confirm({
      title: MEUS_DADOS_MESSAGES.unsavedTitle,
      message: MEUS_DADOS_MESSAGES.unsavedMessage,
      cancelLabel: 'Continuar editando',
      confirmLabel: 'Sair sem enviar',
      destructive: true,
    });

    if (confirmed) {
      navigateBack();
    }
  }

  async function handleExcluirConta() {
    if (!user || !authToken || isSubmitting || isExcluindoConta) {
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir conta',
      message:
        'Sua conta será excluída e você não poderá mais entrar no MatchCondo. Essa ação não pode ser desfeita.',
      cancelLabel: 'Cancelar',
      confirmLabel: 'Excluir conta',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    setIsExcluindoConta(true);

    try {
      await excluirContaDoUsuario(user.id, authToken);
      await signOut();
      router.replace('/login');
    } catch (error) {
      showToast(getApiErrorMessage(error) || 'Não foi possível excluir sua conta. Tente novamente.', {
        variant: 'error',
      });
      setIsExcluindoConta(false);
    }
  }

  async function handleConfirm() {
    const result = await submitSolicitacoes();

    if (!result.success) {
      showToast(result.message, { variant: 'error' });
      return;
    }

    showToast(result.message, { variant: 'success' });
    navigateBack();
  }

  if (isAuthLoading || isUserContextLoading || !user) {
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
        <ScreenHeader user={user} title={'Editar seus\ndados'} />
        <ScreenHeaderDivider />

        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <MeusDadosForm
              nome={nome}
              telefone={telefone}
              matricula={matricula}
              complemento={complemento}
              complementoRegistrado={complementoRegistrado}
              showComplementoField={showComplementoField}
              photoPreviewUri={photoPreviewUri}
              nomeError={nomeError}
              telefoneError={telefoneError}
              complementoError={complementoError}
              isSubmitting={isSubmitting}
              canConfirm={hasChanges}
              onNomeChange={handleNomeChange}
              onTelefoneChange={handleTelefoneChange}
              onComplementoChange={handleComplementoChange}
              onPhotoPress={() => setIsPhotoModalVisible(true)}
              onAlterarSenhaPress={() => setIsPasswordModalVisible(true)}
              onExcluirContaPress={() => void handleExcluirConta()}
              isExcluindoConta={isExcluindoConta}
              onCancel={handleCancel}
              onConfirm={() => void handleConfirm()}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <ChangePhotoModal
          visible={isPhotoModalVisible}
          onClose={() => setIsPhotoModalVisible(false)}
        />
      </WebScreenContainer>

      <AlterarSenhaModal
        visible={isPasswordModalVisible}
        onClose={() => setIsPasswordModalVisible(false)}
        onSuccess={(message) => showToast(message, { variant: 'success' })}
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
  screenContainer: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    minHeight: 160,
  },
});
