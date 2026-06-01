import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileText, Loader2 } from "lucide-react";

import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { formatBRT } from "@/lib/datetime";

type ReportType = "general" | "job" | "candidate" | "funnel";

interface ReportSection {
  id: string;
  label: string;
  description: string;
  default: boolean;
}

const REPORT_SECTIONS: Record<ReportType, ReportSection[]> = {
  general: [
    { id: "summary", label: "Resumo Executivo", description: "KPIs principais do período", default: true },
    { id: "funnel", label: "Funil de Recrutamento", description: "Conversões por etapa", default: true },
    { id: "time", label: "Análise de Tempo", description: "Tempo médio por etapa", default: true },
    { id: "sources", label: "Fontes de Candidatos", description: "Performance por canal", default: true },
    { id: "jobs", label: "Comparativo de Vagas", description: "Métricas por vaga", default: false },
    { id: "efficiency", label: "Eficiência do Processo", description: "Gargalos e recomendações", default: false },
  ],
  job: [
    { id: "overview", label: "Visão Geral da Vaga", description: "Título, status, período", default: true },
    { id: "candidates", label: "Lista de Candidatos", description: "Todos os candidatos da vaga", default: true },
    { id: "pipeline", label: "Pipeline Atual", description: "Distribuição por etapa", default: true },
    { id: "scores", label: "Scores e Avaliações", description: "Notas médias e distribuição", default: true },
    { id: "timeline", label: "Timeline de Atividades", description: "Histórico de ações", default: false },
    { id: "attractiveness", label: "Score de Atratividade", description: "Análise da vaga", default: false },
  ],
  candidate: [
    { id: "profile", label: "Perfil do Candidato", description: "Dados pessoais e contato", default: true },
    { id: "history", label: "Histórico de Aplicações", description: "Todas as candidaturas", default: true },
    { id: "assessments", label: "Avaliações", description: "Resultados DISC e Cultural", default: true },
    { id: "decisions", label: "Log de Decisões", description: "Decisões automáticas da IA", default: true },
    { id: "communications", label: "Comunicações", description: "Histórico de mensagens", default: false },
  ],
  funnel: [
    { id: "overview", label: "Visão Geral do Funil", description: "Taxa de conversão total", default: true },
    { id: "stages", label: "Detalhamento por Etapa", description: "Métricas de cada etapa", default: true },
    { id: "dropoff", label: "Análise de Abandono", description: "Onde candidatos saem", default: true },
    { id: "comparison", label: "Comparativo Temporal", description: "Evolução do funil", default: false },
    { id: "benchmarks", label: "Benchmarks", description: "Comparação com mercado", default: false },
  ],
};

const REPORT_TYPE_LABELS: Record<ReportType, { title: string; description: string }> = {
  general: { title: "Relatório Geral", description: "Visão completa do recrutamento" },
  job: { title: "Relatório por Vaga", description: "Métricas específicas de uma vaga" },
  candidate: { title: "Relatório de Candidato", description: "Histórico completo do candidato" },
  funnel: { title: "Relatório de Funil", description: "Análise detalhada de conversões" },
};

interface ReportBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: ReportConfig) => Promise<void>;
  defaultType?: ReportType;
  entityId?: string; // job_id or candidate_id when applicable
}

export interface ReportConfig {
  type: ReportType;
  sections: string[];
  dateRange?: DateRange;
  includeCompanyLogo: boolean;
  entityId?: string;
}

export function ReportBuilderDialog({
  open,
  onOpenChange,
  onGenerate,
  defaultType = "general",
  entityId,
}: ReportBuilderDialogProps) {
  const [reportType, setReportType] = useState<ReportType>(defaultType);
  const [selectedSections, setSelectedSections] = useState<string[]>(
    REPORT_SECTIONS[defaultType].filter((s) => s.default).map((s) => s.id)
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [includeCompanyLogo, setIncludeCompanyLogo] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTypeChange = (type: ReportType) => {
    setReportType(type);
    setSelectedSections(REPORT_SECTIONS[type].filter((s) => s.default).map((s) => s.id));
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(REPORT_SECTIONS[reportType].map((s) => s.id));
  };

  const deselectAllSections = () => {
    setSelectedSections([]);
  };

  const handleGenerate = async () => {
    if (selectedSections.length === 0) {
      toast.error("Selecione pelo menos uma seção para o relatório");
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate({
        type: reportType,
        sections: selectedSections,
        dateRange,
        includeCompanyLogo,
        entityId,
      });
      toast.success("Relatório gerado com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Construtor de Relatório PDF
          </DialogTitle>
          <DialogDescription>
            Configure as seções e opções do seu relatório personalizado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Relatório</Label>
              <RadioGroup
                value={reportType}
                onValueChange={(value) => handleTypeChange(value as ReportType)}
                className="grid grid-cols-2 gap-3"
              >
                {Object.entries(REPORT_TYPE_LABELS).map(([type, { title, description }]) => (
                  <div key={type} className="relative">
                    <RadioGroupItem
                      value={type}
                      id={`type-${type}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border-2 p-3 cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      )}
                    >
                      <span className="font-medium text-sm">{title}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Date Range (for applicable types) */}
            {(reportType === "general" || reportType === "funnel") && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Período (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {formatBRT(dateRange.from, "dd/MM/yyyy")} -{" "}
                            {formatBRT(dateRange.to, "dd/MM/yyyy")}
                          </>
                        ) : (
                          formatBRT(dateRange.from, "dd/MM/yyyy")
                        )
                      ) : (
                        "Selecionar período"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Sections Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Seções do Relatório</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllSections}>
                    Selecionar tudo
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllSections}>
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {REPORT_SECTIONS[reportType].map((section) => (
                  <div
                    key={section.id}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer",
                      selectedSections.includes(section.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleSection(section.id)}
                  >
                    <Checkbox
                      id={`section-${section.id}`}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <div className="flex-1 space-y-0.5">
                      <Label
                        htmlFor={`section-${section.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {section.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Additional Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Opções Adicionais</Label>
              <div
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setIncludeCompanyLogo(!includeCompanyLogo)}
              >
                <Checkbox
                  id="include-logo"
                  checked={includeCompanyLogo}
                  onCheckedChange={(checked) => setIncludeCompanyLogo(checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="include-logo" className="text-sm font-medium cursor-pointer">
                    Incluir logo da empresa
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Usar o logo configurado na página de carreiras
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || selectedSections.length === 0}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Gerar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
