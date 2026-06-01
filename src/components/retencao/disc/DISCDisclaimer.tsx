import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Heart, Sparkles } from "lucide-react";

export function DISCDisclaimer() {
  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50 flex-shrink-0">
            <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Importante lembrar
            </h4>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este relatório descreve <strong className="text-foreground">tendências comportamentais</strong>, 
              não define quem você é. O DISC é uma ferramenta de autoconhecimento, não de rotulagem.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  O DISC identifica padrões, não limita potencial
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  Comportamentos podem ser adaptados conforme contexto
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  Nenhum perfil é melhor ou pior que outro
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  O objetivo é autoconhecimento, não rótulo
                </span>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2 border-t border-amber-200 dark:border-amber-900">
              Use este relatório como ponto de partida para reflexão e desenvolvimento pessoal, 
              não como definição permanente de personalidade.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
