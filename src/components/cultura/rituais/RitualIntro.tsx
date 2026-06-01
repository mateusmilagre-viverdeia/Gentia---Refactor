import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRitual } from "@/contexts/RitualContext";
import { ArrowRight } from "lucide-react";
import logoGentia from "@/assets/logo-gentia.png";
import { RitualStageInstructions } from "./RitualStageInstructions";

export function RitualIntro() {
  const { updateStage } = useRitual();

  const handleStart = () => {
    updateStage(1); // Start with management rituals selection
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-center">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto" />
      </div>

      <RitualStageInstructions stage={0} />

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Rituais de Cultura</CardTitle>
          <CardDescription className="text-base">
            Construa os rituais que irão sustentar e fortalecer a cultura da sua empresa, 
            começando pelos rituais de gestão que já existem.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-center">Como funciona o processo:</h3>
            <div className="grid gap-3">
              {[
                { icon: '📋', title: 'Rituais de Gestão', desc: 'Identifique os rituais de gestão que sua empresa já pratica' },
                { icon: '🤖', title: 'Análise da IA', desc: 'A IA cruza seus rituais com os pilares da cultura e recomenda ações' },
                { icon: '🏛️', title: '4 Pilares de Cultura', desc: 'Artefatos, Gestão, Valores e Indicadores' },
                { icon: '🧠', title: 'Análise Final', desc: 'A IA compila tudo e sugere iniciativas de alto impacto' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleStart}>
              Começar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
