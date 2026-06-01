import { useDevelopment } from '@/contexts/DevelopmentContext';
import { DevelopmentSelect20 } from './DevelopmentSelect20';
import { DevelopmentSelect10 } from './DevelopmentSelect10';
import { DevelopmentSelect5 } from './DevelopmentSelect5';
import { DevelopmentApproval } from './DevelopmentApproval';
import { DevelopmentSummary } from './DevelopmentSummary';

export function DevelopmentWizard() {
  const { session, loading } = useDevelopment();

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Erro ao carregar sessão</div>;
  }

  switch (session.stage) {
    case 1:
      return <DevelopmentSelect20 />;
    case 2:
      return <DevelopmentSelect10 />;
    case 3:
      return <DevelopmentSelect5 />;
    case 4:
      return <DevelopmentApproval />;
    case 5:
      return <DevelopmentSummary />;
    default:
      return <DevelopmentSelect20 />;
  }
}
