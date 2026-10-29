export const ASSOCIACAO_LOCAL_LABELS = {
  singular: 'local de associação',
  plural: 'locais de associação',
  informe: 'Informe seu local de associação',
  selecione: 'Selecione um local de associação',
  selecioneTitulo: 'Selecione seu local de associação',
  carregando: 'Carregando locais de associação...',
  erroCarregar: 'Não foi possível carregar os locais de associação. Tente novamente.',
  obrigatorio: 'Selecione seu local de associação.',
  matriculaExigida:
    'Este local de associação exige título de sócio. Informe o número da matrícula para continuar.',
  enderecoObrigatorio: 'Informe o endereço.',
  enderecoObrigatorioTitulo: 'Endereço obrigatório',
  enderecoObrigatorioMensagem:
    'Este local de associação exige endereço. Informe bloco, apartamento ou casa para continuar.',
  enderecoOrientacao: 'Consulte o gestor para saber o que informar.',
  acessoBloqueado: 'Seu acesso está bloqueado. Entre em contato com o local de associação.',
  cadastroPendente:
    'Seu cadastro ainda não foi aprovado. Aguarde a confirmação do local de associação.',
  cadastroBloqueado: 'Este cadastro está bloqueado. Entre em contato com o local de associação.',
} as const;

export function formatAssociacaoLocalFallback(id: number): string {
  return `Local de associação #${id}`;
}
