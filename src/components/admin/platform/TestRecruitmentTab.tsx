import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2, Play, Trash2, Mail, Phone, User, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface CommStatus {
  whatsapp: { sent: boolean; count: number; details: any[] };
  email: { sent: boolean; count: number; details: any[] };
  all: any[];
}

interface IntegrityCheck {
  passed: boolean;
  detail: string;
}

interface StepLog {
  step: string;
  status: "pending" | "running" | "success" | "error" | "warning";
  message: string;
  data?: any;
  communications?: CommStatus;
  integrityChecks?: Record<string, IntegrityCheck>;
  pipelineChecks?: Record<string, any>;
}

const CHECK_LABELS: Record<string, string> = {
  screening_exists: "Resultado de triagem existe",
  cultural_session_exists: "Sessão cultural existe",
  cultural_candidate_linked: "candidate_id linkado na sessão",
  cultural_score_above_zero: "matching_score > 0",
  cultural_analysis_present: "matching_analysis preenchido",
  cultural_responses_exist: "Respostas gravadas no banco",
  cultural_responses_timestamps: "Respostas com timestamps",
  disc_session_exists: "Sessão DISC existe",
  disc_results_exist: "Resultados DISC salvos",
  disc_score_above_zero: "match_score > 0",
  technical_session_exists: "Sessão técnica existe",
  technical_score_above_zero: "overall_score > 0",
  technical_candidate_linked: "candidate_id linkado",
  application_status: "Application existe",
  // Pipeline checks
  sessionCompleted: "Sessão completada",
  candidateLinked: "candidate_id linkado",
  scoreAboveZero: "Score > 0",
  analysisPresent: "Análise gerada",
  responsesHaveTimestamps: "Respostas com timestamps",
  responsesHaveContent: "Respostas com conteúdo",
};

