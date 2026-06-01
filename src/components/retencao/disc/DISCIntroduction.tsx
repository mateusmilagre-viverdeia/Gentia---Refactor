import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Target, 
  Brain, 
  Shield,
  Zap,
  Users,
  Heart,
  CheckCircle2
} from "lucide-react";
import { DISCSession } from "@/types/disc.types";

interface DISCIntroductionProps {
  session: DISCSession;
  onStart: () => void;
  onBack: () => void;
}

const discProfiles = [
  {
    letter: "D",
    name: "Dominância",
    description: "Foco em resultados e ação direta",
    icon: Target,
    color: "bg-red-500",
    textColor: "text-red-500",
    bgLight: "bg-red-500/10",
  },
  {
    letter: "I",
    name: "Influência",
    description: "Comunicação e entusiasmo",
    icon: Users,
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    bgLight: "bg-yellow-500/10",
  },
  {
    letter: "S",
    name: "Estabilidade",
    description: "Cooperação e consistência",
    icon: Heart,
    color: "bg-green-500",
    textColor: "text-green-500",
    bgLight: "bg-green-500/10",
  },
  {
    letter: "C",
    name: "Conformidade",
    description: "Precisão e qualidade",
    icon: Shield,
    color: "bg-blue-500",
    textColor: "text-blue-500",
    bgLight: "bg-blue-500/10",
  },
];

const howItWorks = [
  {
    icon: Brain,
    title: "32 Perguntas",
    description: "Responda de forma intuitiva, sem pensar muito",
  },
  {
    icon: Clock,
    title: "10-15 minutos",
    description: "Tempo médio para completar o assessment",
  },
  {
    icon: Zap,
    title: "Sem respostas certas",
    description: "Não há certo ou errado, apenas seu perfil natural",
  },
];

export function DISCIntroduction({ session, onStart, onBack }: DISCIntroductionProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Brain className="h-4 w-4" />
          Assessment Comportamental
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Descubra seu Perfil DISC
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          O DISC é uma metodologia que identifica seu estilo comportamental predominante,
          ajudando você a entender como você se comunica, toma decisões e interage com os outros.
        </p>
      </motion.div>

      {/* DISC Profiles Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {discProfiles.map((profile, index) => (
          <motion.div
            key={profile.letter}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className={`relative overflow-hidden border-2 hover:border-primary/50 transition-all cursor-default ${profile.bgLight}`}>
              <CardContent className="p-4 text-center space-y-3">
                <div className={`w-14 h-14 mx-auto rounded-full ${profile.color} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{profile.letter}</span>
                </div>
                <div>
                  <h3 className={`font-semibold ${profile.textColor}`}>{profile.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{profile.description}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-center">Como funciona?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {howItWorks.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-semibold text-center">Dicas para o Assessment</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "Responda com sua primeira reação, sem analisar demais",
            "Pense em como você age naturalmente, não como gostaria de agir",
            "Não existe perfil melhor ou pior",
            "Seja honesto consigo mesmo para resultados mais precisos"
          ].map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.05 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{tip}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Participant Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20"
      >
        <p className="text-sm text-muted-foreground">Assessment para</p>
        <p className="text-lg font-semibold text-primary">{session.participant_name}</p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex items-center justify-between"
      >
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button size="lg" onClick={onStart} className="gap-2">
          Começar Assessment
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
