import { useVersionHistory } from "@/hooks/useVersionHistory";
import { VersionHistorySheet } from "./VersionHistorySheet";
import type { ModuleVersion } from "@/hooks/useVersionHistory";

interface Props<T> {
  moduleKey: string;
  entityId?: string | null;
  serialize: () => T | Promise<T>;
  apply: (snapshot: T) => void | Promise<void>;
  buildSummary?: (snapshot: T) => ModuleVersion["summary"];
  triggerLabel?: string;
  enabled?: boolean;
}

export function VersionHistoryButton<T = any>(props: Props<T>) {
  const { triggerLabel, ...hookOpts } = props;
  const { versions, loading, saving, saveSnapshot, restore, remove } =
    useVersionHistory<T>(hookOpts);

  return (
    <VersionHistorySheet
      versions={versions}
      loading={loading}
      saving={saving}
      onSave={saveSnapshot}
      onRestore={restore}
      onRemove={remove}
      triggerLabel={triggerLabel}
    />
  );
}
