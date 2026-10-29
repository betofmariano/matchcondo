import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AcademiaSelector } from '@/components/academia-selector';
import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-text-field';
import { OkMessageModal } from '@/components/ok-message-modal';
import { PasswordTextField } from '@/components/password-text-field';
import { PhoneTextField } from '@/components/phone-text-field';
import { PhotoSourceModal } from '@/components/photo-source-modal';
import { PrivacyPolicyLink } from '@/components/privacy-policy-link';
import { useAuth } from '@/contexts/auth-context';
import {
  CLUB_SELECTION_MODAL_LARGE_SCREEN_BREAKPOINT,
  HOME_MAX_BUTTON_WIDTH,
} from '@/constants/web-layout';
import { ASSOCIACAO_LOCAL_LABELS } from '@/constants/associacao-local-labels';
import { getAcademias } from '@/services/academias-service';
import type { Academia } from '@/types/academia';
import type { SignupPhotoAsset } from '@/types/signup';
import {
  confirmPhoneSubmitChecks,
  getSignupValidationError,
  SIGNUP_VALIDATION_MESSAGES,
} from '@/utils/phone-validation';
import { navigateToHome } from '@/utils/auth-navigation';
import { openWhatsAppSuporte, WHATSAPP_SUPORTE_OPEN_ERROR } from '@/utils/open-whatsapp-suporte';

type SignupFormProps = {
  onSubmittingChange?: (isSubmitting: boolean) => void;
};

type ErrorModalState = {
  title: string;
  message: string;
};

const COLORS = {
  navy: '#3A2154',
  blue: '#0F7A6C',
  muted: '#5C6475',
};

const SIGNUP_ERROR_TITLE = 'Erro no cadastro';
const ASSOCIACOES_ERROR_MESSAGE = ASSOCIACAO_LOCAL_LABELS.erroCarregar;

