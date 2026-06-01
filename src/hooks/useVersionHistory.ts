import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { toast } from "sonner";

export type VersionTrigger = "manual" | "auto_stage" | "auto_save" | "pre_restore";

export interface ModuleVersion {
  id: string;
  account_id: string;
  module_key: string;
  entity_id: string | null;
  snapshot: any;
  summary: { label?: string; description?: string; counts?: Record<string, number> };
  trigger_type: VersionTrigger;
  label: string | null;
  created_by: string | null;
  created_at: string;
}

interface Options<T> {
  moduleKey: string;
  entityId?: string | null;
  serialize: () => T | Promise<T>;
  apply: (snapshot: T) => void | Promise<void>;
  buildSummary?: (snapshot: T) => ModuleVersion["summary"];
  enabled?: boolean;
}

export function useVersionHistory<T = any>(opts: Options<T>) {
  const { moduleKey, entityId, serialize, apply, buildSummary, enabled = true } = opts;
  const { account } = useAccount();
  const accountId = account?.id ?? null;
  const [versions, setVersions] = useState<ModuleVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!accountId || !enabled) return;
    setLoading(true);
    let query = supabase
      .from("module_version_history" as any)
      .select("*")
      .eq("account_id", accountId)
      .eq("module_key", moduleKey)
      .order("created_at", { ascending: false })
      .limit(50);
    if (entityId) query = query.eq("entity_id", entityId);
    const { data, error } = await query;
    if (!error && data) setVersions(data as unknown as ModuleVersion[]);
    setLoading(false);
  }, [accountId, moduleKey, entityId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const saveSnapshot = useCallback(
    async (trigger: VersionTrigger = "manual", label?: string) => {
      if (!accountId) return;
      setSaving(true);
      try {
        const snapshot = await serialize();
        if (snapshot == null) {
          setSaving(false);
          return;
        }
        const summary = buildSummary ? buildSummary(snapshot) : {};
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase.from("module_version_history" as any).insert({
          account_id: accountId,
          module_key: moduleKey,
          entity_id: entityId ?? null,
          snapshot: snapshot as any,
          summary,
          trigger_type: trigger,
          label: label ?? null,
          created_by: userData.user?.id ?? null,
        });
        if (error) throw error;
        if (trigger === "manual") toast.success("Versão salva");
        await load();
      } catch (e: any) {
        console.error("[useVersionHistory] save error", e);
        toast.error("Não foi possível salvar a versão");
      } finally {
        setSaving(false);
      }
    },
    [accountId, moduleKey, entityId, serialize, buildSummary, load]
  );

  const restore = useCallback(
    async (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version) return;
      try {
        // Snapshot atual antes de restaurar
        await saveSnapshot("pre_restore", "Antes da restauração");
        await apply(version.snapshot as T);
        toast.success("Versão restaurada");
      } catch (e: any) {
        console.error("[useVersionHistory] restore error", e);
        toast.error("Não foi possível restaurar a versão");
      }
    },
    [versions, saveSnapshot, apply]
  );

  const remove = useCallback(
    async (versionId: string) => {
      const { error } = await supabase
        .from("module_version_history" as any)
        .delete()
        .eq("id", versionId);
      if (error) {
        toast.error("Não foi possível excluir a versão");
        return;
      }
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
    },
    []
  );

  return { versions, loading, saving, saveSnapshot, restore, remove, reload: load };
}
