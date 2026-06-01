import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, TrendingUp, Target, Award } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage = ({ onStart }: LandingPageProps) => {
  const benefits = [
    {
      icon: Users,
      title: 'Cultura Organizacional',
      description: 'Avalie o nível de engajamento e alinhamento cultural da sua equipe'
    },
    {
      icon: TrendingUp,
      title: 'Atração de Talentos',
      description: 'Entenda como sua empresa atrai e seleciona os melhores profissionais'
    },
    {
      icon: Target,
      title: 'Retenção de Pessoas',
      description: 'Identifique pontos críticos para manter seus talentos na organização'
    },
    {
      icon: Award,
      title: 'Resultados & Processos',
      description: 'Mensure a efetividade dos processos e o alcance de resultados'
    }
  ];

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Assessment ROIP
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Retorno sobre Investimento em Pessoas: avalie a maturidade organizacional 
            da sua empresa em 4 pilares estratégicos
          </p>
          <Button size="lg" onClick={onStart} className="px-8">
            Iniciar Assessment
          </Button>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <benefit.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{benefit.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground"
        >
          <p>
            20 perguntas • 10 minutos • 
            <span className="text-primary"> Análise com IA</span> • Relatório em PDF
          </p>
        </motion.div>
      </div>
    </div>
  );
};