export function SignupForm({ onSubmittingChange }: SignupFormProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [academiasId, setAcademiasId] = useState<number | null>(null);
  const [matricula, setMatricula] = useState('');
  const [endereco, setEndereco] = useState('');
  const [photoAsset, setPhotoAsset] = useState<SignupPhotoAsset | null>(null);
  const [academias, setAcademias] = useState<Academia[]>([]);
  const [isLoadingAcademias, setIsLoadingAcademias] = useState(true);
  const [academiasError, setAcademiasError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotoModalVisible, setIsPhotoModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<ErrorModalState | null>(null);

  function showSignupError(message: string, title: string = SIGNUP_ERROR_TITLE) {
    setErrorModal({ title, message });
  }

  function closeErrorModal() {
    setErrorModal(null);
  }

  const loadAcademias = useCallback(async () => {
    setIsLoadingAcademias(true);
    setAcademiasError(null);

    try {
      const data = await getAcademias();
      setAcademias(data);
    } catch {
      setAcademias([]);
      setAcademiasError(ASSOCIACOES_ERROR_MESSAGE);
    } finally {
      setIsLoadingAcademias(false);
    }
  }, []);

  useEffect(() => {
    void loadAcademias();
  }, [loadAcademias]);

  const selectedAcademia = useMemo(
    () => academias.find((academia) => academia.id === academiasId) ?? null,
    [academiasId, academias],
  );
  const requiresMatricula = selectedAcademia?.tituloSocio === true;
  const requiresComplemento = selectedAcademia?.complemento === true;
  const useCompactLayout = screenWidth >= CLUB_SELECTION_MODAL_LARGE_SCREEN_BREAKPOINT;

  const signupValidationParams = useMemo(
    () => ({
      name,
      phone,
      password,
      confirmPassword,
      academiasId,
      hasPhoto: Boolean(photoAsset),
      requiresMatricula,
      matricula,
      requiresComplemento,
      endereco,
    }),
    [
      name,
      phone,
      password,
      confirmPassword,
      academiasId,
      photoAsset,
      requiresMatricula,
      matricula,
      requiresComplemento,
      endereco,
    ],
  );

  function handleAcademiaChange(nextAcademiasId: number) {
    setAcademiasId(nextAcademiasId);

    const nextAcademia = academias.find((academia) => academia.id === nextAcademiasId);

    if (!nextAcademia?.tituloSocio) {
      setMatricula('');
    }

    if (!nextAcademia?.complemento) {
      setEndereco('');
    }
  }

  async function handleCreateAccount() {
    if (isSubmitting) {
      return;
    }

    let academiasForValidation = academias;

    try {
      academiasForValidation = await getAcademias();
      setAcademias(academiasForValidation);
    } catch {
      // Usa a lista já carregada se o refresh falhar.
    }

    const academia = academiasForValidation.find((item) => item.id === academiasId) ?? null;
    const requiresMatriculaNow = academia?.tituloSocio === true;
    const requiresComplementoNow = academia?.complemento === true;

    const validationError = getSignupValidationError({
      ...signupValidationParams,
      requiresMatricula: requiresMatriculaNow,
      requiresComplemento: requiresComplementoNow,
    });

    if (validationError) {
      if (validationError === SIGNUP_VALIDATION_MESSAGES.matriculaRequired) {
        showSignupError(
          SIGNUP_VALIDATION_MESSAGES.matriculaRequiredMessage,
          SIGNUP_VALIDATION_MESSAGES.matriculaRequiredTitle,
        );
        return;
      }

      if (validationError === SIGNUP_VALIDATION_MESSAGES.enderecoRequired) {
        showSignupError(
          SIGNUP_VALIDATION_MESSAGES.enderecoRequiredMessage,
          SIGNUP_VALIDATION_MESSAGES.enderecoRequiredTitle,
        );
        return;
      }

      showSignupError(validationError);
      return;
    }

    const phoneConfirmed = await confirmPhoneSubmitChecks(phone);

    if (!phoneConfirmed) {
      return;
    }

    setIsSubmitting(true);
    onSubmittingChange?.(true);

    try {
      const result = await signUp(
        {
          name,
          phone,
          password,
          confirmPassword,
          academiasId,
          photoAsset,
          matricula,
          requiresMatricula: requiresMatriculaNow,
          endereco,
          requiresComplemento: requiresComplementoNow,
        },
        { larguraPagina: Math.round(screenWidth) },
      );

      if (result.success) {
        navigateToHome(router);
        return;
      }

      const errorMessage =
        result.error ?? 'Não foi possível concluir o cadastro. Tente novamente.';
      showSignupError(errorMessage);
    } finally {
      setIsSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  function handleOpenPhotoOptions() {
    if (isSubmitting) {
      return;
    }

    setIsPhotoModalVisible(true);
  }

  return (
    <>
      <View style={[styles.form, useCompactLayout && styles.formCompact]}>
        <AuthTextField
          label="Nome"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Seu nome e sobrenome"
          editable={!isSubmitting}
        />

        <PhoneTextField
          label="Telefone/WhatsApp"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          editable={!isSubmitting}
        />

        <PasswordTextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••••"
          editable={!isSubmitting}
        />

        <PasswordTextField
          label="Confirmar senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="••••••"
          editable={!isSubmitting}
        />

        <Text style={styles.passwordHint}>* de 4 a 6 dígitos NUMÉRICOS</Text>

        <AcademiaSelector
          academias={academias}
          value={academiasId}
          onChange={handleAcademiaChange}
          isLoading={isLoadingAcademias}
          error={academiasError}
          onRetry={loadAcademias}
          disabled={isSubmitting}
        />

        {requiresMatricula ? (
          <AuthTextField
            label="Matrícula"
            value={matricula}
            onChangeText={setMatricula}
            autoCapitalize="characters"
            placeholder="Número da matrícula"
            editable={!isSubmitting}
          />
        ) : null}

        {requiresComplemento ? (
          <>
            <AuthTextField
              label="Endereço"
              value={endereco}
              onChangeText={setEndereco}
              autoCapitalize="sentences"
              editable={!isSubmitting}
            />
            <Text style={styles.enderecoOrientacao}>
              {ASSOCIACAO_LOCAL_LABELS.enderecoOrientacao}
            </Text>
          </>
        ) : null}

        <Pressable
          style={styles.photoArea}
          onPress={handleOpenPhotoOptions}
          disabled={isSubmitting}>
          {photoAsset ? (
            <>
              <Image
                source={{ uri: photoAsset.uri }}
                style={styles.photoPreview}
                resizeMode="cover"
              />
              <Text style={styles.photoText}>Toque para trocar sua foto</Text>
            </>
          ) : (
            <>
              <Ionicons name="camera-outline" size={36} color={COLORS.blue} />
              <Text style={styles.photoText}>Toque para inserir sua foto</Text>
            </>
          )}
        </Pressable>

        <AuthButton
          label={isSubmitting ? 'Criando conta...' : 'Criar conta'}
          onPress={handleCreateAccount}
          disabled={isSubmitting}
          style={styles.submitButton}
        />

        <AuthButton
          label="Ajuda no WhatsApp"
          variant="actionLink"
          onPress={() => {
            void (async () => {
              const clube = academias.find((item) => item.id === academiasId)?.nome;
              const opened = await openWhatsAppSuporte({
                clube,
                nome: name,
              });

              if (!opened) {
                showSignupError(WHATSAPP_SUPORTE_OPEN_ERROR, 'WhatsApp');
              }
            })();
          }}
          disabled={isSubmitting}
        />

        <PrivacyPolicyLink />

        {isSubmitting ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.blue} />
            <Text style={styles.loadingText}>Criando sua conta...</Text>
          </View>
        ) : null}
      </View>

      <OkMessageModal
        visible={errorModal != null}
        title={errorModal?.title ?? SIGNUP_ERROR_TITLE}
        message={errorModal?.message ?? ''}
        onClose={closeErrorModal}
      />

      <PhotoSourceModal
        visible={isPhotoModalVisible}
        onClose={() => setIsPhotoModalVisible(false)}
        onPhotoSelected={setPhotoAsset}
        disabled={isSubmitting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    alignItems: 'center',
  },
  formCompact: {
    maxWidth: HOME_MAX_BUTTON_WIDTH,
    alignSelf: 'center',
  },
  passwordHint: {
    width: '100%',
    fontSize: 13,
    color: '#D64545',
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 8,
  },
  enderecoOrientacao: {
    width: '100%',
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 18,
  },
  photoArea: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#C5C5C5',
    borderRadius: 8,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#F8F9FB',
    paddingVertical: 16,
  },
  photoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    backgroundColor: '#E0E0E0',
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blue,
  },
  submitButton: {
    marginBottom: 8,
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
