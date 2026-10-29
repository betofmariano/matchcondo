import { AUTH_TOKEN_STORAGE_KEY } from '@/constants/storage-keys';

export const AUTH_TOKEN_KEY = AUTH_TOKEN_STORAGE_KEY;

export const RECOVERY_CODE_LENGTH = 4;
export const RECOVERY_CODE_TTL_MS = 60 * 60 * 1000;

export function sanitizeRecoveryCode(value: string): string {
  return stripNonNumeric(value).slice(0, RECOVERY_CODE_LENGTH);
}

export function isValidRecoveryCode(code: string): boolean {
  return new RegExp(`^\\d{${RECOVERY_CODE_LENGTH}}$`).test(code);
}

export function isValidNumericPassword(password: string): boolean {
  return /^\d{4,6}$/.test(password);
}

export function stripNonNumeric(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizePhoneForApi(value: string): string {
  return stripNonNumeric(value).trim();
}

export function normalizeLoginPassword(value: string): string {
  return stripNonNumeric(value);
}
