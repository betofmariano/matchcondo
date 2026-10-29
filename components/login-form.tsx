import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthButton } from '@/components/auth-button';
import { OkMessageModal } from '@/components/ok-message-modal';
import { PasswordTextField } from '@/components/password-text-field';
import { PhoneTextField } from '@/components/phone-text-field';
import { PendingRecoveryModal } from '@/components/pending-recovery-modal';
import { PrivacyPolicyLink } from '@/components/privacy-policy-link';
import { RecuperarSenhaModal } from '@/components/recuperar-senha-modal';
import { WrongPasswordModal } from '@/components/wrong-password-modal';
import { stripNonNumeric } from '@/constants/auth';
import { useAuth } from '@/contexts/auth-context';
import {
  LOGIN_TOTAL_ENCONTRADO_TITLES,
  LOGIN_UNSTABLE_MESSAGE,
  LOGIN_UNSTABLE_TITLE,
  LOGIN_WRONG_PASSWORD_MESSAGE,
  LOGIN_WRONG_PASSWORD_TITLE,
} from '@/constants/login-messages';
import {
  confirmPhoneSubmitChecks,
  getLoginValidationError,
} from '@/utils/phone-validation';
import { navigateToHome } from '@/utils/auth-navigation';
import { markPasswordLoginInstallPrompt } from '@/utils/instalar-app-login-prompt';
import { openWhatsAppSuporte, WHATSAPP_SUPORTE_OPEN_ERROR } from '@/utils/open-whatsapp-suporte';
import { BRAZILIAN_MOBILE_PHONE_DIGITS } from '@/utils/phone-mask';
import {
  clearPendingRecovery,
  getPendingRecovery,
  getResumablePendingRecovery,
  type PendingRecoveryState,
} from '@/utils/pending-recovery-storage';

type LoginFormProps = {
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
};

const LOGIN_ERROR_TITLES = {
  phone_not_found: LOGIN_TOTAL_ENCONTRADO_TITLES.phoneNotFound,
  wrong_password: LOGIN_WRONG_PASSWORD_TITLE,
  token_failed: 'Não foi possível entrar',
  blocked: 'Acesso bloqueado',
  not_approved: 'Cadastro pendente',
  generic: 'Erro no login',
} as const;

const LOGIN_ERROR_TITLE = LOGIN_ERROR_TITLES.generic;
const LOGIN_WRONG_PASSWORD_CONFIRM_ATTEMPTS = 2;

type ErrorModalState = {
  title: string;
  message: string;
  kind?: 'wrong_password' | 'login_unstable' | 'generic';
};

type PasswordFailAttempt = {
  phone: string;
  password: string;
  count: number;
};

