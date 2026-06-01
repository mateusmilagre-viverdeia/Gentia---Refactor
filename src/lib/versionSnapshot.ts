import { supabase } from "@/integrations/supabase/client";

/**
 * Helper para snapshot/restore de módulos baseados em
 * uma tabela "session" + N tabelas "child" filtradas por chave.
 */

export interface SnapshotConfig {
  /** Tabela principal (sessão), com 1 linha. Ex: "ritual_sessions" */
  sessionTable?: string;
  /** id da sessão (será usado em .eq('id', sessionId)) */
  sessionId?: string;
  /** Tabelas filhas e a coluna FK que aponta para a sessão */
  childTables?: { table: string; fkColumn: string }[];
  /** Colunas da sessão a ignorar no snapshot/restore (ex: timestamps, account_id) */
  sessionSkipColumns?: string[];
  /** Colunas das filhas a ignorar (ex: id, created_at) — na restauração reinsere geramos novos */
  childSkipColumns?: string[];
}

export interface ModuleSnapshot {
  version: 1;
  session?: Record<string, any> | null;
  children: Record<string, any[]>; // por nome de tabela
}

const DEFAULT_CHILD_SKIP = ["id", "created_at", "updated_at"];

export async function captureSnapshot(cfg: SnapshotConfig): Promise<ModuleSnapshot> {
  const snap: ModuleSnapshot = { version: 1, children: {} };

  if (cfg.sessionTable && cfg.sessionId) {
    const { data } = await supabase
      .from(cfg.sessionTable as any)
      .select("*")
      .eq("id", cfg.sessionId)
      .maybeSingle();
    if (data) {
      const skip = new Set(cfg.sessionSkipColumns ?? []);
      snap.session = Object.fromEntries(
        Object.entries(data).filter(([k]) => !skip.has(k))
      );
    }
  }

  for (const child of cfg.childTables ?? []) {
    if (!cfg.sessionId) continue;
    const { data } = await supabase
      .from(child.table as any)
      .select("*")
      .eq(child.fkColumn, cfg.sessionId);
    snap.children[child.table] = (data ?? []) as any[];
  }

  return snap;
}

export async function restoreSnapshot(cfg: SnapshotConfig, snap: ModuleSnapshot) {
  // 1. Sessão: update das colunas relevantes (sem id)
  if (cfg.sessionTable && cfg.sessionId && snap.session) {
    const skip = new Set([...(cfg.sessionSkipColumns ?? []), "id"]);
    const payload = Object.fromEntries(
      Object.entries(snap.session).filter(([k]) => !skip.has(k))
    );
    if (Object.keys(payload).length > 0) {
      await supabase
        .from(cfg.sessionTable as any)
        .update(payload)
        .eq("id", cfg.sessionId);
    }
  }

  // 2. Filhas: delete-then-insert (segue o padrão do projeto)
  const childSkip = new Set([...DEFAULT_CHILD_SKIP, ...(cfg.childSkipColumns ?? [])]);
  for (const child of cfg.childTables ?? []) {
    if (!cfg.sessionId) continue;
    await supabase.from(child.table as any).delete().eq(child.fkColumn, cfg.sessionId);
    const rows = (snap.children[child.table] ?? []).map((row) =>
      Object.fromEntries(Object.entries(row).filter(([k]) => !childSkip.has(k)))
    );
    if (rows.length > 0) {
      await supabase.from(child.table as any).insert(rows as any);
    }
  }
}

export function buildCounts(snap: ModuleSnapshot): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [table, rows] of Object.entries(snap.children)) {
    const key = table.replace(/_/g, " ");
    counts[key] = rows.length;
  }
  return counts;
}
