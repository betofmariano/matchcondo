import type {
  GestorUsuarioListItem,
  GestorUsuarioSortDirection,
  GestorUsuarioSortField,
  GestorUsuarioStatusFilter,
  UsersLocalApiRecord,
} from '@/types/usuario';
import { isUsersLocalAdministrador } from '@/utils/normalize-usuario';
import { formatBrazilianMobilePhone, stripPhoneDigits } from '@/utils/phone-mask';
import { formatLogadoCreatedAt } from '@/utils/logado-lista-format';
import { matchesSearchText } from '@/utils/search-text';

export const LISTA_USUARIOS_GESTOR_MESSAGES = {
  loadError: 'Não foi possível carregar os moradores.',
  permission: 'Você não tem permissão para gerir os moradores deste condomínio.',
  empty: 'Não foram encontrados moradores.',
  selectLocal: 'Selecione o local para listar os usuários.',
  approveSuccess: 'Usuário aprovado com sucesso.',
  blockSuccess: 'Usuário bloqueado com sucesso.',
  unblockSuccess: 'Usuário desbloqueado com sucesso.',
  suspensaoAtividadeSuccess: 'Suspensão registrada com sucesso.',
  gestorSuccess: 'Usuário definido como gestor.',
  unsetGestorSuccess: 'Gestor removido com sucesso.',
  deleteSuccess: 'Usuário excluído com sucesso.',
  photoSuccess: 'Foto atualizada com sucesso.',
  fieldsSuccess: 'Dados atualizados com sucesso.',
  actionError: 'Não foi possível concluir a operação. Tente novamente.',
  approveTitle: 'Aprovar usuário',
  approveMessage: 'Deseja aprovar este usuário?',
  blockTitle: 'Bloquear usuário',
  blockMessage: 'Deseja bloquear este usuário?',
  unblockTitle: 'Desbloquear usuário',
  unblockMessage: 'Deseja desbloquear este usuário?',
  gestorTitle: 'Definir gestor',
  gestorMessage: 'Deseja definir este usuário como gestor do clube?',
  unsetGestorTitle: 'Remover gestor',
  unsetGestorMessage: 'Deseja remover este usuário como gestor do clube?',
  deleteTitle: 'Excluir usuário',
  deleteMessage:
    'Deseja remover este usuário deste local? O cadastro geral na tabela users não será excluído.',
};

export const GESTOR_USUARIO_STATUS_FILTER_OPTIONS: Array<{
  value: GestorUsuarioStatusFilter;
  label: string;
}> = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'bloqueado', label: 'Bloqueado' },
];

export function formatGestorUsuarioUltimaEntrada(
  timestamp: number | null | undefined,
): string {
  if (timestamp == null || timestamp <= 0) {
    return '—';
  }

  return formatLogadoCreatedAt(timestamp);
}

function getUltimoAcessoSortValue(
  timestamp: number | null,
  direction: GestorUsuarioSortDirection,
): number {
  if (timestamp != null && timestamp > 0) {
    return timestamp;
  }

  return direction === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
}

export function sortGestorUsuarios(
  usuarios: GestorUsuarioListItem[],
  sortField: GestorUsuarioSortField,
  sortDirection: GestorUsuarioSortDirection,
): GestorUsuarioListItem[] {
  const sorted = [...usuarios];

  sorted.sort((a, b) => {
    if (sortField === 'ultimaEntrada') {
      const aValue = getUltimoAcessoSortValue(a.ultimoAcesso, sortDirection);
      const bValue = getUltimoAcessoSortValue(b.ultimoAcesso, sortDirection);
      const diff = sortDirection === 'asc' ? aValue - bValue : bValue - aValue;

      if (diff !== 0) {
        return diff;
      }

      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    }

    const nameDiff = a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    return sortDirection === 'desc' ? -nameDiff : nameDiff;
  });

  return sorted;
}

export function mapUsersLocalToGestorList(
  records: UsersLocalApiRecord[],
  academiasId: number,
): GestorUsuarioListItem[] {
  const scoped = records.filter((record) => record.academias_id === academiasId);
  const source = scoped.length > 0 ? scoped : records;

  return source
    .filter((record) => !isUsersLocalAdministrador(record))
    .map((record) => {
      const telefoneLimpo = stripPhoneDigits(
        record.telefoneLimpo ??
          record._users?.telefoneLimpo ??
          record._users?.telefoneConfirmado ??
          '',
      );
      const socio = (record.socioTitulo ?? record._users?.matricula ?? '').trim();
      const endereco = (
        record.endereco ??
        record.complemento ??
        record._users?.endereco ??
        record._users?.complemento ??
        ''
      ).trim();
      const email = (record._users?.email ?? '').trim();
      const rawNome = record.nome.trim() || (record._users?.nome ?? '').trim();
      const nome =
        rawNome && !rawNome.toLowerCase().startsWith('http') ? rawNome : 'Sem nome';

      return {
        userslocalId: record.id,
        usersId: record.users_id,
        email,
        nome,
        telefoneConfirmado: record._users?.telefoneConfirmado?.trim() ?? telefoneLimpo,
        telefone: formatBrazilianMobilePhone(telefoneLimpo),
        telefoneLimpo,
        socio,
        endereco,
        foto: null,
        ultimoAcesso: record.ultimoAcesso ?? null,
        ultimaEntrada: formatGestorUsuarioUltimaEntrada(record.ultimoAcesso),
        gestor: record._users?.gestor === true || record.gestor === true,
        administrador:
          record._users?.administrador === true || record.administrador === true,
        aprovado: record.aprovado === true,
        bloqueado: record.bloqueado === true || record._users?.bloqueado === true,
        inativo: record.inativo === true,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

export function getGestorMoradorStatus(
  usuario: Pick<GestorUsuarioListItem, 'aprovado' | 'bloqueado'>,
): Exclude<GestorUsuarioStatusFilter, 'todos'> {
  if (usuario.bloqueado) {
    return 'bloqueado';
  }

  if (usuario.aprovado) {
    return 'aprovado';
  }

  return 'pendente';
}

export function matchesGestorUsuarioStatusFilter(
  usuario: Pick<GestorUsuarioListItem, 'aprovado' | 'bloqueado'>,
  filter: GestorUsuarioStatusFilter,
): boolean {
  if (filter === 'todos') {
    return true;
  }

  return getGestorMoradorStatus(usuario) === filter;
}

export function applyGestorUsuarioListPatches(
  usuarios: GestorUsuarioListItem[],
  patches?: Record<number, Partial<GestorUsuarioListItem>>,
): GestorUsuarioListItem[] {
  if (!patches || Object.keys(patches).length === 0) {
    return usuarios;
  }

  return usuarios.map((usuario) => {
    const patch = patches[usuario.userslocalId];

    return patch ? { ...usuario, ...patch } : usuario;
  });
}

export function filterGestorUsuarios(
  usuarios: GestorUsuarioListItem[],
  params: {
    statusFilter: GestorUsuarioStatusFilter;
    searchQuery: string;
  },
): GestorUsuarioListItem[] {
  return usuarios.filter((usuario) => {
    if (usuario.administrador) {
      return false;
    }

    if (!matchesGestorUsuarioStatusFilter(usuario, params.statusFilter)) {
      return false;
    }

    if (!params.searchQuery.trim()) {
      return true;
    }

    return (
      matchesSearchText(usuario.nome, params.searchQuery) ||
      matchesSearchText(usuario.telefone, params.searchQuery) ||
      matchesSearchText(usuario.telefoneLimpo, params.searchQuery) ||
      matchesSearchText(usuario.endereco, params.searchQuery)
    );
  });
}
