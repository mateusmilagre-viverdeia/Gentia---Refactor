import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { ExternalEntriesTab } from "@/components/recruitment/candidates/ExternalEntriesTab";
import { ChromeExtensionTab } from "@/components/recruitment/candidates/ChromeExtensionTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, Chrome } from "lucide-react";

export default function RecruitmentExternalEntries() {
  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Entradas Externas</h1>
          <p className="text-muted-foreground">
            Currículos recebidos via WhatsApp, e-mail e perfis capturados pela extensão Chrome.
          </p>
        </div>
        <Tabs defaultValue="inbox" className="w-full">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Inbox className="h-4 w-4" /> WhatsApp & E-mail
            </TabsTrigger>
            <TabsTrigger value="extension" className="gap-2">
              <Chrome className="h-4 w-4" /> Extensão Chrome
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-6"><ExternalEntriesTab /></TabsContent>
          <TabsContent value="extension" className="mt-6"><ChromeExtensionTab /></TabsContent>
        </Tabs>
      </div>
    </RecruitmentLayout>
  );
}
