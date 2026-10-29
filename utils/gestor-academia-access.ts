import type { Academia } from '@/types/academia';
import type { UserContextPermissions } from '@/types/user-context';

export type GestorScreenPermissionKey =
  | 'podeAcessarRelatorioListaEspera'
  | 'podeAcessarMapaFrequencia'
  | 'podeAcessarListaReservasAtividade'
  | 'podeAcessarListaReservasPeriodo'
  | 'podeAcessarProgramacaoAtividades'
  | 'podeGerirLocal';

export function canAccessGestorScreen({
  isAdministrador,
  canManageSelectedAcademia,
  selectedAcademia,
  academiasId,
  permissions,
  permissionKey,
}: {
  isAdministrador: boolean;
  canManageSelectedAcademia: boolean;
  selectedAcademia: Academia | null;
  academiasId: number | null;
  permissions: UserContextPermissions;
  permissionKey: GestorScreenPermissionKey;
}): boolean {
  if (academiasId == null) {
    return false;
  }

  if (isAdministrador) {
    return canManageSelectedAcademia && selectedAcademia != null;
  }

  return permissions[permissionKey] === true;
}
