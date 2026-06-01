import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccount } from '@/hooks/useAccount';
import { toast } from 'sonner';

export interface DistributionChannel {
  id: string;
  account_id: string;
  channel_name: string;
  channel_type: string;
  is_enabled: boolean;
  feed_registered_at: string | null;
  external_id: string | null;
  last_sync_at: string | null;
  stats: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributionLog {
  id: string;
  job_id: string;
  channel_name: string;
  status: 'pending' | 'active' | 'removed' | 'error';
  distributed_at: string | null;
  removed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Tipo unificado para todos os canais
export interface UnifiedChannel {
  name: string;
  displayName: string;
  description: string;
  type: string;
  category: 'automatic' | 'feed_xml' | 'premium';
  isAutomatic: boolean;
  reach: string;
  cost: string;
  icon: string;
  requiresCredentials: boolean;
  status: 'available' | 'coming_soon';
  registrationUrl?: string | null;
  requiresPartnership?: boolean;
  partnershipUrl?: string;
  scopes?: string[];
  features?: string[];
  registrationSteps?: RegistrationStep[];
  registrationNotes?: string[];
  approvalTime?: string;
  integrationGuide?: string;
  integrationVideoUrl?: string;
}

export interface RegistrationStep {
  title: string;
  description?: string;
  action?: {
    type: 'copy' | 'link';
    label: string;
    value?: string;
    url?: string;
  };
  tips?: string[];
}

// Array unificado de todos os canais
export const ALL_CHANNELS: UnifiedChannel[] = [
  // === Automáticos ===
  {
    name: 'google_jobs',
    displayName: 'Google Jobs',
    description: 'Indexação automática via Schema.org — suas vagas aparecem no Google',
    type: 'schema_org',
    category: 'automatic',
    isAutomatic: true,
    reach: 'Global',
    cost: 'Gratuito',
    icon: '🔍',
    requiresCredentials: false,
    status: 'available',
    approvalTime: 'Imediato',
    registrationSteps: [
      { title: 'Automático via Schema.org', description: 'Suas vagas já aparecem no Google automaticamente. O Google indexa as páginas usando Schema.org JobPosting.' },
    ],
    registrationNotes: ['Certifique-se de que seu portal de carreiras está publicado', 'O Google pode levar algumas horas para indexar novas vagas'],
  },
  // === Premium ===
  {
    name: 'linkedin_api',
    displayName: 'LinkedIn',
    description: 'Publicação automática via API oficial do LinkedIn',
    type: 'oauth2',
    category: 'premium',
    isAutomatic: false,
    reach: 'Global',
    cost: 'Pago',
    icon: '💼',
    requiresCredentials: true,
    status: 'available',
    requiresPartnership: true,
    partnershipUrl: 'https://business.linkedin.com/talent-solutions/ats-partners',
    scopes: ['w_organization_social', 'r_organization_social', 'rw_organization_admin'],
    features: ['Publicação automática', 'Tracking de candidatos', 'Analytics de vagas'],
    integrationVideoUrl: 'https://www.youtube.com/watch?v=BfwGOIAGQuI',
    integrationGuide: `Para gerar uma API Key no LinkedIn e publicar vagas (ou realizar outras automações), você precisa criar um aplicativo no portal de desenvolvedores do LinkedIn. O processo envolve a criação de credenciais de autenticação (Client ID e Client Secret).

Aqui está o passo a passo baseados nas diretrizes atuais do LinkedIn:

1. Acesse o Portal de Desenvolvedores
Acesse: linkedin.com/developers
Clique em "Criar aplicativo" (Create app).

2. Crie o Aplicativo
Preencha os campos obrigatórios: Nome do Aplicativo, Página do LinkedIn (sua empresa) e URL de privacidade.
Faça upload de um logotipo.
Aceite os termos de serviço e clique em "Criar app".

3. Obtenha as Credenciais (API Key)
Após criar o app, navegue até a aba "Auth" (Autenticação) nas configurações do app.
Nesta seção, você encontrará o Client ID e o Client Secret.
Esses dois códigos funcionam como sua chave API e serão usados para autenticar a publicação de vagas.

4. Configuração para Publicação de Vagas (Jobs API)
Para publicar vagas, sua aplicação precisa de permissões específicas, geralmente associadas ao produto "Marketing" ou soluções de recrutamento, que devem ser solicitadas no painel do desenvolvedor.

**Produtos:** Adicione os produtos relacionados a "Share" ou "Jobs" à sua aplicação.
**Permissões:** Garanta que seu app tenha permissões para w_member_social (para postar) ou permissões específicas da API de vagas da empresa.

**Observações Importantes**
**API Oficial vs. Ferramentas:** Para automações complexas, muitas empresas utilizam soluções de parceiros (como o Unipile ou Ayrshare) que facilitam a conexão com a API oficial do LinkedIn.
**Formato de Dados:** A API do LinkedIn espera, por padrão, dados em XML, mas você pode usar JSON adicionando os cabeçalhos Content-Type: application/json e x-li-format: json.
**Alternativa:** Se o objetivo é apenas postar vagas sem código, utilize a opção "Começar a contratar" diretamente no LinkedIn.`,
  },
  // === Premium ===
  {
    name: 'indeed_api',
    displayName: 'Indeed Sponsored Jobs',
    description: 'Vagas patrocinadas com maior visibilidade no Indeed',
    type: 'oauth2',
    category: 'premium',
    isAutomatic: false,
    reach: 'Global',
    cost: 'Pay-per-click',
    icon: '📊',
    requiresCredentials: true,
    status: 'available',
    requiresPartnership: true,
    partnershipUrl: 'https://www.indeed.com/hire/partners',
    scopes: ['employer_access'],
    features: ['Vagas patrocinadas', 'Analytics avançado', 'Screener questions', 'Disposition data'],
    integrationGuide: `Para gerar uma API Key no Indeed para a publicação de vagas, o processo é voltado para desenvolvedores e parceiros que utilizam as APIs de integração, como a Job Sync API ou Sponsored Jobs API.

Aqui estão os passos gerais para obter acesso:

1. Acessar o Portal do Desenvolvedor Indeed
O acesso às APIs do Indeed é gerenciado através do "Indeed Partner Docs".
Visite o portal Indeed Partner Docs.

2. Criar uma Conta de Parceiro (Partner Console)
Para integrar seus sistemas, você precisará acessar o Partner Console.
Siga as instruções para criar uma conta de parceiro ou solicitar credenciais de API.

3. Criar a API Key (Job Sync API)
A Job Sync API é comumente usada para automatizar a postagem de vagas (anúncios gratuitos ou pagos) diretamente do seu sistema de RH (ATS).
Na documentação, procure por "Job Sync API" ou "Integrate with Job Sync API" para solicitar as chaves de API (API Keys) necessárias.

4. Integração
Com a API Key em mãos, você poderá configurar o seu sistema para enviar o feed de vagas para o Indeed.
O Indeed também oferece suporte para integração direta de Sponsored Jobs (vagas patrocinadas).

**Alternativa: Postar Vagas sem API Key**
Se você não é um desenvolvedor e deseja apenas publicar vagas, não é necessário uma API Key.
Crie uma conta de empresa no Indeed.
Clique no botão "Anunciar uma vaga" e insira os detalhes manualmente.

**Nota:** As políticas e URLs do Indeed podem ser atualizadas. Recomendamos sempre verificar o portal de documentação para parceiros para obter as informações mais recentes.
**Fonte:** https://docs.indeed.com/job-sync-api/job-sync-api-guide`,
  },
  {
    name: 'vagas_com',
    displayName: 'Vagas.com.br',
    description: 'Publicação automática via API oficial do Vagas for Business',
    type: 'oauth2',
    category: 'premium',
    isAutomatic: false,
    reach: 'Brasil',
    cost: 'Pago',
    icon: '🟢',
    requiresCredentials: true,
    status: 'available',
    requiresPartnership: true,
    partnershipUrl: 'https://www.vagas.com.br/vagas-for-business',
    scopes: ['client_credentials'],
    features: ['Publicação automática', 'Gestão de vagas', 'API REST/JSON'],
    integrationGuide: `Para gerar uma API Key no Vagas.com.br, especificamente para a API de Publicação de Vagas (VaaS - Vaga Inteligente), é necessário ser um cliente do Vagas for Business e solicitar o acesso através dos canais de suporte da plataforma.

Aqui estão os passos gerais baseados na documentação de integração da Vagas.com.br:

1. Possuir o Vagas for Business
A API é voltada para clientes do sistema de recrutamento VAGAS e-partner.

2. Solicitar Acesso (Credenciais)
A geração da chave de API (API Key) e credenciais (Client ID/Client Secret) geralmente não é feita por autoatendimento, mas via suporte técnico. Você deve entrar em contato com o suporte do Vagas for Business para solicitar a "API de Publicação de Vagas".

3. Configuração da API
A autenticação utiliza o formato Client Credentials.

4. Uso da API
Com as credenciais, a publicação é feita via chamadas HTTP/JSON para a integração (VaaS - Vaga Inteligente).

Para mais informações e suporte sobre APIs e Integrações, visite: ajuda-forbusiness.vagas.com.br.`,
  },
  {
    name: 'infojobs_api',
    displayName: 'InfoJobs',
    description: 'Publicação de vagas via API SOAP do InfoJobs Brasil',
    type: 'oauth2',
    category: 'premium',
    isAutomatic: false,
    reach: 'Brasil / Europa',
    cost: 'Pago',
    icon: '🔵',
    requiresCredentials: true,
    status: 'available',
    requiresPartnership: true,
    partnershipUrl: 'https://developer.infojobs.net',
    scopes: ['createOffer', 'eraseOffer'],
    features: ['Publicação automática', 'Gestão de ofertas', 'API SOAP/XML'],
    integrationGuide: `Para gerar uma API Key no InfoJobs e integrar sistemas (como publicar vagas automaticamente), é necessário utilizar o portal do desenvolvedor do InfoJobs. O acesso geralmente requer uma conta de empresa.

Aqui estão os passos gerais baseados na documentação técnica developer.infojobs.net:

1. Acesse o portal do desenvolvedor
Vá para developer.infojobs.net.

2. Crie uma Conta/Login
Faça login com suas credenciais de empresa do InfoJobs.

3. Criar um Novo Aplicativo
No painel, procure a opção para criar um novo aplicativo ou "Create New Application".

4. Preencha os Dados
Defina um nome para sua aplicação e insira a URL de callback (necessária para autenticação OAuth 2.0).

5. Obtenha as Credenciais
Após salvar, o sistema gerará o Client ID e o Client Secret. Essas são suas chaves de API (API Key/Token) para realizar chamadas à API, como postar vagas.

**Pontos importantes:**
A API do InfoJobs utiliza OAuth 2.0 para autenticação.
Se for apenas para publicar vagas, verifique se seu plano empresa tem acesso liberado à API de integração.

**Nota:** O InfoJobs oferece a opção de publicar até 3 vagas gratuitamente por mês, mas a integração via API geralmente requer uma conta premium ou contrato específico.`,
  },
  {
    name: 'catho',
    displayName: 'Catho',
    description: 'Principal portal de vagas do Brasil',
    type: 'api_key',
    category: 'premium',
    isAutomatic: false,
    reach: 'Brasil',
    cost: 'Pago',
    icon: '🇧🇷',
    requiresCredentials: true,
    status: 'coming_soon',
    requiresPartnership: true,
    integrationGuide: `Para gerar uma API Key na Catho, geralmente voltada para empresas (Recursos Humanos) que desejam integrar sistemas de publicação de vagas, o processo envolve a solicitação de acesso à plataforma de parceria.

Passo a passo geral para obter a API Key:

1. Acesse a Área de Empresas
Entre no site da Catho voltado para empresas.

2. Solicite Acesso
A integração via API geralmente requer um contato comercial ou técnico, pois os termos de uso de APIs públicas da Catho exigem conformidade.

3. Documentação
Consulte a documentação técnica que indica a necessidade de um x-api-key e Authorization token para realizar chamadas, como GET para vagas.

4. Autenticação
O sistema utiliza x-api-key (chave de autenticação da API) e Authorization (token de acesso do usuário recuperado pelo /auth).

**Considerações Importantes:**
A Catho disponibiliza a API para integração de RH.
É necessário verificar se a sua empresa tem o perfil necessário para utilizar as soluções integradas.
Se for um desenvolvedor, geralmente o acesso é liberado após o cadastro na área de parceiros ou entrando em contato com o suporte técnico da Catho.
Para dúvidas técnicas específicas, consulte o repositório oficial da Catho no GitHub ou a documentação da API disponibilizada para parceiros.`,
  },
  // === Feed XML ===
  {
    name: 'jooble',
    displayName: 'Jooble',
    description: 'Agregador internacional de vagas com alcance em 69 países',
    type: 'api_key',
    category: 'feed_xml',
    isAutomatic: false,
    reach: '69 países',
    cost: 'Gratuito',
    icon: '🌍',
    requiresCredentials: true,
    status: 'available',
    registrationUrl: 'https://jooblehelpcenter.freshdesk.com/en/support/tickets/new',
    approvalTime: '1-3 dias úteis',
    integrationGuide: `Para gerar uma API Key no Jooble, acesse o formulário de cadastro na página oficial Jooble REST API (https://jooble.org/api/about), preencha os dados necessários e a chave será gerada para você. Após o cadastro, copie e salve essa chave, que é essencial para autenticar as requisições na API.

Passo a passo para obter a chave:

1. Acesse a página de API
Vá para br.jooble.org/api/about (https://br.jooble.org/api/about).

2. Preencha o formulário
Insira as informações solicitadas para obter acesso.

3. Receba a chave
A chave será gerada e exibida após o registro.

4. Utilização
Utilize essa chave para consultar vagas e dados no Jooble através dos endpoints documentados.

Recomenda-se guardar a chave em um local seguro após a geração.`,
    registrationSteps: [
      { title: 'Copie seu Feed XML', action: { type: 'copy', label: 'Copiar URL', value: 'feed_url' } },
      { title: 'Acesse o Portal de Suporte Jooble', description: 'Jooble usa sistema de tickets para cadastrar novos feeds XML', action: { type: 'link', label: 'Abrir Ticket no Jooble', url: 'https://jooblehelpcenter.freshdesk.com/en/support/tickets/new' } },
      { title: 'Preencha o ticket', tips: ['Assunto: "Request to add XML Feed - Job Board Integration"', 'Cole a URL do seu feed XML na descrição', 'Mencione: Format XML, Update Daily, Country Brazil', 'Opcional: anexe exemplo do XML'] },
      { title: 'Aguarde aprovação', description: 'Jooble revisará seu feed em 1-3 dias úteis e enviará confirmação por email.' },
    ],
  },
  {
    name: 'jora',
    displayName: 'Jora (by Indeed)',
    description: 'Parte do grupo Indeed, com forte presença na Ásia-Pacífico e América Latina',
    type: 'xml_feed',
    category: 'feed_xml',
    isAutomatic: false,
    reach: '25 países',
    cost: 'Gratuito',
    icon: '📋',
    requiresCredentials: false,
    status: 'available',
    registrationUrl: 'https://au.jora.com/cms/job-xml-feed',
    approvalTime: '24-48h',
    integrationGuide: 'Não foi encontrada uma documentação.',
    registrationSteps: [
      { title: 'Copie seu Feed XML', action: { type: 'copy', label: 'Copiar URL', value: 'feed_url' } },
      { title: 'Acesse o Jora for Employers', description: 'Jora é parte do grupo Indeed', action: { type: 'link', label: 'Acessar Jora', url: 'https://au.jora.com/cms/job-xml-feed' } },
      { title: 'Configure seu XML Feed', tips: ['Crie uma conta ou faça login', 'Navegue até "XML Feed Integration"', 'Cole a URL do seu feed', 'Valide o formato do feed'] },
    ],
    registrationNotes: ['Jora publica vagas automaticamente em vários países', 'Alcance especialmente forte no Brasil, Austrália e países asiáticos'],
  },
  {
    name: 'careerjet',
    displayName: 'Careerjet',
    description: 'Agregador global de vagas presente em 90+ países',
    type: 'api_key',
    category: 'feed_xml',
    isAutomatic: false,
    reach: '90+ países',
    cost: 'Gratuito',
    icon: '🔎',
    requiresCredentials: true,
    status: 'available',
    registrationUrl: 'https://www.careerjet.com/register?redir=%2Fpartners%2Fregister%2Fas-publisher',
    approvalTime: '24-48h',
    integrationGuide: `Para gerar uma API Key no Careerjet, você precisa ter uma conta de editor (publisher) no site. A chave é exclusiva para cada site que utiliza a API.

Aqui estão os passos gerais, baseados nas diretrizes do Careerjet:

1. Acesse o site de Parceiros
Vá para a página de API do Careerjet (geralmente encontrada em careerjet.com.br/partners/api ou no site local de sua região).

2. Faça Login na Conta de Editor
Entre na sua conta de editor existente. Se você ainda não tem uma, precisará criar uma conta para obter a chave.

3. Localize a seção de API
Dentro do painel do editor, procure por "API Key" ou "Parceiros" (Partners).

4. Gerar/Solicitar Chave
O sistema fornecerá uma chave de API exclusiva para o seu site.

**Informações adicionais:**
A API do Careerjet permite consultas para buscar empregos (Job Search API).
A chave de API é uma sequência alfanumérica usada para identificar e autenticar suas solicitações. Mantenha-a em segurança.
A URL padrão de integração utiliza a estrutura search.api.careerjet.net.`,
    registrationSteps: [
      { title: 'Copie seu Feed XML', action: { type: 'copy', label: 'Copiar URL', value: 'feed_url' } },
      { title: 'Crie conta como Publisher', description: 'Careerjet oferece integração direta via cadastro de publisher', action: { type: 'link', label: 'Cadastrar no Careerjet', url: 'https://www.careerjet.com/register?redir=%2Fpartners%2Fregister%2Fas-publisher' } },
      { title: 'Complete o cadastro', tips: ['Preencha dados da empresa', 'Selecione "XML Feeds for Jobs" como tipo de integração', 'Informe a URL do seu feed', 'Especifique países de interesse (Brasil)'] },
      { title: 'Aguarde aprovação', description: 'Careerjet enviará confirmação por email em 24-48h.' },
    ],
    registrationNotes: ['Careerjet tem presença em 90+ países', 'Forte na Europa e América Latina', 'Gratuito para publishers'],
  },
  {
    name: 'postjobfree',
    displayName: 'PostJobFree',
    description: 'Plataforma gratuita com foco nos EUA e Europa',
    type: 'xml_feed',
    category: 'feed_xml',
    isAutomatic: false,
    reach: 'EUA/Europa',
    cost: 'Gratuito',
    icon: '🆓',
    requiresCredentials: false,
    status: 'available',
    registrationUrl: 'https://www.postjobfree.com',
    approvalTime: 'Imediato',
    integrationGuide: 'Não foi encontrada uma documentação.',
    registrationSteps: [
      { title: 'Copie seu Feed XML', action: { type: 'copy', label: 'Copiar URL', value: 'feed_url' } },
      { title: 'Acesse PostJobFree', description: 'Plataforma gratuita com foco nos EUA e Europa', action: { type: 'link', label: 'Acessar PostJobFree', url: 'https://www.postjobfree.com' } },
      { title: 'Cadastre seu feed', tips: ['Crie uma conta de empregador', 'Vá em "XML Feed Import" ou "Post Multiple Jobs"', 'Cole a URL do seu feed', 'O processamento é automático'] },
    ],
  },
];

export const AVAILABLE_CHANNELS = ALL_CHANNELS.filter(ch => ch.category !== 'premium');

export type ChannelName = string;

// Tipo para canais premium (compatibilidade)
export type PremiumChannel = UnifiedChannel;

export const PREMIUM_CHANNELS: PremiumChannel[] = ALL_CHANNELS.filter(ch => ch.category === 'premium');

// Gera URL do feed XML para uma organização
export function getXmlFeedUrl(accountId: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'axumduklmiiptumdsgtu';
  return `https://${projectId}.supabase.co/functions/v1/jobs-xml-feed?org=${accountId}`;
}

// Hook para buscar canais configurados da organização
export function useDistributionChannels() {
  const { account } = useAccount();
  
  return useQuery({
    queryKey: ['distribution-channels', account?.id],
    queryFn: async () => {
      if (!account?.id) return [];
      
      const { data, error } = await supabase
        .from('job_distribution_channels')
        .select('*')
        .eq('account_id', account.id)
        .order('channel_name');
      
      if (error) {
        console.error('[useDistributionChannels] Error:', error);
        throw error;
      }
      
      return (data || []) as DistributionChannel[];
    },
    enabled: !!account?.id,
  });
}

// Hook para buscar logs de distribuição de uma vaga específica
export function useJobDistributionLogs(jobId: string | undefined) {
  return useQuery({
    queryKey: ['distribution-logs', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      
      const { data, error } = await supabase
        .from('job_distribution_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('channel_name');
      
      if (error) {
        console.error('[useJobDistributionLogs] Error:', error);
        throw error;
      }
      
      return (data || []) as DistributionLog[];
    },
    enabled: !!jobId,
  });
}

// Hook para marcar canal como cadastrado
export function useMarkChannelRegistered() {
  const queryClient = useQueryClient();
  const { account } = useAccount();
  
  return useMutation({
    mutationFn: async ({ 
      channelName, 
      isRegistered,
      notes,
    }: { 
      channelName: string; 
      isRegistered: boolean;
      notes?: string;
    }) => {
      if (!account?.id) throw new Error('Account not found');
      
      const { data, error } = await supabase
        .from('job_distribution_channels')
        .upsert({
          account_id: account.id,
          channel_name: channelName,
          channel_type: 'xml_feed',
          is_enabled: true,
          feed_registered_at: isRegistered ? new Date().toISOString() : null,
          notes: notes || null,
        }, {
          onConflict: 'account_id,channel_name',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-channels'] });
      toast.success('Canal atualizado com sucesso');
    },
    onError: (error) => {
      console.error('[useMarkChannelRegistered] Error:', error);
      toast.error('Erro ao atualizar canal');
    },
  });
}

// Hook para toggle de canal (habilitar/desabilitar)
export function useToggleChannel() {
  const queryClient = useQueryClient();
  const { account } = useAccount();
  
  return useMutation({
    mutationFn: async ({ 
      channelName, 
      isEnabled,
    }: { 
      channelName: string; 
      isEnabled: boolean;
    }) => {
      if (!account?.id) throw new Error('Account not found');
      
      const { data, error } = await supabase
        .from('job_distribution_channels')
        .upsert({
          account_id: account.id,
          channel_name: channelName,
          channel_type: 'xml_feed',
          is_enabled: isEnabled,
        }, {
          onConflict: 'account_id,channel_name',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-channels'] });
      toast.success(
        variables.isEnabled 
          ? 'Canal habilitado' 
          : 'Canal desabilitado'
      );
    },
    onError: (error) => {
      console.error('[useToggleChannel] Error:', error);
      toast.error('Erro ao atualizar canal');
    },
  });
}

// Hook combinado para obter status de todos os canais
export function useChannelStatus() {
  const { data: configuredChannels = [], isLoading } = useDistributionChannels();
  const { account } = useAccount();
  
  const channelStatusMap = new Map(
    configuredChannels.map(ch => [ch.channel_name, ch])
  );
  
  const allChannelsWithStatus = AVAILABLE_CHANNELS.map(channel => ({
    ...channel,
    configured: channelStatusMap.get(channel.name),
    isRegistered: !!channelStatusMap.get(channel.name)?.feed_registered_at,
    isEnabled: channelStatusMap.get(channel.name)?.is_enabled ?? false,
  }));
  
  return {
    channels: allChannelsWithStatus,
    isLoading,
    feedUrl: account?.id ? getXmlFeedUrl(account.id) : null,
  };
}
