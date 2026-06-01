import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Users, Target, TrendingUp, Award } from 'lucide-react';

interface InstructionsPageProps {
  onNext: () => void;
  onBack: () => void;
}

export const InstructionsPage = ({ onNext, onBack }: InstructionsPageProps) => {
  const pillars = [
    {
      icon: Users,
      title: 'Cultura Organizacional',
      description: 'Propósito, valores e cultura'
    },
    {
      icon: TrendingUp,
      title: 'Atração',
      description: 'Capacidade de atrair talentos'
    },
    {
      icon: Target,
      title: 'Retenção',
      description: 'Engajamento e desenvolvimento'
    },
    {
      icon: Award,
      title: 'Resultados',
      description: 'Conexão pessoas-estratégia-performance'
    }
  ];

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Como Funciona o Assessment</h1>
          <p className="text-muted-foreground">
            Você responderá 20 perguntas sobre 4 pilares fundamentais • ⏱️ Tempo: 3-5 minutos
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 text-center h-full">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <pillar.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground">{pillar.title}</h3>
                  <p className="text-xs text-muted-foreground">{pillar.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Instruções de Preenchimento:</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold">•</span>
              <p className="text-sm text-muted-foreground">Leia cada pergunta com atenção e responda de forma sincera</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold">•</span>
              <div className="text-sm text-muted-foreground">
                <p>Use a escala de 1 a 5:</p>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>1 = Não existe</li>
                  <li>2 = Tentamos implementar, mas não está rodando</li>
                  <li>3 = Está rodando mas não é satisfatório</li>
                  <li>4 = É satisfatório</li>
                  <li>5 = É um ponto muito forte</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold">•</span>
              <p className="text-sm text-muted-foreground">Responda com base na realidade prática da sua empresa hoje, não no ideal</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary font-bold">•</span>
              <p className="text-sm text-muted-foreground">Não há respostas certas ou erradas - queremos entender a situação atual</p>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Ao final, você receberá uma análise completa com IA e um relatório em PDF
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={onNext}>
            Iniciar Questionário
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
