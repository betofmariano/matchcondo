export const XANO_API_BASE_URL = 'https://x186-chcp-dg8s.n7.xano.io/api:FLyoOY3L';
export const XANO_PUBLICIDADE_API_BASE_URL = XANO_API_BASE_URL;

export const PUBLICIDADE_ENDPOINTS = {
  publicidadeBanner: '/publicidadeBanner',
  patrocinadores: '/patrocinadores',
  patrocinadorProximaTela: '/patrocinadorProximaTela',
  mostrarpublixano: '/mostrarpublixano',
  patrocinioUltimaTela: '/patrocinioUltimaTela',
  patrocinioUltimoVisto: '/patrocinioUltimoVisto',
} as const;

export const API_ENDPOINTS = {
  auth: {
    signupFone: '/auth/signup-fone',
    /** Endpoint atualizado: resposta com `senhaCorreta` (e tratamento de falha de token). */
    loginSafe: '/auth/login-safe',
    me: '/auth/me',
    solicitarRecuperacao: '/auth/solicitar-recuperacao',
    consultarRecuperacao: '/auth/consultar-recuperacao',
    validarRecuperacao: '/auth/validar-recuperacao',
    recuperacaoSenha: '/auth/recuperacaoSenha',
    esqueceuCadastro: '/auth/esqueceuCadastro',
    uploadFotoAlteracao: '/auth/upload-foto-alteracao',
  },
  user: {
    alterarFoto: '/alterarFoto',
    alterarNome: '/alterarNome',
  },
  academias: '/academias',
  /** Workspace Condominios: substitui GET /academias no carregamento de locais. */
  condominio: '/condominio',
  users: '/users',
  getUser: '/getUser',
  userslocal: '/userslocal',
  userslocalSemFoto: '/userslocalSemFoto',
  usuariosLocal: '/usuariosLocal',
  meusLocais: '/meusLocais',
  usersLocalAprovar: '/usersLocalAprovar',
  usersLocalGestor: '/usersLocalGestor',
  usersLocalBloqueio: '/usersLocalBloqueio',
  usersbloqueados: '/usersbloqueados',
  pesquisarUsuario: '/pesquisarUsuario',
  jogos: '/jogos',
  cancelarJogo: '/cancelarJogo',
  sendWzapEspera: '/sendWzapEspera',
  sendWzapAdicionar: '/sendWzapAdicionar',
  sendWzapReserva: '/sendWzapreserva',
  sendWzapReservaReact: '/sendWzapreservaReact',
  meusJogos: '/meusJogos',
  reservas: '/reservas',
  reservasUsuario: '/reservasUsuario',
  reservasUsuarioMensalPorSemana: '/reservasUsuarioMensalPorSemana',
  listaespera: '/listaespera',
  atividades: '/atividades',
  atividadesAcademia: '/atividadesAcademia',
  adicionarJogadoresSimples: '/adicionarJogadoresSimples',
  adicionarJogadoresDuplas: '/adicionarJogadoresDuplas',
  limparSelecaoJogo: '/limparSelecaoJogo',
  mapaDiario: '/mapadiario',
  mapaDiarioFuturo: '/mapadiarioFuturo',
  mapaMensalPorSemana: '/mapamensalporsemana',
  atividadeunidade: '/atividadeunidade',
  acessos: '/acessos',
  criarReserva: '/criarReserva',
  criarReservaReact: '/criarReservaReact',
  criarReservaMensalPorSemana: '/criarReservaMensalPorSemana',
  criarReservaDiaria: '/criarReservaDiaria',
  criarReservaSemanal: '/criarReservaSemanal',
  mapaSemanal: '/mapasemanal',
  reservasDiarias: '/reservasdiarias',
  reservasSemanais: '/reservassemanais',
  reservasMensalPorSemana: '/reservasmensalporsemana',
  logados: '/logados',
  quadras: '/quadras',
  horarios: '/horarios',
  alterarPasswordUser: '/alterarPasswordUser',
  apagarJogosCancelados: '/apagarJogosCancelados',
  acessosApagar: '/acessosApagar',
  apagarMapaDiario: '/apagarMapaDiario',
  mapaDiarioGerar: '/mapaDiarioGerar',
  programarQuadra: '/programarQuadra',
  reservasAtividadeHora: '/reservasAtividadeHora',
  reservasAtividade: '/reservasAtividade',
  reservasPresente: '/reservasPresente',
  somarReservas: '/SomarReservas',
  reservasPeriodo: '/reservasperiodo',
  frequencia: '/frequencia',
  excluirFrequencia: '/excluirFrequencia',
  verFrequencia: '/verFrequencia',
  atividadesLocalPrioritario: '/atividades-local-prioritario',
  /** Futuro: contexto completo pós-login. Ainda não consumido pelo app. */
  usuarioContexto: '/usuario-contexto',
  /** Futuro: troca de local prioritário. Ainda não consumido pelo app. */
  usuarioLocalPrioritario: '/usuario/local-prioritario',
} as const;

