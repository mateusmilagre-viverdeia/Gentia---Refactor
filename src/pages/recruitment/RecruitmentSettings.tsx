import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { RecruitmentLayout } from '@/components/layout/RecruitmentLayout';
import { RecruitmentNotificationSettings } from '@/components/recruitment/settings/RecruitmentNotificationSettings';
import { EmailTemplateManager } from '@/components/recruitment/settings/EmailTemplateManager';
import { PipelineSettings } from '@/components/recruitment/settings/PipelineSettings';
import { MetricThresholdSettings } from '@/components/recruitment/settings/MetricThresholdSettings';
import { CreditsSettingsTab } from '@/components/recruitment/settings/CreditsSettingsTab';
import { AgentsSettingsTab } from '@/components/recruitment/settings/AgentsSettingsTab';
import { CareersPageSettingsTab } from '@/components/recruitment/settings/CareersPageSettingsTab';
import { DistributionChannelsConfig } from '@/components/recruitment/settings/DistributionChannelsConfig';
import { ChromeExtensionDownloadCard } from '@/components/recruitment/settings/ChromeExtensionDownloadCard';
import { IndeedFeedSettingsCard } from '@/components/recruitment/settings/IndeedFeedSettingsCard';
import { PortalClientSettingsTab } from '@/components/recruitment/settings/PortalClientSettingsTab';
import { IntakeChannelsSettings } from '@/components/recruitment/settings/IntakeChannelsSettings';
import { ValuesSettingsTab } from '@/components/recruitment/settings/ValuesSettingsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEPRole } from '@/hooks/useEPRole';
import {
  Bell, Settings, Mail, GitBranch, AlertTriangle, Coins, Bot, Globe,
  Rss, Building2, Inbox, Heart
} from 'lucide-react';

export default function RecruitmentSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'creditos');
  const { isEPTeam } = useEPRole();

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações do Recrutamento
          </h1>
          <p className="text-muted-foreground">
            Gerencie as preferências e configurações do módulo de recrutamento
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex-wrap h-auto gap-1">
            {/* Essencial */}
            <TabsTrigger value="creditos" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Créditos
            </TabsTrigger>
            <TabsTrigger value="agentes" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Agentes
            </TabsTrigger>
            <TabsTrigger value="carreiras" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Carreiras
            </TabsTrigger>
            <TabsTrigger value="valores" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Valores
            </TabsTrigger>

            <span className="mx-1 h-5 w-px bg-border hidden sm:inline-block" />

            {/* Operacional */}
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="email-templates" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Templates Email
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="intake" className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Canais de Entrada
            </TabsTrigger>

            <span className="mx-1 h-5 w-px bg-border hidden sm:inline-block" />

            {/* Avançado */}
            <TabsTrigger value="metric-alerts" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="distribuicao" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            {isEPTeam && (
              <TabsTrigger value="portal-cliente" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Portal do Cliente
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="creditos" className="mt-6">
            <CreditsSettingsTab />
          </TabsContent>

          <TabsContent value="agentes" className="mt-6">
            <AgentsSettingsTab />
          </TabsContent>

          <TabsContent value="carreiras" className="mt-6">
            <CareersPageSettingsTab />
          </TabsContent>

          <TabsContent value="valores" className="mt-6">
            <ValuesSettingsTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <RecruitmentNotificationSettings />
          </TabsContent>

          <TabsContent value="email-templates" className="mt-6">
            <EmailTemplateManager />
          </TabsContent>

          <TabsContent value="pipeline" className="mt-6">
            <PipelineSettings />
          </TabsContent>

          <TabsContent value="intake" className="mt-6">
            <IntakeChannelsSettings />
          </TabsContent>

          <TabsContent value="metric-alerts" className="mt-6">
            <MetricThresholdSettings />
          </TabsContent>

          <TabsContent value="distribuicao" className="mt-6 space-y-6">
            <ChromeExtensionDownloadCard />
            <IndeedFeedSettingsCard />
            <DistributionChannelsConfig />
          </TabsContent>

          <TabsContent value="portal-cliente" className="mt-6">
            <PortalClientSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </RecruitmentLayout>
  );
}

