import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useValues } from '@/contexts/ValuesContext';
import { supabase } from '@/integrations/supabase/client';
import { SelectedValue } from '@/types/values.types';

/**
 * Phase a partir do stage atual.
 * Stages 1 → phase 1 (até 20 valores)
 * Stage 2 → phase 2 (até 10 valores)
 * Stages 3+ → phase 3 (5 valores finais)
 */
function phaseForStage(stage: number): { phase: number; min: number; max: number; label: string } {
  if (stage <= 1) return { phase: 1, min: 1, max: 20, label: '20 valores' };
  if (stage === 2) return { phase: 2, min: 1, max: 10, label: '10 valores' };
  return { phase: 3, min: 5, max: 5, label: '5 valores finais' };
}

export function ValuesImportExport() {
  const { session, getSelections, saveSelections } = useValues();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    matched: SelectedValue[];
    unmatched: string[];
    existingCount: number;
  } | null>(null);

  const stage = session?.stage ?? 1;
  const cfg = phaseForStage(stage);

  const handleExport = async () => {
    if (!session) {
      toast.error('Sessão não encontrada');
      return;
    }
    const selections = await getSelections(cfg.phase);
    if (selections.length === 0) {
      toast.warning(`Nenhum valor para exportar (${cfg.label})`);
      return;
    }
    const content = selections.map((v) => v.label).join('\n') + '\n';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valores-fase-${cfg.phase}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exportado: ${selections.length} valor(es)`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !session) return;

    try {
      const text = await file.text();
      const labels = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
        )
      );

      if (labels.length === 0) {
        toast.error('Arquivo vazio');
        return;
      }

      // Lookup case-insensitive em values_catalog
      const { data: catalog, error } = await supabase
        .from('values_catalog')
        .select('id, label')
        .eq('active', true);

      if (error) throw error;

      const byLower = new Map<string, { id: string; label: string }>();
      (catalog || []).forEach((c) => byLower.set(c.label.toLowerCase(), c));

      const matched: SelectedValue[] = [];
      const unmatched: string[] = [];
      labels.forEach((l) => {
        const hit = byLower.get(l.toLowerCase());
        if (hit) matched.push({ id: hit.id, label: hit.label });
        else unmatched.push(l);
      });

      if (matched.length === 0) {
        toast.error('Nenhum valor reconhecido no catálogo');
        return;
      }

      if (matched.length > cfg.max) {
        toast.error(`Limite excedido: máximo ${cfg.max} valores nesta etapa`);
        return;
      }

      if (cfg.min === cfg.max && matched.length !== cfg.max) {
        toast.error(`Esta etapa exige exatamente ${cfg.max} valores (recebido: ${matched.length})`);
        return;
      }

      const existing = await getSelections(cfg.phase);
      setPendingImport({ matched, unmatched, existingCount: existing.length });
    } catch (err) {
      console.error('Import error:', err);
      toast.error('Erro ao ler arquivo');
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    try {
      await saveSelections(cfg.phase, pendingImport.matched);
      toast.success(
        `Importado: ${pendingImport.matched.length} valor(es)` +
          (pendingImport.unmatched.length > 0
            ? ` • ${pendingImport.unmatched.length} ignorado(s)`
            : '')
      );
      if (pendingImport.unmatched.length > 0) {
        toast.warning(`Não encontrados no catálogo: ${pendingImport.unmatched.join(', ')}`);
      }
      setPendingImport(null);
      // Recarrega para refletir mudanças (componentes da etapa atual leem no mount)
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar importação');
      setPendingImport(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Exportar valores
        </Button>
        <Button size="sm" variant="outline" onClick={handleImportClick}>
          <Upload className="h-4 w-4 mr-1" />
          Importar valores
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <AlertDialog open={!!pendingImport} onOpenChange={(o) => !o && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Vamos substituir <strong>{pendingImport?.existingCount ?? 0}</strong> valor(es)
                  atuais ({cfg.label}) por <strong>{pendingImport?.matched.length ?? 0}</strong>{' '}
                  novo(s).
                </p>
                {pendingImport && pendingImport.unmatched.length > 0 && (
                  <p className="text-destructive">
                    {pendingImport.unmatched.length} valor(es) não foram encontrados no catálogo
                    e serão ignorados: {pendingImport.unmatched.join(', ')}
                  </p>
                )}
                <p className="text-muted-foreground">
                  Esta ação não pode ser desfeita automaticamente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Substituir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