export function buildQuadrasListPath(academiasId: number): string {
  return `${API_ENDPOINTS.quadras}?academias_id=${academiasId}`;
}

export function buildQuadraItemPath(quadrasId: number): string {
  return `${API_ENDPOINTS.quadras}/${quadrasId}`;
}

export function buildHorariosListPath(academiasId?: number, atividadesId?: number): string {
  const params = new URLSearchParams();

  if (academiasId != null) {
    params.set('condominio_id', String(academiasId));
  }

  if (atividadesId != null) {
    params.set('atividades_id', String(atividadesId));
  }

  const query = params.toString();
  return query ? `${API_ENDPOINTS.horarios}?${query}` : API_ENDPOINTS.horarios;
}

export function buildHorarioItemPath(horariosId: number): string {
  return `${API_ENDPOINTS.horarios}/${horariosId}`;
}

/** GET /userslocalSemFoto?condominio_id= — lista do local, sem foto. Auth required. */
export function buildUsersLocalListPath(academiasId: number): string {
  const params = new URLSearchParams({
    condominio_id: String(academiasId),
  });

  return `${API_ENDPOINTS.userslocalSemFoto}?${params.toString()}`;
}

/** GET /usuariosLocal?academias_id= — lista leve (id, nome, users_id) do local. */
export function buildUsuariosLocalPath(academiasId: number): string {
  const params = new URLSearchParams({
    academias_id: String(academiasId),
  });

  return `${API_ENDPOINTS.usuariosLocal}?${params.toString()}`;
}

/** GET /pesquisarUsuario?nome=&telefoneLimpo= (4 últimos dígitos) */
export function buildPesquisarUsuarioPath(query: {
  nome: string;
  telefoneLimpo: string;
}): string {
  const params = new URLSearchParams({
    nome: query.nome.trim(),
    telefoneLimpo: query.telefoneLimpo.trim(),
  });

  return `${API_ENDPOINTS.pesquisarUsuario}?${params.toString()}`;
}

/** GET /meusLocais/{users_id} */
export function buildUserLocalAssociationsPath(userId: number): string {
  return `${API_ENDPOINTS.meusLocais}/${userId}`;
}

export function buildUsersLocalItemPath(userslocalId: number): string {
  return `${API_ENDPOINTS.userslocal}/${userslocalId}`;
}

/** DELETE /userslocal/{userslocal_id} */
export function buildUsersLocalDeletePath(userslocalId: number): string {
  return buildUsersLocalItemPath(userslocalId);
}

export function buildUsersLocalAprovarPath(userslocalId: number): string {
  const params = new URLSearchParams({
    userslocal_id: String(userslocalId),
  });

  return `${API_ENDPOINTS.usersLocalAprovar}?${params.toString()}`;
}

export function buildUsersLocalGestorPath(userslocalId: number, gestor: boolean): string {
  const params = new URLSearchParams({
    userslocal_id: String(userslocalId),
    gestor: String(gestor),
  });

  return `${API_ENDPOINTS.usersLocalGestor}?${params.toString()}`;
}

export function buildUsersLocalBloqueioPath(userslocalId: number, bloqueado: boolean): string {
  const params = new URLSearchParams({
    userslocal_id: String(userslocalId),
    bloqueado: String(bloqueado),
  });

  return `${API_ENDPOINTS.usersLocalBloqueio}?${params.toString()}`;
}

export function buildUsersBloqueadosCreatePath(): string {
  return API_ENDPOINTS.usersbloqueados;
}

export function buildReservasUsuarioPath(usersId: number): string {
  return `${API_ENDPOINTS.reservasUsuario}/${usersId}`;
}

export function buildReservasUsuarioMensalPorSemanaPath(usersId: number): string {
  return `${API_ENDPOINTS.reservasUsuarioMensalPorSemana}/${usersId}`;
}

export function buildReservasMensalPorSemanaListPath(academiasId: number): string {
  const params = new URLSearchParams({
    academias_id: String(academiasId),
  });

  return `${API_ENDPOINTS.reservasMensalPorSemana}?${params.toString()}`;
}

