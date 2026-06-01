import { useOrganization } from "@/contexts/OrganizationContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AccessDenied } from "@/components/permissions/AccessDenied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailConfigTab } from "@/components/admin/platform/EmailConfigTab";
import { WhatsAppConfigTab } from "@/components/admin/platform/WhatsAppConfigTab";
import { AIServicesConfigTab } from "@/components/admin/platform/AIServicesConfigTab";
import { StripeConfigTab } from "@/components/admin/platform/StripeConfigTab";
import { AccountsCreditsTab } from "@/components/admin/platform/AccountsCreditsTab";
import { TestRecruitmentTab } from "@/components/admin/platform/TestRecruitmentTab";
import { AIPromptsTab } from "@/components/admin/platform/AIPromptsTab";
import { Mail, MessageCircle, Settings2, Brain, CreditCard, Building2, Play, FileText } from "lucide-react";

const EP_PARTNERS_ACCOUNT_ID = '67f66f7a-d9a8-455e-8820-ee836cfe7401';

export default function PlatformSettings() {
  const { currentAccount, loading: orgLoading } = useOrganization();

  if (!orgLoading && currentAccount?.id !== EP_PARTNERS_ACCOUNT_ID) {
    return (
      <AppLayout title="Configurações da Plataforma">
        <AccessDenied
          title="Acesso Restrito"
          description="Esta área é exclusiva para administradores da EP Partners."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Configurações da Plataforma"
      breadcrumb={[
        { label: "Administração", href: "/admin/dashboard" },
        { label: "Configurações da Plataforma" },
      ]}
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Configurações da Plataforma</h1>
            <p className="text-sm text-muted-foreground">
              Configurações globais de comunicação — aplicadas a todas as contas da plataforma.
            </p>
          </div>
        </div>

        <Tabs defaultValue="email" className="space-y-4">
          <TabsList className="grid w-full max-w-5xl grid-cols-7">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email / SMTP
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="ai-services" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Serviços de IA
            </TabsTrigger>
            <TabsTrigger value="ai-prompts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Prompts da IA
            </TabsTrigger>
            <TabsTrigger value="stripe" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Stripe
            </TabsTrigger>
            <TabsTrigger value="accounts-credits" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Contas & Créditos
            </TabsTrigger>
            <TabsTrigger value="test-e2e" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Teste E2E
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <EmailConfigTab />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppConfigTab />
          </TabsContent>

          <TabsContent value="ai-services">
            <AIServicesConfigTab />
          </TabsContent>

          <TabsContent value="ai-prompts">
            <AIPromptsTab />
          </TabsContent>

          <TabsContent value="stripe">
            <StripeConfigTab />
          </TabsContent>

          <TabsContent value="accounts-credits">
            <AccountsCreditsTab />
          </TabsContent>

          <TabsContent value="test-e2e">
            <TestRecruitmentTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
