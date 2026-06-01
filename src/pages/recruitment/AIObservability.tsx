import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { AIPerformanceDashboard } from "@/components/recruitment/ai-observability";

export default function AIObservabilityPage() {
  const navigate = useNavigate();

  return (
    <RecruitmentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/recrutamento/analytics")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Observabilidade da IA</h1>
            <p className="text-muted-foreground">
              Monitore performance, uso e custos dos modelos de IA
            </p>
          </div>
        </div>

        <AIPerformanceDashboard />
      </div>
    </RecruitmentLayout>
  );
}
