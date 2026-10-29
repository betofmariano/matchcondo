import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ASSOCIACAO_LOCAL_LABELS } from '@/constants/associacao-local-labels';
import {
  AUTH_TOKEN_KEY,
  normalizePhoneForApi,
} from '@/constants/auth';
import { ApiError, getApiErrorMessage } from '@/services/api-client';
import { getAcademias } from '@/services/academias-service';
import { getMe, loginSafe, signupFone } from '@/services/auth-service';
import {
  registerLogadoForAuthenticatedUser,
  resetLogadoRegistrationSession,
} from '@/services/logados-service';
import {
  resolveSignupCondominioId,
  SIGNUP_CONDOMINIO_REQUIRED_MESSAGE,
  type SignupPhotoAsset,
} from '@/types/signup';
import type { User } from '@/types/user';
import {
  getStoredAuthToken,
  removeStoredAuthToken,
  setStoredAuthToken,
} from '@/utils/auth-storage';
import {
  LOGIN_USER_MESSAGES,
  parseLoginSafeResponse,
} from '@/utils/login-response';
import { getSignupValidationError, getLoginValidationError } from '@/utils/phone-validation';
import { formatRegisteredPersonName } from '@/utils/meus-dados';
import { hasUserPhoto, normalizePhotoUrl } from '@/utils/user-photo';

type SignInErrorCode =
  | 'phone_not_found'
  | 'wrong_password'
  | 'token_failed'
  | 'blocked'
  | 'not_approved'
  | 'generic';

type SignInResult = {
  success: boolean;
  error?: string;
  errorCode?: SignInErrorCode;
};

type SignUpResult = {
  success: boolean;
  error?: string;
};

type SignUpOptions = {
  larguraPagina?: number;
};

type SignUpData = {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  academiasId: number | null;
  photoAsset: SignupPhotoAsset | null;
  matricula: string;
  requiresMatricula: boolean;
  endereco: string;
  requiresComplemento: boolean;
};