export function buildReservasMensalPorSemanaItemPath(reservasMensalPorSemanaId: number): string {
  return `${API_ENDPOINTS.reservasMensalPorSemana}/${reservasMensalPorSemanaId}`;
}

export function buildReservaItemPath(reservasId: number): string {
  return `${API_ENDPOINTS.reservas}/${reservasId}`;
}

export function buildReservasPresentePath(reservasId: number): string {
  return `${API_ENDPOINTS.reservasPresente}/${reservasId}`;
}

export function buildReservasAtividadeHoraPath(query: {
  academiasId: number;
  atividadesId: number;
  dataAtividade: number;
  mapadiarioId: number;
}): string {
  const params = new URLSearchParams({
    academias_id: String(query.academiasId),
    atividades_id: String(query.atividadesId),
    dataAtividade: String(query.dataAtividade),
    mapadiario_id: String(query.mapadiarioId),
  });

  return `${API_ENDPOINTS.reservasAtividadeHora}?${params.toString()}`;
}

export function buildAtividadesLocalPrioritarioPath(): string {
  return API_ENDPOINTS.atividadesLocalPrioritario;
}

export function buildReservasAtividadePath(query: {
  atividades_id: number;
  dataInicial: string;
  dataFinal: string;
}): string {
  const params = new URLSearchParams({
    atividades_id: String(query.atividades_id),
    dataInicial: query.dataInicial,
    dataFinal: query.dataFinal,
  });

  return `${API_ENDPOINTS.reservasAtividade}?${params.toString()}`;
}

export function buildSomarReservasPath(query: {
  academias_id: number;
  dataInicial: string;
  dataFinal: string;
}): string {
  const params = new URLSearchParams({
    academias_id: String(query.academias_id),
    dataInicial: query.dataInicial,
    dataFinal: query.dataFinal,
  });

  return `${API_ENDPOINTS.somarReservas}?${params.toString()}`;
}

export function buildReservasPeriodoPath(query?: { academias_id?: number }): string {
  if (query?.academias_id == null) {
    return API_ENDPOINTS.reservasPeriodo;
  }

  const params = new URLSearchParams({
    academias_id: String(query.academias_id),
  });

  return `${API_ENDPOINTS.reservasPeriodo}?${params.toString()}`;
}

export function buildUsersItemPath(usersId: number): string {
  return `${API_ENDPOINTS.users}/${usersId}`;
}

/** GET /getUser?users_id={users_id} */
export function buildGetUserPath(usersId: number): string {
  const params = new URLSearchParams({
    users_id: String(usersId),
  });

  return `${API_ENDPOINTS.getUser}?${params.toString()}`;
}

/** DELETE /users/{users_id} */
export function buildUsersDeletePath(usersId: number): string {
  return buildUsersItemPath(usersId);
}

/** PATCH/POST /alterarNome/{users_id} — body: { novoNome } */
export function buildAlterarNomePath(usersId: number): string {
  return `${API_ENDPOINTS.user.alterarNome}/${usersId}`;
}

export function buildListaEsperaListPath(params?: {
  users_id?: number;
  academias_id?: number;
}): string {
  if (!params?.users_id && !params?.academias_id) {
    return API_ENDPOINTS.listaespera;
  }

  const searchParams = new URLSearchParams();

  if (params.users_id != null) {
    searchParams.set('users_id', String(params.users_id));
  }

  if (params.academias_id != null) {
    searchParams.set('academias_id', String(params.academias_id));
  }

  return `${API_ENDPOINTS.listaespera}?${searchParams.toString()}`;
}

export function buildListaEsperaItemPath(listaesperaId: number): string {
  return `${API_ENDPOINTS.listaespera}/${listaesperaId}`;
}

/** @deprecated Use buildListaEsperaItemPath */
export const buildListaEsperaDeletePath = buildListaEsperaItemPath;

export function buildAtividadesListPath(academiasId?: number): string {
  if (academiasId == null) {
    return API_ENDPOINTS.atividades;
  }

  const params = new URLSearchParams({
    condominio_id: String(academiasId),
  });

  return `${API_ENDPOINTS.atividades}?${params.toString()}`;
}

export function buildAtividadesAcademiaPath(academiasId: number): string {
  const params = new URLSearchParams({
    academias_id: String(academiasId),
  });

  return `${API_ENDPOINTS.atividadesAcademia}?${params.toString()}`;
}

