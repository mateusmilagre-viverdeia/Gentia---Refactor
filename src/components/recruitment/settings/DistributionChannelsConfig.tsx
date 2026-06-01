import { useEPRole } from '@/hooks/useEPRole';
import { IntegrationChannelsList } from './IntegrationChannelsList';
import { ClientChannelSelector } from './ClientChannelSelector';

export function DistributionChannelsConfig() {
  const { isEPTeam, loading } = useEPRole();

  if (loading) return null;

  if (isEPTeam) {
    return <IntegrationChannelsList />;
  }

  return <ClientChannelSelector />;
}
