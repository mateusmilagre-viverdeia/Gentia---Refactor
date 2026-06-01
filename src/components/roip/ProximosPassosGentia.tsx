import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Clock, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';

interface GentiaFerramenta {
  id: string;
  nome: string;
  rota: string;
  externo?: boolean;
}

interface ProximoPasso {
  ordem: number;
  ferramenta: GentiaFerramenta;
  pilar: string;
  objetivo: string;
  por_que_agora: string;
  prazo_sugerido: string;
  resultado_esperado: string;
  prerequisito?: string | null;
}

interface ProximosPassosGentiaProps {
  passos: ProximoPasso[];
}

const PILLAR_COLORS: Record<string, { bg: string; text: string; node: string }> = {
  'Cultura': { bg: 'bg-purple-100', text: 'text-purple-700', node: 'bg-purple-500' },
  'Atração': { bg: 'bg-blue-100', text: 'text-blue-700', node: 'bg-blue-500' },
  'Retenção': { bg: 'bg-green-100', text: 'text-green-700', node: 'bg-green-500' },
  'Resultado': { bg: 'bg-amber-100', text: 'text-amber-700', node: 'bg-amber-500' },
};

export const ProximosPassosGentia = ({ passos }: ProximosPassosGentiaProps) => {
  const navigate = useNavigate();
  
  const handleNavigate = (passo: ProximoPasso) => {
    if (passo.ferramenta.externo) {
      window.open(passo.ferramenta.rota, '_blank');
    } else {
      navigate(passo.ferramenta.rota);
    }
  };

  const getPillarColor = (pilar: string) => {
    return PILLAR_COLORS[pilar] || { bg: 'bg-gray-100', text: 'text-gray-700', node: 'bg-gray-500' };
  };

  if (!passos || passos.length === 0) return null;

  return (
    <Card className="border-2 border-primary/20 overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Próximos 3 Passos
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        {/* Horizontal Timeline */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-8 left-[10%] right-[10%] h-1 bg-muted rounded-full" />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '33.33%' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-8 left-[10%] h-1 bg-primary rounded-full"
          />

          {/* Steps */}
          <div className="relative flex justify-between px-4">
            {passos.slice(0, 3).map((passo, index) => {
              const pillarColors = getPillarColor(passo.pilar);
              const isFirst = index === 0;
              
              return (
                <motion.div
                  key={passo.ordem}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="flex flex-col items-center text-center"
                  style={{ width: '30%' }}
                >
                  {/* Node */}
                  <div className={`
                    relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all
                    ${isFirst 
                      ? `${pillarColors.node} border-white ring-4 ring-primary/30 text-white shadow-xl` 
                      : 'bg-muted border-background text-muted-foreground'
                    }
                  `}>
                    <span className="font-bold text-2xl">{passo.ordem}</span>
                  </div>

                  {/* Content */}
                  <div className="mt-4 space-y-2">
                    <h5 className={`font-bold text-sm ${isFirst ? pillarColors.text : 'text-muted-foreground'}`}>
                      {passo.ferramenta.nome}
                    </h5>
                    
                    {/* Objective - truncated */}
                    {passo.objetivo && (
                      <p className={`text-xs line-clamp-2 ${isFirst ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                        {passo.objetivo.length > 50 ? passo.objetivo.slice(0, 50) + '...' : passo.objetivo}
                      </p>
                    )}
                    
                    <div className="flex justify-center gap-1 flex-wrap">
                      <Badge className={`${pillarColors.bg} ${pillarColors.text} border-0 text-xs`}>
                        {passo.pilar}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-0.5">
                        <Clock className="h-3 w-3" />
                        {passo.prazo_sugerido}
                      </Badge>
                    </div>

                    {/* Action Button */}
                    <Button 
                      onClick={() => handleNavigate(passo)}
                      size="sm"
                      variant={isFirst ? 'default' : 'outline'}
                      className="mt-2"
                    >
                      {passo.ferramenta.externo ? (
                        <>
                          Acessar
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </>
                      ) : (
                        <>
                          {isFirst ? 'Iniciar' : 'Ver'}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