export function buildAtividadeItemPath(atividadesId: number): string {
  return `${API_ENDPOINTS.atividades}/${atividadesId}`;
}

export function buildAtividadeUnidadeListPath(atividadesId?: number): string {
  if (atividadesId == null) {
    return API_ENDPOINTS.atividadeunidade;
  }

  const params = new URLSearchParams({
    atividades_id: String(atividadesId),
  });

  return `${API_ENDPOINTS.atividadeunidade}?${params.toString()}`;
}

export function buildMapaDiarioGerarPath(data: string): string {
  const params = new URLSearchParams({
    data,
  });

  return `${API_ENDPOINTS.mapaDiarioGerar}?${params.toString()}`;
}

export function buildMapaDiarioFuturoPath(query?: {
  academias_id?: number;
  atividades_id?: number;
}): string {
  if (!query?.academias_id && !query?.atividades_id) {
    return API_ENDPOINTS.mapaDiarioFuturo;
  }

  const params = new URLSearchParams();

  if (query.academias_id != null) {
    params.set('academias_id', String(query.academias_id));
  }

  if (query.atividades_id != null) {
    params.set('atividades_id', String(query.atividades_id));
  }

  return `${API_ENDPOINTS.mapaDiarioFuturo}?${params.toString()}`;
}

export function buildMapaMensalPorSemanaPath(query?: {
  academias_id?: number;
  condominio_id?: number;
  atividades_id?: number;
}): string {
  const condominioId = query?.condominio_id ?? query?.academias_id;
  const atividadesId = query?.atividades_id;

  if (!condominioId && !atividadesId) {
    return API_ENDPOINTS.mapaMensalPorSemana;
  }

  const params = new URLSearchParams();

  if (condominioId != null) {
    params.set('condominio_id', String(condominioId));
  }

  if (atividadesId != null) {
    params.set('atividades_id', String(atividadesId));
  }

  return `${API_ENDPOINTS.mapaMensalPorSemana}?${params.toString()}`;
}

export function buildMapaMensalPorSemanaItemPath(mapaMensalPorSemanaId: number): string {
  return `${API_ENDPOINTS.mapaMensalPorSemana}/${mapaMensalPorSemanaId}`;
}

export function buildMapaDiarioItemPath(mapaDiarioId: number): string {
  return `${API_ENDPOINTS.mapaDiario}/${mapaDiarioId}`;
}

export function buildMapaSemanalItemPath(mapasemanalId: number): string {
  return `${API_ENDPOINTS.mapaSemanal}/${mapasemanalId}`;
}

export function buildReservasDiariasItemPath(reservasdiariasId: number): string {
  return `${API_ENDPOINTS.reservasDiarias}/${reservasdiariasId}`;
}

export function buildReservasSemanaisItemPath(reservassemanaisId: number): string {
  return `${API_ENDPOINTS.reservasSemanais}/${reservassemanaisId}`;
}

export function buildExcluirFrequenciaPath(
  atividadesId: number,
  query?: MapaFrequenciaMontagemQuery,
): string {
  return buildMapaFrequenciaMontagemPath(API_ENDPOINTS.excluirFrequencia, atividadesId, query);
}

export function buildVerFrequenciaPath(
  atividadesId: number,
  query?: MapaFrequenciaMontagemQuery,
): string {
  return buildMapaFrequenciaMontagemPath(API_ENDPOINTS.verFrequencia, atividadesId, query);
}

export function buildFrequenciaItemPath(frequenciaId: number): string {
  return `${API_ENDPOINTS.frequencia}/${frequenciaId}`;
}

export type MapaFrequenciaMontagemQuery = {
  academias_id?: number;
  horarios_id?: number;
  hora?: number;
  minutos?: number;
};

function buildMapaFrequenciaMontagemPath(
  endpoint: string,
  atividadesId: number,
  query?: MapaFrequenciaMontagemQuery,
): string {
  if (!query) {
    return `${endpoint}/${atividadesId}`;
  }

  const params = new URLSearchParams();

  if (query.academias_id != null) {
    params.set('academias_id', String(query.academias_id));
  }

  if (query.horarios_id != null) {
    params.set('horarios_id', String(query.horarios_id));
  }

  if (query.hora != null) {
    params.set('hora', String(query.hora));
  }

  if (query.minutos != null) {
    params.set('minutos', String(query.minutos));
  }

  const qs = params.toString();
  return qs ? `${endpoint}/${atividadesId}?${qs}` : `${endpoint}/${atividadesId}`;
}
