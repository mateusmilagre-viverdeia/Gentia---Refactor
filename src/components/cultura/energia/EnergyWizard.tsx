import { useEnergy } from '@/contexts/EnergyContext';
import { EnergySelect20 } from './EnergySelect20';
import { EnergySelect10 } from './EnergySelect10';
import { EnergySelect5 } from './EnergySelect5';
import { EnergyApproval } from './EnergyApproval';
import { EnergySummary } from './EnergySummary';

export function EnergyWizard() {
  const { session, loading } = useEnergy();

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando sessão...</div>;
  }

  if (!session) {
    return <div className="text-center py-8 text-muted-foreground">Erro ao carregar sessão</div>;
  }

  switch (session.stage) {
    case 1:
      return <EnergySelect20 />;
    case 2:
      return <EnergySelect10 />;
    case 3:
      return <EnergySelect5 />;
    case 4:
      return <EnergyApproval />;
    case 5:
      return <EnergySummary />;
    default:
      return <EnergySelect20 />;
  }
}
