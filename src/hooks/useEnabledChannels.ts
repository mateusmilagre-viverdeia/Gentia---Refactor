import { useMemo } from 'react';
import { ALL_CHANNELS, useDistributionChannels, type UnifiedChannel } from './useJobDistribution';

export interface EnabledChannel extends UnifiedChannel {
  isEnabled: boolean;
  dbChannelId?: string;
}

/**
 * Returns all non-automatic channels enriched with their enabled status from the DB.
 * Used in ClientChannelSelector and the wizard's Step 4.
 */
export function useEnabledChannels() {
  const { data: configuredChannels = [], isLoading } = useDistributionChannels();

  const channels = useMemo(() => {
    const dbMap = new Map(configuredChannels.map(ch => [ch.channel_name, ch]));

    return ALL_CHANNELS
      .filter(ch => ch.category !== 'automatic')
      .map(ch => ({
        ...ch,
        isEnabled: dbMap.get(ch.name)?.is_enabled ?? false,
        dbChannelId: dbMap.get(ch.name)?.id,
      })) as EnabledChannel[];
  }, [configuredChannels]);

  const enabledChannels = useMemo(
    () => channels.filter(ch => ch.isEnabled),
    [channels],
  );

  return { channels, enabledChannels, isLoading };
}