export function TestRecruitmentTab() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [forceAllSteps, setForceAllSteps] = useState(false);
  const [useFullPipeline, setUseFullPipeline] = useState(true);
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [testData, setTestData] = useState<{
    candidateId?: string;
    applicationId?: string;
    candidateName?: string;
    candidateEmail?: string;
    candidatePhone?: string;
  }>({});

  const accountId = currentOrganization?.id;

  const { data: jobs } = useQuery({
    queryKey: ["test-jobs", accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title, status")
        .eq("account_id", accountId)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!accountId,
  });

  const { data: workflowSteps } = useQuery({
    queryKey: ["test-workflow", selectedJobId],
    queryFn: async () => {
      if (!selectedJobId) return [];
      const { data } = await supabase
        .from("recruitment_job_workflow_steps")
        .select("*")
        .eq("job_id", selectedJobId)
        .eq("is_active", true)
        .order("position");
      return data || [];
    },
    enabled: !!selectedJobId,
  });

  const addLog = useCallback((step: string, status: StepLog["status"], message: string, extra?: Partial<StepLog>) => {
    setLogs((prev) => {
      const existing = prev.findIndex((l) => l.step === step);
      const entry: StepLog = { step, status, message, ...extra };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  }, []);

  const invoke = useCallback(async (body: any) => {
    const { data, error } = await supabase.functions.invoke("test-recruitment-simulate", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const runFullTest = useCallback(async () => {
    if (!selectedJobId || !accountId) return;
    setRunning(true);
    setLogs([]);
    setTestData({});

    try {
      addLog("setup", "running", "Criando candidato e application de teste...");
      const setup = await invoke({ action: "setup", jobId: selectedJobId, accountId, forceAllSteps });
      setTestData({
        candidateId: setup.candidateId,
        applicationId: setup.applicationId,
        candidateName: setup.candidateName,
        candidateEmail: setup.candidateEmail,
        candidatePhone: setup.candidatePhone,
      });
      addLog("setup", "success", `Candidato: ${setup.candidateName} (${setup.candidateEmail}) | Application: ${setup.applicationId}`, { data: setup });

      const orderedSteps: string[] = setup.stepsToRun || ["cultural", "disc", "technical"];

      for (const stepType of orderedSteps) {
        const label = stepType === "screening" ? "Triagem Inicial" : stepType === "cultural" ? "Fit Cultural" : stepType === "disc" ? "Fit Comportamental (DISC)" : "Avaliação Técnica";
        
        // Decide if we use full pipeline for cultural
        const actionName = (stepType === "cultural" && useFullPipeline) ? "simulate-cultural-full" : `simulate-${stepType}`;
        const pipelineLabel = (stepType === "cultural" && useFullPipeline) ? " (pipeline real)" : "";
        
        addLog(stepType, "running", `Simulando ${label}${pipelineLabel}...`);
        await new Promise((r) => setTimeout(r, 1500));

        const result = await invoke({
          action: actionName,
          jobId: selectedJobId,
          accountId,
          candidateId: setup.candidateId,
          applicationId: setup.applicationId,
        });

        const comms: CommStatus | undefined = result.communications;

        // Check for pipeline checks (from simulate-cultural-full)
        const pipelineChecks = result.pipelineChecks;
        
        if (result.orchestratorStatus === "error" || result.success === false) {
          addLog(stepType, "error", `${label}: Falhou ✗ ${result.orchestratorError || "Pipeline retornou erros"}`, { data: result, communications: comms, pipelineChecks });
        } else {
          addLog(stepType, "success", `${label}: Aprovado ✓ | Orchestrator: OK`, { data: result, communications: comms, pipelineChecks });
        }

        // Run data integrity verification after each step
        addLog(`verify-${stepType}`, "running", `Verificando integridade: ${label}...`);
        try {
          const integrity = await invoke({
            action: "verify-data-integrity",
            jobId: selectedJobId,
            accountId,
            candidateId: setup.candidateId,
            stepType,
          });

          const failedCount = Object.values(integrity.checks as Record<string, IntegrityCheck>).filter((c) => !c.passed).length;
          const totalCount = Object.keys(integrity.checks).length;

          if (failedCount > 0) {
            addLog(`verify-${stepType}`, "warning", `Integridade ${label}: ${totalCount - failedCount}/${totalCount} checks passaram`, { integrityChecks: integrity.checks });
          } else {
            addLog(`verify-${stepType}`, "success", `Integridade ${label}: ${totalCount}/${totalCount} checks passaram ✓`, { integrityChecks: integrity.checks });
          }
        } catch (verifyErr: any) {
          addLog(`verify-${stepType}`, "error", `Erro na verificação: ${verifyErr.message}`);
        }
      }

      addLog("final", "running", "Verificando status final da application...");
      const { data: finalApp } = await supabase
        .from("recruitment_applications")
        .select("status")
        .eq("id", setup.applicationId)
        .single();

      const allCommsResult = await invoke({
        action: "check-communications",
        jobId: selectedJobId,
        accountId,
        candidateId: setup.candidateId,
        since: new Date(Date.now() - 300000).toISOString(),
      });

      addLog("final", "success", `Status final: ${finalApp?.status || "desconhecido"} | Total comunicações: ${allCommsResult.communications?.all?.length || 0}`, {
        data: { applicationStatus: finalApp?.status, totalCommunications: allCommsResult.communications },
        communications: allCommsResult.communications,
      });

      toast.success("Teste completo finalizado!");

      // Auto-cleanup
      try {
        await invoke({
          action: "cleanup",
          jobId: selectedJobId,
          accountId,
          candidateId: testData.candidateId || setup.candidateId,
          applicationId: testData.applicationId || setup.applicationId,
        });
        addLog("cleanup", "success", "Dados de teste removidos automaticamente ✓");
      } catch (cleanupErr: any) {
        addLog("cleanup", "error", `Falha ao limpar dados de teste: ${cleanupErr.message}`);
      }
    } catch (err: any) {
      addLog("error", "error", `Erro: ${err.message}`);
      toast.error(`Erro no teste: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }, [selectedJobId, accountId, forceAllSteps, useFullPipeline, addLog, invoke]);

  const cleanup = useCallback(async () => {
    if (!testData.candidateId && !testData.applicationId) return;
    try {
      await invoke({
        action: "cleanup",
        jobId: selectedJobId,
        accountId,
        candidateId: testData.candidateId,
        applicationId: testData.applicationId,
      });
      setLogs([]);
      setTestData({});
      toast.success("Dados de teste removidos");
    } catch (err: any) {
      toast.error(`Erro ao limpar: ${err.message}`);
    }
  }, [testData, selectedJobId, accountId, invoke]);

  const renderIntegrityChecks = (checks: Record<string, IntegrityCheck>) => (
    <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
      {Object.entries(checks).map(([key, check]) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          {check.passed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          <span className={check.passed ? "" : "text-destructive font-medium"}>
            {CHECK_LABELS[key] || key}: <span className="text-muted-foreground">{check.detail}</span>
          </span>
        </div>
      ))}
    </div>
  );

  const renderPipelineChecks = (checks: Record<string, any>) => {
    const items = [
      { key: "sessionCompleted", passed: checks.sessionCompleted },
      { key: "candidateLinked", passed: checks.candidateLinked },
      { key: "scoreAboveZero", passed: checks.scoreAboveZero, detail: `Score: ${checks.scoreValue || 0}` },
      { key: "analysisPresent", passed: checks.analysisPresent },
      { key: "responsesHaveTimestamps", passed: checks.responsesHaveTimestamps, detail: `${checks.responsesCount} respostas` },
      { key: "responsesHaveContent", passed: checks.responsesHaveContent },
    ];

    return (
      <div className="mt-2 space-y-1 pl-2 border-l-2 border-primary/30">
        <p className="text-xs font-medium text-primary mb-1">🔬 Pipeline Real</p>
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs">
            {item.passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
            <span className={item.passed ? "" : "text-destructive font-medium"}>
              {CHECK_LABELS[item.key] || item.key}
              {item.detail && <span className="text-muted-foreground ml-1">({item.detail})</span>}
            </span>
          </div>
        ))}
        {checks.pipelineError && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Erro: {checks.pipelineError}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Teste E2E — Fluxo do Candidato</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Simula um candidato aprovado em todas as etapas para validar o fluxo do orchestrator, pipeline de transcrição e envio de comunicações.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <User className="h-5 w-5 text-primary" />
            <span className="font-medium">Candidato de teste:</span>
            <Badge variant="secondary" className="gap-1">
              <User className="h-3 w-3" />
              Guilherme Filho
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Mail className="h-3 w-3" />
              gg@ecpmais.com.br
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Phone className="h-3 w-3" />
              81 99978-8881
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuração</CardTitle>
          <CardDescription>Selecione a vaga para testar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vaga ativa</label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma vaga..." />
              </SelectTrigger>
              <SelectContent>
                {(jobs || []).map((job) => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedJobId && workflowSteps && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Workflow:</span>
              {workflowSteps.length > 0 ? (
                workflowSteps.map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="text-xs">
                    {s.position + 1}. {s.step_type === "screening" ? "Triagem" : s.step_type === "cultural" ? "Cultural" : s.step_type === "disc" ? "DISC" : "Técnico"}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs">Sem workflow configurado (usará ordem padrão)</Badge>
              )}
            </div>
          )}

          {selectedJobId && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Switch id="force-all-steps" checked={forceAllSteps} onCheckedChange={setForceAllSteps} />
                <label htmlFor="force-all-steps" className="text-sm cursor-pointer">
                  <span className="font-medium">Forçar todas as etapas (Triagem + Cultural + DISC + Técnico)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quando ativado, executa as 4 etapas independentemente do workflow da vaga
                  </p>
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5 border-primary/20">
                <Switch id="full-pipeline" checked={useFullPipeline} onCheckedChange={setUseFullPipeline} />
                <label htmlFor="full-pipeline" className="text-sm cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Teste completo com pipeline real (Cultural)
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Testa o pipeline real de transcrição → parsing → avaliação IA → score. Mais lento mas detecta problemas reais.
                  </p>
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button onClick={runFullTest} disabled={!selectedJobId || running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Executar Teste Completo
            </Button>
            {testData.candidateId && (
              <Button variant="outline" onClick={cleanup} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Limpar Dados de Teste
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border bg-card ${log.status === "warning" ? "border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20" : ""}`}>
                  <div className="mt-0.5">
                    {log.status === "running" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    {log.status === "success" && <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
                    {log.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                    {log.status === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                    {log.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{log.message}</p>

                    {log.pipelineChecks && renderPipelineChecks(log.pipelineChecks)}

                    {log.integrityChecks && renderIntegrityChecks(log.integrityChecks)}

                    {log.communications && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          {log.communications.whatsapp.sent ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          ) : log.communications.whatsapp.count > 0 ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                          )}
                          <span>
                            📱 WhatsApp:{" "}
                            {log.communications.whatsapp.sent
                              ? `Enviado ✓ (${log.communications.whatsapp.count})`
                              : log.communications.whatsapp.count > 0
                              ? `Falhou (${log.communications.whatsapp.details[0]?.error_message || "erro"})`
                              : "Nenhum registro"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {log.communications.email.sent ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          ) : log.communications.email.count > 0 ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                          )}
                          <span>
                            📧 Email:{" "}
                            {log.communications.email.sent
                              ? `Enviado ✓ (${log.communications.email.count})`
                              : log.communications.email.count > 0
                              ? `Falhou (${log.communications.email.details[0]?.error_message || "erro"})`
                              : "Nenhum registro"}
                          </span>
                        </div>
                      </div>
                    )}

                    {log.data && (
                      <details className="mt-1">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalhes</summary>
                        <pre className="text-xs mt-1 p-2 rounded bg-muted overflow-auto max-h-40">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