export function LoginForm({ onSubmittingChange }: LoginFormProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryVisible, setIsRecoveryVisible] = useState(false);
  const [recoveryResume, setRecoveryResume] = useState<PendingRecoveryState | null>(null);
  const [pendingRecovery, setPendingRecovery] = useState<PendingRecoveryState | null>(null);
  const [isPendingRecoveryPromptVisible, setIsPendingRecoveryPromptVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);
  const loginInFlightRef = useRef(false);
  const passwordFailRef = useRef<PasswordFailAttempt>({
    phone: '',
    password: '',
    count: 0,
  });

  const refreshPendingRecovery = useCallback(async () => {
    const localPending = await getPendingRecovery();

    if (!localPending) {
      setPendingRecovery(null);
      return null;
    }

    const pending = await getResumablePendingRecovery(localPending.telefoneLimpo);
    setPendingRecovery(pending);
    return pending;
  }, []);

  useEffect(() => {
    void refreshPendingRecovery().then((pending) => {
      if (pending) {
        setIsPendingRecoveryPromptVisible(true);
      }
    });
  }, [refreshPendingRecovery]);

  function showLoginError(
    message: string,
    title: string = LOGIN_ERROR_TITLE,
    kind: ErrorModalState['kind'] = 'generic',
  ) {
    setErrorModal({ title, message, kind });
  }

  function closeErrorModal() {
    setErrorModal(null);
  }

  async function handleLogin(options?: { skipPhoneConfirm?: boolean }) {
    if (isSubmitting || loginInFlightRef.current) {
      return;
    }

    const validationError = getLoginValidationError(phone, password);

    if (validationError) {
      showLoginError(validationError);
      return;
    }

    loginInFlightRef.current = true;

    try {
      if (!options?.skipPhoneConfirm) {
        const phoneConfirmed = await confirmPhoneSubmitChecks(phone);

        if (!phoneConfirmed) {
          return;
        }
      }

      setIsSubmitting(true);
      onSubmittingChange?.(true);

      const result = await signIn(phone, password, {
        larguraPagina: Math.round(screenWidth),
      });

      if (result.success) {
        passwordFailRef.current = { phone: '', password: '', count: 0 };
        markPasswordLoginInstallPrompt();
        navigateToHome(router, { loginSenha: '1' });
        return;
      }

      if (result.errorCode === 'wrong_password') {
        const sameCredentials =
          passwordFailRef.current.phone === phone &&
          passwordFailRef.current.password === password;
        const failCount = sameCredentials ? passwordFailRef.current.count + 1 : 1;
        passwordFailRef.current = { phone, password, count: failCount };

        if (failCount < LOGIN_WRONG_PASSWORD_CONFIRM_ATTEMPTS) {
          showLoginError(LOGIN_UNSTABLE_MESSAGE, LOGIN_UNSTABLE_TITLE, 'login_unstable');
          return;
        }

        showLoginError(
          LOGIN_WRONG_PASSWORD_MESSAGE,
          LOGIN_WRONG_PASSWORD_TITLE,
          'wrong_password',
        );
        return;
      }

      showLoginError(
        result.error ?? 'Não foi possível concluir o login. Tente novamente.',
        LOGIN_ERROR_TITLES[result.errorCode ?? 'generic'],
      );
    } finally {
      loginInFlightRef.current = false;
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  function handleRetrySamePassword() {
    closeErrorModal();
    void handleLogin({ skipPhoneConfirm: true });
  }

  function handleForgotPassword() {
    if (isSubmitting) {
      return;
    }

    void (async () => {
      const localPending = await getPendingRecovery();
      const telefoneLimpo = localPending?.telefoneLimpo ?? stripNonNumeric(phone);

      if (telefoneLimpo.length === BRAZILIAN_MOBILE_PHONE_DIGITS) {
        const pending = await getResumablePendingRecovery(telefoneLimpo);
        setPendingRecovery(pending);

        if (pending) {
          setIsPendingRecoveryPromptVisible(true);
          return;
        }
      }

      setRecoveryResume(null);
      setIsRecoveryVisible(true);
    })();
  }

  function handleForgotPasswordFromModal() {
    closeErrorModal();
    handleForgotPassword();
  }

  function handleRecoveryClose() {
    setRecoveryResume(null);
    setIsRecoveryVisible(false);
    void refreshPendingRecovery();
  }

  async function handleContinuePendingRecovery() {
    const localPending = await getPendingRecovery();

    if (!localPending) {
      setIsPendingRecoveryPromptVisible(false);
      setPendingRecovery(null);
      return;
    }

    const pending = await getResumablePendingRecovery(localPending.telefoneLimpo);

    if (!pending) {
      setIsPendingRecoveryPromptVisible(false);
      setPendingRecovery(null);
      return;
    }

    setPendingRecovery(pending);
    setRecoveryResume(pending);
    setIsPendingRecoveryPromptVisible(false);
    setIsRecoveryVisible(true);
  }

  async function handleDiscardPendingRecovery() {
    await clearPendingRecovery();
    setPendingRecovery(null);
    setRecoveryResume(null);
    setIsPendingRecoveryPromptVisible(false);
  }

  function handleRecoveryAuthenticated() {
    navigateToHome(router);
  }

  async function handleWhatsAppSuporte() {
    if (isSubmitting) {
      return;
    }

    const opened = await openWhatsAppSuporte({
      telefone: stripNonNumeric(phone) || null,
    });

    if (!opened) {
      setErrorModal({
        title: 'WhatsApp',
        message: WHATSAPP_SUPORTE_OPEN_ERROR,
      });
    }
  }

  const isPasswordFailureModal =
    errorModal?.kind === 'wrong_password' || errorModal?.kind === 'login_unstable';
  const isUnstableLoginModal = errorModal?.kind === 'login_unstable';

  return (
    <View style={styles.form}>
      <PhoneTextField
        label="Telefone/WhatsApp"
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
        editable={!isSubmitting}
      />

      <PasswordTextField
        label="Senha"
        labelHint={
          password.length
            ? `* ${password.length} de 4 a 6 dígitos NUMÉRICOS`
            : '* de 4 a 6 dígitos NUMÉRICOS'
        }
        value={password}
        onChangeText={(value) => setPassword(stripNonNumeric(value).slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="••••••"
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
        autoCorrect={false}
        spellCheck={false}
        editable={!isSubmitting}
      />

      <AuthButton
        label="Esqueci minha senha"
        variant="actionLink"
        onPress={handleForgotPassword}
        disabled={isSubmitting}
        style={styles.forgotPasswordButton}
      />

      <AuthButton
        label={isSubmitting ? 'Entrando...' : 'Entrar'}
        onPress={() => {
          void handleLogin();
        }}
        disabled={isSubmitting}
        style={styles.submitButton}
      />

      <AuthButton
        label="Ajuda no WhatsApp"
        variant="actionLink"
        onPress={() => {
          void handleWhatsAppSuporte();
        }}
        disabled={isSubmitting}
        style={styles.whatsappButton}
      />

      <PrivacyPolicyLink />

      {isSubmitting ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={COLORS.blue} />
          <Text style={styles.loadingText}>Entrando...</Text>
        </View>
      ) : null}

      <WrongPasswordModal
        visible={isPasswordFailureModal}
        title={
          errorModal?.title ??
          (isUnstableLoginModal ? LOGIN_UNSTABLE_TITLE : LOGIN_WRONG_PASSWORD_TITLE)
        }
        message={
          errorModal?.message ??
          (isUnstableLoginModal ? LOGIN_UNSTABLE_MESSAGE : LOGIN_WRONG_PASSWORD_MESSAGE)
        }
        primaryLabel={isUnstableLoginModal ? 'Tentar novamente' : 'Esqueci minha senha'}
        secondaryLabel={isUnstableLoginModal ? 'Esqueci minha senha' : 'Tentar novamente'}
        onPrimary={isUnstableLoginModal ? handleRetrySamePassword : handleForgotPasswordFromModal}
        onSecondary={isUnstableLoginModal ? handleForgotPasswordFromModal : closeErrorModal}
      />

      <OkMessageModal
        visible={errorModal != null && !isPasswordFailureModal}
        title={errorModal?.title ?? LOGIN_ERROR_TITLE}
        message={errorModal?.message ?? ''}
        onClose={closeErrorModal}
      />

      <PendingRecoveryModal
        visible={isPendingRecoveryPromptVisible}
        pendingRecovery={pendingRecovery}
        onContinue={() => void handleContinuePendingRecovery()}
        onDiscard={() => void handleDiscardPendingRecovery()}
      />

      <RecuperarSenhaModal
        visible={isRecoveryVisible}
        onClose={handleRecoveryClose}
        initialPhone={phone}
        resumeRecovery={recoveryResume}
        onAuthenticated={handleRecoveryAuthenticated}
        onPendingRecoveryChange={() => {
          void refreshPendingRecovery();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    alignItems: 'center',
  },
  forgotPasswordButton: {
    marginTop: -4,
    marginBottom: 12,
  },
  submitButton: {
    marginBottom: 8,
  },
  whatsappButton: {
    marginBottom: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
});
