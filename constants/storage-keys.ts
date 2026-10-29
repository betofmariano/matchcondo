/** SecureStore só aceita [A-Za-z0-9._-]; não usar @ ou :. */
export const AUTH_TOKEN_STORAGE_KEY = 'reservasdomorador_authToken';
export const AUTH_USER_STORAGE_KEY = 'reservasdomorador_user';
export const AUTH_SESSION_STORAGE_KEY = 'reservasdomorador_auth';

export const INSTALLED_VERSION_STORAGE_KEY = 'reservasdomorador_installed_version';
export const UPDATE_IN_PROGRESS_SESSION_KEY = 'reservasdomorador_update_in_progress';
export const UPDATE_DISMISSED_SESSION_KEY = 'reservasdomorador-version-dismissed';
export const PENDING_RECOVERY_STORAGE_KEY = '@reservasdomorador:pendingRecovery';
export const PASSWORD_LOGIN_INSTALL_PROMPT_SESSION_KEY =
  'reservasdomorador_password_login_install_prompt';
