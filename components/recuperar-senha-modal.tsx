import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { APP_DISPLAY_NAME } from '@/constants/app-branding';
import { AuthTextField } from '@/components/auth-text-field';
import { PasswordTextField } from '@/components/password-text-field';
import { PhoneTextField } from '@/components/phone-text-field';
import {
  isValidNumericPassword,
  isValidRecoveryCode,
  RECOVERY_CODE_LENGTH,
  sanitizeRecoveryCode,
  stripNonNumeric,
} from '@/constants/auth';
import { useAppToast } from '@/contexts/app-toast-context';
import { useAuth } from '@/contexts/auth-context';
import {
  alterarSenhaRecuperacao,
  getPasswordRecoveryErrorMessage,
  solicitarRecuperacao,
  validarRecuperacao,
} from '@/services/auth-service';
import { BRAZILIAN_MOBILE_PHONE_DIGITS, formatBrazilianMobilePhone } from '@/utils/phone-mask';
import {
  clearPendingRecovery,
  savePendingRecovery,
  type PendingRecoveryState,
} from '@/utils/pending-recovery-storage';

type RecoveryStep = 'phone' | 'code' | 'password';

type RecuperarSenhaModalProps = {
  visible: boolean;
  onClose: () => void;
  initialPhone?: string;
  resumeRecovery?: PendingRecoveryState | null;
  onAuthenticated: () => void;
  onPendingRecoveryChange?: () => void;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  white: '#FFFFFF',
  error: '#D64545',
  muted: '#5C6475',
};

function validatePhoneInput(phone: string): string | null {
  const trimmedPhone = phone.trim();

  if (!trimmedPhone) {
    return 'Informe seu telefone/WhatsApp.';
  }

  const telefoneLimpo = stripNonNumeric(trimmedPhone);

  if (telefoneLimpo.length !== BRAZILIAN_MOBILE_PHONE_DIGITS) {
    return 'Informe um telefone válido com DDD.';
  }

  return null;
}

function validatePasswordFields(password: string, confirmPassword: string): string | null {
  if (!password.trim()) {
    return 'Informe a nova senha.';
  }

  if (!confirmPassword.trim()) {
    return 'Confirme a nova senha.';
  }

  if (!isValidNumericPassword(password)) {
    return 'A senha deve ter de 4 a 6 dígitos numéricos.';
  }

  if (password !== confirmPassword) {
    return 'As senhas não coincidem.';
  }

  return null;
}