type SignInOptions = {
  larguraPagina?: number;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  authToken: string | null;
  user: User | null;
  signIn: (phone: string, password: string, options?: SignInOptions) => Promise<SignInResult>;
  signUp: (data: SignUpData, options?: SignUpOptions) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
  patchUser: (partial: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function handleAuthSessionError(error: unknown): never | null {
  if (error instanceof ApiError && error.status === 403) {
    throw error;
  }

  if (isUnauthorizedError(error)) {
    return null;
  }

  throw error;
}

function validateSignInData(phone: string, password: string): string | null {
  return getLoginValidationError(phone, password);
}

function validateSignUpData(data: SignUpData): string | null {
  return getSignupValidationError({
    name: data.name,
    phone: data.phone,
    password: data.password,
    confirmPassword: data.confirmPassword,
    academiasId: data.academiasId,
    hasPhoto: Boolean(data.photoAsset),
    requiresMatricula: data.requiresMatricula,
    matricula: data.matricula,
    requiresComplemento: data.requiresComplemento,
    endereco: data.endereco,
  });
}

function getBlockedUserError(user: User): SignInResult | null {
  if (!user.bloqueado) {
    return null;
  }

  return {
    success: false,
    errorCode: 'blocked',
    error: ASSOCIACAO_LOCAL_LABELS.acessoBloqueado,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const clearSession = useCallback(async () => {
    resetLogadoRegistrationSession();
    await removeStoredAuthToken(AUTH_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const persistSession = useCallback(async (token: string, currentUser: User) => {
    await setStoredAuthToken(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    setUser(currentUser);
    setIsAuthenticated(true);
  }, []);

  const enrichSessionUserPhoto = useCallback(
    async (token: string, currentUser: User, fallbackPhotoUrl?: string | null): Promise<User> => {
      let nextUser = currentUser;
      const resolvedFallback = normalizePhotoUrl(fallbackPhotoUrl);

      if (resolvedFallback && !hasUserPhoto(nextUser.foto)) {
        nextUser = { ...nextUser, foto: resolvedFallback };
        setUser(nextUser);
      }

      if (!hasUserPhoto(nextUser.foto)) {
        try {
          const refreshedUser = await getMe(token);

          if (hasUserPhoto(refreshedUser.foto)) {
            nextUser = refreshedUser;
            setUser(refreshedUser);
          }
        } catch {
          // Mantém sessão com foto parcial, se houver.
        }
      }

      return nextUser;
    },
    [],
  );

  const establishAuthSession = useCallback(
    async (token: string): Promise<User | null> => {
      try {
        const currentUser = await getMe(token);
        const blockedError = getBlockedUserError(currentUser);

        if (blockedError) {
          await clearSession();
          throw new ApiError(blockedError.error ?? ASSOCIACAO_LOCAL_LABELS.acessoBloqueado, 403);
        }

        await persistSession(token, currentUser);

        return currentUser;
      } catch (error) {
        await clearSession();
        const result = handleAuthSessionError(error);

        if (result === null) {
          return null;
        }

        throw result;
      }
    },
    [clearSession, persistSession],
  );

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const token = await getStoredAuthToken(AUTH_TOKEN_KEY);

        if (!token) {
          if (isMounted) {
            setIsAuthenticated(false);
          }
          return;
        }

        if (isMounted) {
          await establishAuthSession(token);
        }
      } catch {
        if (isMounted) {
          await clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [establishAuthSession, clearSession]);

  const signIn = useCallback(async (phone: string, password: string, options?: SignInOptions): Promise<SignInResult> => {
    const validationError = validateSignInData(phone, password);

    if (validationError) {
      return { success: false, error: validationError };
    }

    const telefoneLimpo = normalizePhoneForApi(phone);
    const larguraPagina = Math.round(options?.larguraPagina ?? 0);

    try {
      const response = await loginSafe({
        telefoneLimpo,
        password,
      });

      const parsed = parseLoginSafeResponse(response);

      if (parsed.status === 'error') {
        return {
          success: false,
          errorCode: parsed.code,
          error: parsed.message,
        };
      }

      let loggedUser: User | null = null;

      try {
        loggedUser = await establishAuthSession(parsed.authToken);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return {
            success: false,
            errorCode: 'blocked',
            error: error.message,
          };
        }

        return {
          success: false,
          errorCode: 'token_failed',
          error: getApiErrorMessage(error) || LOGIN_USER_MESSAGES.tokenFailed,
        };
      }

      if (!loggedUser) {
        return {
          success: false,
          errorCode: 'token_failed',
          error: LOGIN_USER_MESSAGES.sessionExpired,
        };
      }

      loggedUser = await enrichSessionUserPhoto(
        parsed.authToken,
        loggedUser,
        response.foto,
      );

      void registerLogadoForAuthenticatedUser(parsed.authToken, {
        pageWidth: larguraPagina,
        sessionAcademiasId: loggedUser.localPrioritario ?? loggedUser.academias_id,
        force: true,
      }).catch((error) => {
        console.warn('Não foi possível registrar em /logados no login:', error);
      });

      return { success: true };
    } catch (error) {
      return { success: false, errorCode: 'generic', error: getApiErrorMessage(error) };
    }
  }, [establishAuthSession, enrichSessionUserPhoto]);

  const signUp = useCallback(async (data: SignUpData, options?: SignUpOptions): Promise<SignUpResult> => {
    let requiresMatricula = data.requiresMatricula;
    let requiresComplemento = data.requiresComplemento;

    if (data.academiasId != null) {
      try {
        const academias = await getAcademias();
        const academia = academias.find((item) => item.id === data.academiasId);

        if (academia) {
          requiresMatricula = academia.tituloSocio === true;
          requiresComplemento = academia.complemento === true;
        }
      } catch {
        // Mantém as flags do formulário se a lista não recarregar.
      }
    }

    const validationError = validateSignUpData({
      ...data,
      requiresMatricula,
      requiresComplemento,
    });

    if (validationError) {
      return { success: false, error: validationError };
    }

    const condominioId = resolveSignupCondominioId(data.academiasId);

    if (condominioId == null) {
      return { success: false, error: SIGNUP_CONDOMINIO_REQUIRED_MESSAGE };
    }

    const larguraPagina = Math.round(options?.larguraPagina ?? 0);

    try {
      const response = await signupFone({
        nome: formatRegisteredPersonName(data.name),
        telefoneLimpo: normalizePhoneForApi(data.phone),
        password: data.password,
        matricula: requiresMatricula ? data.matricula.trim() : '',
        endereco: requiresComplemento ? data.endereco.trim() : '',
        condominio_id: condominioId,
        Foto: '',
        ultimaPublicidadeData: null,
        photoAsset: data.photoAsset!,
      });

      if (!response.authToken) {
        return {
          success: false,
          error: 'Não foi possível concluir o cadastro. Tente novamente.',
        };
      }

      let loggedUser: User | null = null;

      try {
        loggedUser = await establishAuthSession(response.authToken);
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) {
          return {
            success: false,
            error: error.message,
          };
        }

        return {
          success: false,
          error: getApiErrorMessage(error),
        };
      }

      if (!loggedUser) {
        return {
          success: false,
          error: 'Não foi possível validar sua sessão. Faça login novamente.',
        };
      }

      loggedUser = await enrichSessionUserPhoto(
        response.authToken,
        loggedUser,
        response.foto || normalizePhotoUrl(data.photoAsset?.uri),
      );

      void registerLogadoForAuthenticatedUser(response.authToken, {
        pageWidth: larguraPagina,
        sessionAcademiasId: loggedUser.localPrioritario ?? loggedUser.academias_id,
        force: true,
      }).catch((error) => {
        console.warn('Não foi possível registrar em /logados no cadastro:', error);
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: getApiErrorMessage(error) };
    }
  }, [establishAuthSession, enrichSessionUserPhoto]);

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async (): Promise<boolean> => {
    if (!authToken) {
      return false;
    }

    try {
      const currentUser = await getMe(authToken);
      setUser(currentUser);
      return true;
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearSession();
      }

      return false;
    }
  }, [authToken, clearSession]);

  const patchUser = useCallback((partial: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...partial } : current));
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      authToken,
      user,
      signIn,
      signUp,
      signOut,
      refreshUser,
      patchUser,
    }),
    [isLoading, isAuthenticated, authToken, user, signIn, signUp, signOut, refreshUser, patchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }

  return context;
}
