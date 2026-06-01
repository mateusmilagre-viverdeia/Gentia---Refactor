import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Mountain, Shield, Target, TrendingUp } from "lucide-react";
import { QA_DIMENSIONS, QA_PROFILES } from "@/types/qa.types";

interface QAIntroductionProps {
  onStart: () => void;
  participantName: string;
}

export function QAIntroduction({ onStart, participantName }: QAIntroductionProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
          <Mountain className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Teste QA - Quociente de Adversidade</h1>
        <p className="text-muted-foreground text-lg">
          Olá, <span className="font-semibold text-foreground">{participantName}</span>!
        </p>
        <p className="text-muted-foreground">
          Este teste avalia como você responde a situações adversas no trabalho,
          identificando padrões de resiliência e comportamento sob pressão.
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            O que vamos avaliar
          </CardTitle>
          <CardDescription>
            Quatro dimensões que compõem seu Quociente de Adversidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {Object.values(QA_DIMENSIONS).map((dim) => (
              <div key={dim.key} className={`p-4 rounded-lg border ${dim.borderColor} bg-card`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-2xl font-bold ${dim.color}`}>{dim.key}</span>
                  <span className="font-medium">{dim.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{dim.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Os Perfis QA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.values(QA_PROFILES).map((profile) => (
              <div key={profile.key} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <span className="text-3xl">{profile.emoji}</span>
                <div>
                  <h4 className={`font-semibold ${profile.color}`}>{profile.name}</h4>
                  <p className="text-sm text-muted-foreground">{profile.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-700 dark:text-amber-400">
                Importante
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Este <strong>não é um teste clínico ou psicológico</strong></li>
                <li>• É uma ferramenta de <strong>autoconhecimento e desenvolvimento</strong></li>
                <li>• Responda com sinceridade - não há respostas certas ou erradas</li>
                <li>• Imagine cada cenário acontecendo <strong>agora</strong></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span>Tempo estimado: 10-15 minutos</span>
        </div>
        <Badge variant="outline">20 cenários</Badge>
      </div>

      <Button onClick={onStart} size="lg" className="w-full">
        Iniciar Teste QA
      </Button>
    </div>
  );
}
