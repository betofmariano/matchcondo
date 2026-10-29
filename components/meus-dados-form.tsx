import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth-button';
import { AuthTextField } from '@/components/auth-text-field';
import { PhoneTextField } from '@/components/phone-text-field';
import { UserAvatar } from '@/components/user-avatar';
import { MATCHPOINT_COLORS } from '@/constants/theme';

type MeusDadosFormProps = {
  nome: string;
  telefone: string;
  matricula: string;
  complemento: string;
  complementoRegistrado: string;
  showComplementoField: boolean;
  photoPreviewUri: string | null;
  nomeError?: string | null;
  telefoneError?: string | null;
  complementoError?: string | null;
  disabled?: boolean;
  isSubmitting?: boolean;
  canConfirm?: boolean;
  onNomeChange: (value: string) => void;
  onTelefoneChange: (value: string) => void;
  onComplementoChange: (value: string) => void;
  onPhotoPress: () => void;
  onAlterarSenhaPress: () => void;
  onExcluirContaPress: () => void;
  isExcluindoConta?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MeusDadosForm({
  nome,
  telefone,
  matricula,
  complemento,
  complementoRegistrado,
  showComplementoField,
  photoPreviewUri,
  nomeError = null,
  telefoneError = null,
  complementoError = null,
  disabled = false,
  isSubmitting = false,
  canConfirm = false,
  onNomeChange,
  onTelefoneChange,
  onComplementoChange,
  onPhotoPress,
  onAlterarSenhaPress,
  onExcluirContaPress,
  isExcluindoConta = false,
  onCancel,
  onConfirm,
}: MeusDadosFormProps) {
  const isDisabled = disabled || isSubmitting || isExcluindoConta;
  const isConfirmDisabled = isDisabled || !canConfirm;

  return (
    <View style={styles.form}>
      <Text style={styles.title}>Editar seus dados</Text>
      <View style={styles.divider} />

      <View style={styles.fields}>
        <AuthTextField
          label="Nome (nome e sobrenome)"
          value={nome}
          onChangeText={onNomeChange}
          editable={!isDisabled}
          autoCapitalize="words"
        />
        {nomeError ? <Text style={styles.errorText}>{nomeError}</Text> : null}

        <PhoneTextField
          label="Telefone/WhatsApp (com DDD e 9)"
          value={telefone}
          onChangeText={onTelefoneChange}
          editable={!isDisabled}
        />
        {telefoneError ? <Text style={styles.errorText}>{telefoneError}</Text> : null}
        <Text style={styles.fieldHint}>
          A alteração de telefone será analisada antes de ser aplicada.
        </Text>

        {matricula.trim() ? (
          <AuthTextField
            label="Título Sócio"
            value={matricula}
            editable={false}
            style={styles.readOnlyInput}
          />
        ) : null}

        {showComplementoField ? (
          <>
            <AuthTextField
              label="Endereço"
              value={complemento}
              onChangeText={onComplementoChange}
              editable={!isDisabled}
              autoCapitalize="sentences"
            />
            {complementoError ? <Text style={styles.errorText}>{complementoError}</Text> : null}
          </>
        ) : null}
      </View>

      <Text style={styles.photoHint}>Clique sobre a foto se quiser substituir</Text>

      <Pressable
        style={styles.photoButton}
        onPress={onPhotoPress}
        disabled={isDisabled}
        accessibilityLabel="Substituir foto">
        {photoPreviewUri ? (
          <Image source={{ uri: photoPreviewUri }} style={styles.photoPreview} resizeMode="cover" />
        ) : (
          <UserAvatar name={nome} photoUrl={null} size={120} />
        )}
      </Pressable>

      <AuthButton
        label="Alterar minha senha"
        onPress={onAlterarSenhaPress}
        disabled={isDisabled}
        style={styles.passwordButton}
      />

      <AuthButton
        label={isExcluindoConta ? 'Excluindo conta...' : 'Excluir minha conta'}
        variant="outline"
        onPress={onExcluirContaPress}
        disabled={isDisabled}
        style={styles.deleteButton}
        labelStyle={styles.deleteButtonLabel}
      />

      <View style={styles.actions}>
        <AuthButton label="Voltar" variant="voltar" onPress={onCancel} disabled={isSubmitting} />
        <AuthButton
          label={isSubmitting ? 'Enviando...' : 'Confirmar'}
          onPress={onConfirm}
          disabled={isConfirmDisabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: MATCHPOINT_COLORS.navy,
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 2,
    backgroundColor: MATCHPOINT_COLORS.accent,
    marginBottom: 16,
    borderRadius: 1,
  },
  fields: {
    gap: 4,
  },
  readOnlyInput: {
    backgroundColor: MATCHPOINT_COLORS.readOnlyBackground,
    color: MATCHPOINT_COLORS.muted,
  },
  errorText: {
    fontSize: 13,
    color: MATCHPOINT_COLORS.error,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 13,
    color: MATCHPOINT_COLORS.muted,
    fontWeight: '600',
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 18,
  },
  photoHint: {
    fontSize: 14,
    fontWeight: '600',
    color: MATCHPOINT_COLORS.muted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  photoButton: {
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: MATCHPOINT_COLORS.borderLight,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPreview: {
    width: 120,
    height: 120,
  },
  passwordButton: {
    marginBottom: 12,
  },
  deleteButton: {
    borderColor: MATCHPOINT_COLORS.error,
    marginBottom: 16,
  },
  deleteButtonLabel: {
    color: MATCHPOINT_COLORS.error,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
    marginTop: 4,
  },
});
