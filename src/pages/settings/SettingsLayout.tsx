import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";

export default function SettingsLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <SettingsSidebar />
      <div className="flex-1">
        <header className="border-b border-border px-6 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Início
          </Button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