export function RecuperarSenhaModal({
  visible,
  onClose,
  initialPhone = '',
  resumeRecovery = null,
  onAuthenticated,
  onPendingRecoveryChange,
}: RecuperarSenhaModalProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { signIn } = useAuth();
  const { showToast } = useAppToast();
  const [step, setStep] = useState<RecoveryStep>('phone');
  const [phone, setPhone] = useState('');
  const [telefoneLimpo, setTelefoneLimpo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function notifyPendingRecoveryChange() {
    onPendingRecoveryChange?.();
  }

  function clearSensitiveState() {
    setTelefoneLimpo('');
    setCodigo('');
    setNovaSenha('');
    setConfirmPassword('');
    setErrorMessage(null);
  }

  function resetFlow() {
    setStep('phone');
    setPhone('');
    clearSensitiveState();
  }

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (resumeRecovery) {
      setStep('code');
      setTelefoneLimpo(resumeRecovery.telefoneLimpo);
      setPhone(formatBrazilianMobilePhone(resumeRecovery.telefoneLimpo));
      setCodigo('');
      setNovaSenha('');
      setConfirmPassword('');
      setErrorMessage(null);
      return;
    }

    setStep('phone');
    setPhone(initialPhone);
    clearSensitiveState();
  }, [visible, initialPhone, resumeRecovery?.telefoneLimpo, resumeRecovery?.requestedAt]);

  function handleDismiss() {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    resetFlow();
    notifyPendingRecoveryChange();
    onClose();
  }

  async function handleSendCode() {
    if (isSubmitting) {
      return;
    }

    const validationError = validatePhoneInput(phone);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const normalizedPhone = stripNonNumeric(phone);

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const message = await solicitarRecuperacao(normalizedPhone);
      await savePendingRecovery(normalizedPhone);
      notifyPendingRecoveryChange();
      setTelefoneLimpo(normalizedPhone);
      setCodigo('');
      setStep('code');
      showToast(message, { variant: 'success' });
    } catch (error) {
      setErrorMessage(getPasswordRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleValidateCode() {
    if (isSubmitting || !telefoneLimpo) {
      return;
    }

    const sanitizedCode = sanitizeRecoveryCode(codigo);

    if (!sanitizedCode) {
      setErrorMessage(`Digite o código de recuperação de ${RECOVERY_CODE_LENGTH} dígitos.`);
      return;
    }

    if (!isValidRecoveryCode(sanitizedCode)) {
      setErrorMessage(`O código de recuperação deve ter ${RECOVERY_CODE_LENGTH} dígitos.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await validarRecuperacao(telefoneLimpo, sanitizedCode);

      if (!result.valido) {
        setErrorMessage(result.message ?? 'Código inválido. Tente novamente.');
        return;
      }

      setCodigo(sanitizedCode);
      setNovaSenha('');
      setConfirmPassword('');
      await clearPendingRecovery();
      notifyPendingRecoveryChange();
      setStep('password');
    } catch (error) {
      setErrorMessage(getPasswordRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleChangePassword() {
    if (isSubmitting || !telefoneLimpo || !codigo) {
      return;
    }

    const validationError = validatePasswordFields(novaSenha, confirmPassword);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await alterarSenhaRecuperacao(telefoneLimpo, codigo, novaSenha);

      const formattedPhone = formatBrazilianMobilePhone(telefoneLimpo);
      const loginResult = await signIn(formattedPhone, novaSenha, {
        larguraPagina: Math.round(screenWidth),
      });

      await clearPendingRecovery();
      notifyPendingRecoveryChange();
      resetFlow();
      onClose();

      if (loginResult.success) {
        showToast('Senha alterada com sucesso. Entrando na sua conta...', {
          variant: 'success',
          duration: 4000,
        });
        onAuthenticated();
        return;
      }

      showToast(
        'Senha alterada com sucesso. Faça login com sua nova senha.',
        { variant: 'success', duration: 5000 },
      );
    } catch (error) {
      setErrorMessage(getPasswordRecoveryErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBackFromCode() {
    if (isSubmitting) {
      return;
    }

    await clearPendingRecovery();
    notifyPendingRecoveryChange();
    setStep('phone');
    setTelefoneLimpo('');
    setCodigo('');
    setErrorMessage(null);
  }

  function handleBackFromPassword() {
    if (isSubmitting) {
      return;
    }

    setStep('code');
    setNovaSenha('');
    setConfirmPassword('');
    setErrorMessage(null);
  }

  function renderStepLabel(stepNumber: 1 | 2 | 3) {
    return <Text style={styles.stepLabel}>Passo {stepNumber} de 3</Text>;
  }

  function renderPhoneStep() {
    return (
      <>
        {renderStepLabel(1)}
        <Text style={styles.title}>Recuperar senha</Text>
        <Text style={styles.description}>
          Informe o telefone cadastrado no {APP_DISPLAY_NAME}. Enviaremos um código de recuperação por
          WhatsApp para confirmar sua identidade antes de alterar a senha.
        </Text>

        <PhoneTextField
          label="Telefone"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          editable={!isSubmitting}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthButton
          label={isSubmitting ? 'Enviando...' : 'Enviar código'}
          onPress={handleSendCode}
          disabled={isSubmitting}
          style={styles.primaryButton}
        />

        <AuthButton
          label="Cancelar"
          variant="link"
          onPress={handleDismiss}
          disabled={isSubmitting}
        />
      </>
    );
  }

  function renderCodeStep() {
    const phoneLabel = telefoneLimpo ? formatBrazilianMobilePhone(telefoneLimpo) : '';

    return (
      <>
        {renderStepLabel(2)}
        <Text style={styles.title}>Código de recuperação</Text>
        <Text style={styles.description}>
          {phoneLabel
            ? `Enviamos um código de ${RECOVERY_CODE_LENGTH} dígitos para o WhatsApp ${phoneLabel}.`
            : `Enviamos um código de ${RECOVERY_CODE_LENGTH} dígitos para o seu WhatsApp.`}
        </Text>
        <Text style={styles.infoText}>
          Este código confirma sua identidade. Ele não é sua senha e não será usado para entrar no
          app. Você pode voltar depois — o código vale por 1 hora.
        </Text>

        <View style={styles.codeFieldWrapper}>
          <AuthTextField
            label="Código de recuperação"
            value={codigo}
            onChangeText={(value) => setCodigo(sanitizeRecoveryCode(value))}
            keyboardType="number-pad"
            maxLength={RECOVERY_CODE_LENGTH}
            placeholder="0000"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            editable={!isSubmitting}
            style={styles.codeInput}
          />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthButton
          label={isSubmitting ? 'Validando...' : 'Confirmar código'}
          onPress={handleValidateCode}
          disabled={isSubmitting}
          style={styles.primaryButton}
        />

        <AuthButton
          label="Voltar"
          variant="voltar"
          onPress={handleBackFromCode}
          disabled={isSubmitting}
          style={styles.voltarButton}
        />
      </>
    );
  }

  function renderPasswordStep() {
    return (
      <>
        {renderStepLabel(3)}
        <Text style={styles.title}>Alterar senha</Text>
        <Text style={styles.description}>
          Código confirmado. Agora crie uma nova senha de acesso para sua conta {APP_DISPLAY_NAME}.
        </Text>
        <Text style={styles.infoText}>
          Após salvar, entraremos automaticamente na sua conta — você não precisará fazer login
          novamente.
        </Text>

        <PasswordTextField
          label="Nova senha"
          labelHint="* de 4 a 6 dígitos NUMÉRICOS"
          value={novaSenha}
          onChangeText={setNovaSenha}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••••"
          editable={!isSubmitting}
        />

        <PasswordTextField
          label="Confirmar nova senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••••"
          editable={!isSubmitting}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <AuthButton
          label={isSubmitting ? 'Salvando e entrando...' : 'Salvar senha e entrar'}
          onPress={handleChangePassword}
          disabled={isSubmitting}
          style={styles.primaryButton}
        />

        <AuthButton
          label="Voltar"
          variant="voltar"
          onPress={handleBackFromPassword}
          disabled={isSubmitting}
          style={styles.voltarButton}
        />
      </>
    );
  }

  function renderStepContent() {
    if (step === 'code' && !telefoneLimpo) {
      return renderPhoneStep();
    }

    if (step === 'password' && !codigo) {
      return renderCodeStep();
    }

    switch (step) {
      case 'phone':
        return renderPhoneStep();
      case 'code':
        return renderCodeStep();
      case 'password':
        return renderPasswordStep();
      default:
        return renderPhoneStep();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} disabled={isSubmitting} />

        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {renderStepContent()}

            {isSubmitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={COLORS.blue} />
                <Text style={styles.loadingText}>Aguarde...</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    zIndex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.blue,
    textAlign: 'center',
    marginBottom: 6,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  description: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    width: '100%',
  },
  infoText: {
    width: '100%',
    fontSize: 14,
    color: COLORS.navy,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    backgroundColor: '#EEF4FC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  codeFieldWrapper: {
    width: '100%',
    maxWidth: 240,
    alignSelf: 'center',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 4,
  },
  errorText: {
    width: '100%',
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    marginBottom: 12,
  },
  voltarButton: {
    marginTop: 8,
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
