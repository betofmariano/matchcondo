import {
  cancelarReservaMensalPorSemana,
  getReservasMensalPorSemanaByAcademia,
} from '@/services/reservas-mensal-por-semana-service';
import {
  buildUsersNomesByIdsMap,
  resolveUsuarioNomeFromMap,
} from '@/services/users-lookup-service';
import type { ListaReservaItem } from '@/types/lista-reserva';
import type { ReservaUsuario } from '@/types/reserva-usuario';
import {
  buildDayEndTimestamp,
  buildDayStartTimestamp,
  collectUsersIdsFromListaReservas,
  filterListaReservasAtivas,
  mapReservasMensalPorSemanaToListaItems,
} from '@/utils/lista-reservas';

export type GetListaReservasAcademiaOptions = {
  localNome?: string | null;
  startDate?: Date;
  endDate?: Date;
};

async function enrichListaReservasUsuarioNomes(
  items: ListaReservaItem[],
  academiasId: number,
  authToken: string,
): Promise<ListaReservaItem[]> {
  const pendingItems = items.filter((item) => !item.usuarioNome.trim());

  if (pendingItems.length === 0) {
    return items;
  }

  const usersIds = collectUsersIdsFromListaReservas(pendingItems);
  const usersNomesById = await buildUsersNomesByIdsMap(usersIds, authToken, academiasId);

  return items.map((item) => ({
    ...item,
    usuarioNome:
      item.usuarioNome.trim() ||
      resolveUsuarioNomeFromMap(item.users_id, usersNomesById),
  }));
}

function filterReservasUsuarioByPeriod(
  reservas: ReservaUsuario[],
  startDate?: Date,
  endDate?: Date,
): ReservaUsuario[] {
  if (!startDate || !endDate) {
    return reservas.filter((reserva) => !reserva.cancelado);
  }

  const start = buildDayStartTimestamp(startDate);
  const end = buildDayEndTimestamp(endDate);

  return reservas.filter(
    (reserva) =>
      !reserva.cancelado &&
      reserva.dataAtividade >= start &&
      reserva.dataAtividade <= end,
  );
}

/**
 * Lista de Reservas do MatchCondo: sempre MensalPorSemana.
 * Nome da unidade vem do addon `_atividadeunidade` na própria reserva.
 */
export async function getListaReservasAcademia(
  academiasId: number,
  authToken: string,
  options?: GetListaReservasAcademiaOptions,
): Promise<ListaReservaItem[]> {
  const localNome = options?.localNome?.trim() || `Local #${academiasId}`;
  const reservasRaw = await getReservasMensalPorSemanaByAcademia(academiasId, authToken);
  const reservas = filterReservasUsuarioByPeriod(
    reservasRaw,
    options?.startDate,
    options?.endDate,
  );

  if (reservas.length === 0) {
    return [];
  }

  const items = filterListaReservasAtivas(
    mapReservasMensalPorSemanaToListaItems(reservas, localNome, new Map()),
  );

  return enrichListaReservasUsuarioNomes(items, academiasId, authToken);
}

export async function excluirReservaLista(
  item: ListaReservaItem,
  _gestorUserId: number,
  authToken: string,
): Promise<unknown> {
  return cancelarReservaMensalPorSemana(
    {
      reservasMensalPorSemanaId: item.id,
      users_id: item.users_id,
      atividades_id: item.atividades_id,
      mapadiariodamha_id: item.mapadiariodamha_id,
      dataAtividade: item.dataAtividade,
      atividadeunidade_id: item.atividadeunidade_id,
      academias_id: item.academias_id,
    },
    authToken,
  );
}
