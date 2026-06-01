import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Simulation {
  id: string;
  nome_empresa: string;
  email: string;
  created_at: string;
  dados_simulacao: any;
}

interface SimulationSearchModalProps {
  open: boolean;
  onClose: () => void;
  onLoadSimulation: (dados: any) => void;
}

export function SimulationSearchModal({
  open,
  onClose,
  onLoadSimulation,
}: SimulationSearchModalProps) {
  const [searchType, setSearchType] = useState<'email' | 'empresa'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast({
        title: 'Atenção',
        description: 'Por favor, preencha o campo de busca',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // VERSÃO SIMPLIFICADA COM LOCALSTORAGE
      const savedSimulations = JSON.parse(localStorage.getItem('roip_simulations') || '[]');

      const results = savedSimulations.filter((sim: Simulation) => {
        if (searchType === 'email') {
          return sim.email?.toLowerCase().includes(searchValue.toLowerCase());
        } else {
          return sim.nome_empresa?.toLowerCase().includes(searchValue.toLowerCase());
        }
      });

      if (results.length === 0) {
        toast({
          title: 'Nenhuma simulação encontrada',
          description: 'Tente buscar por outro email ou nome de empresa',
        });
      }

      setSimulations(results);
    } catch (error) {
      console.error('Error searching simulations:', error);
      toast({
        title: 'Erro ao buscar',
        description: 'Ocorreu um erro ao buscar as simulações. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSimulation = (simulation: Simulation) => {
    if (simulation.dados_simulacao) {
      onLoadSimulation(simulation.dados_simulacao);
      toast({
        title: 'Simulação carregada!',
        description: 'Os dados foram preenchidos no formulário.',
      });
      onClose();
      setSearchValue('');
      setSimulations([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🔍 Buscar Simulação Salva</DialogTitle>
          <DialogDescription>
            Encontre simulações anteriores por email ou nome da empresa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Buscar por:</Label>
            <RadioGroup
              value={searchType}
              onValueChange={(value) => setSearchType(value as 'email' | 'empresa')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="empresa" id="empresa" />
                <Label htmlFor="empresa">Nome da Empresa</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2">
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={
                searchType === 'email'
                  ? 'Digite o email'
                  : 'Digite o nome da empresa'
              }
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Buscando...
                </>
              ) : (
                'Buscar'
              )}
            </Button>
          </div>
        </div>

        {simulations.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">
              Resultados ({simulations.length}):
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {simulations.map((simulation) => (
                <div
                  key={simulation.id}
                  className="p-3 border rounded-lg space-y-2 hover:bg-muted/50 transition-colors"
                >
                  <p className="font-medium text-foreground">{simulation.nome_empresa}</p>
                  <div className="text-sm text-muted-foreground">
                    <p>{simulation.email}</p>
                    <p>Simulado em: {formatDate(simulation.created_at)}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLoadSimulation(simulation)}
                    className="w-full"
                  >
                    Carregar Simulação
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
