import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Download, FileSpreadsheet, Loader2 } from "lucide-react";

import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";
import { formatBRT } from "@/lib/datetime";

type DataType = "candidates" | "applications" | "communications" | "decisions" | "metrics";
type ExportFormat = "csv" | "json";

interface ColumnDefinition {
  id: string;
  label: string;
  category: string;
  default: boolean;
}

const COLUMNS_BY_DATA_TYPE: Record<DataType, ColumnDefinition[]> = {
  candidates: [
    { id: "name", label: "Nome", category: "Básico", default: true },
    { id: "email", label: "Email", category: "Básico", default: true },
    { id: "phone", label: "Telefone", category: "Básico", default: true },
    { id: "source", label: "Fonte", category: "Básico", default: true },
    { id: "created_at", label: "Data de Cadastro", category: "Básico", default: true },
    { id: "status", label: "Status Atual", category: "Status", default: true },
    { id: "current_stage", label: "Etapa Atual", category: "Status", default: true },
    { id: "job_title", label: "Vaga", category: "Aplicação", default: true },
    { id: "cultural_score", label: "Score Cultural", category: "Avaliação", default: false },
    { id: "disc_profile", label: "Perfil DISC", category: "Avaliação", default: false },
    { id: "technical_score", label: "Score Técnico", category: "Avaliação", default: false },
    { id: "overall_score", label: "Nota Final", category: "Avaliação", default: true },
    { id: "evaluator", label: "Avaliador", category: "Processo", default: false },
    { id: "tags", label: "Tags", category: "Processo", default: false },
    { id: "notes_count", label: "Qtd. Notas", category: "Processo", default: false },
    { id: "days_in_process", label: "Dias no Processo", category: "Tempo", default: false },
  ],
  applications: [
    { id: "candidate_name", label: "Candidato", category: "Básico", default: true },
    { id: "job_title", label: "Vaga", category: "Básico", default: true },
    { id: "applied_at", label: "Data de Aplicação", category: "Básico", default: true },
    { id: "current_stage", label: "Etapa Atual", category: "Status", default: true },
    { id: "status", label: "Status", category: "Status", default: true },
    { id: "source", label: "Fonte", category: "Origem", default: true },
    { id: "score", label: "Score", category: "Avaliação", default: true },
    { id: "stage_history", label: "Histórico de Etapas", category: "Processo", default: false },
    { id: "time_per_stage", label: "Tempo por Etapa", category: "Tempo", default: false },
    { id: "total_time", label: "Tempo Total", category: "Tempo", default: false },
  ],
  communications: [
    { id: "candidate_name", label: "Candidato", category: "Básico", default: true },
    { id: "channel", label: "Canal", category: "Básico", default: true },
    { id: "type", label: "Tipo", category: "Básico", default: true },
    { id: "sent_at", label: "Data/Hora", category: "Básico", default: true },
    { id: "status", label: "Status", category: "Status", default: true },
    { id: "job_title", label: "Vaga", category: "Contexto", default: true },
    { id: "error_message", label: "Erro (se houver)", category: "Debug", default: false },
    { id: "provider", label: "Provedor", category: "Debug", default: false },
  ],
  decisions: [
    { id: "candidate_name", label: "Candidato", category: "Básico", default: true },
    { id: "job_title", label: "Vaga", category: "Básico", default: true },
    { id: "decision_type", label: "Tipo de Decisão", category: "Decisão", default: true },
    { id: "decision", label: "Resultado", category: "Decisão", default: true },
    { id: "score", label: "Score", category: "Decisão", default: true },
    { id: "threshold", label: "Threshold", category: "Decisão", default: true },
    { id: "justification", label: "Justificativa", category: "Decisão", default: false },
    { id: "step_type", label: "Etapa IA", category: "Processo", default: true },
    { id: "created_at", label: "Data/Hora", category: "Tempo", default: true },
    { id: "processing_time_ms", label: "Tempo de Processamento", category: "Debug", default: false },
  ],
  metrics: [
    { id: "date", label: "Data", category: "Período", default: true },
    { id: "total_applications", label: "Total Aplicações", category: "Volume", default: true },
    { id: "new_candidates", label: "Novos Candidatos", category: "Volume", default: true },
    { id: "hired", label: "Contratados", category: "Resultado", default: true },
    { id: "rejected", label: "Rejeitados", category: "Resultado", default: true },
    { id: "conversion_rate", label: "Taxa de Conversão", category: "Performance", default: true },
    { id: "avg_time_to_hire", label: "Tempo Médio Contratação", category: "Performance", default: true },
    { id: "by_source", label: "Por Fonte", category: "Detalhamento", default: false },
    { id: "by_job", label: "Por Vaga", category: "Detalhamento", default: false },
  ],
};

const DATA_TYPE_LABELS: Record<DataType, { title: string; description: string }> = {
  candidates: { title: "Candidatos", description: "Dados de todos os candidatos" },
  applications: { title: "Aplicações", description: "Histórico de candidaturas" },
  communications: { title: "Comunicações", description: "Log de emails e mensagens" },
  decisions: { title: "Decisões IA", description: "Audit log de decisões automáticas" },
  metrics: { title: "Métricas Diárias", description: "KPIs agregados por dia" },
};

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: ExportConfig) => Promise<void>;
  defaultDataType?: DataType;
  preSelectedJobId?: string;
}

export interface ExportConfig {
  dataType: DataType;
  columns: string[];
  format: ExportFormat;
  dateRange?: DateRange;
  filters: {
    jobId?: string;
    status?: string;
  };
}

export function ExportDataDialog({
  open,
  onOpenChange,
  onExport,
  defaultDataType = "candidates",
  preSelectedJobId,
}: ExportDataDialogProps) {
  const [dataType, setDataType] = useState<DataType>(defaultDataType);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    COLUMNS_BY_DATA_TYPE[defaultDataType].filter((c) => c.default).map((c) => c.id)
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleDataTypeChange = (type: DataType) => {
    setDataType(type);
    setSelectedColumns(COLUMNS_BY_DATA_TYPE[type].filter((c) => c.default).map((c) => c.id));
  };

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(COLUMNS_BY_DATA_TYPE[dataType].map((c) => c.id));
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Group columns by category
  const columnsByCategory = useMemo(() => {
    const columns = COLUMNS_BY_DATA_TYPE[dataType];
    return columns.reduce((acc, col) => {
      if (!acc[col.category]) {
        acc[col.category] = [];
      }
      acc[col.category].push(col);
      return acc;
    }, {} as Record<string, ColumnDefinition[]>);
  }, [dataType]);

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error("Selecione pelo menos uma coluna para exportar");
      return;
    }

    setIsExporting(true);
    try {
      await onExport({
        dataType,
        columns: selectedColumns,
        format: exportFormat,
        dateRange,
        filters: {
          jobId: preSelectedJobId,
          status: statusFilter || undefined,
        },
      });
      toast.success(`Dados exportados em ${exportFormat.toUpperCase()} com sucesso!`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Dados
          </DialogTitle>
          <DialogDescription>
            Selecione os dados e colunas que deseja exportar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4">
          <div className="space-y-6">
            {/* Data Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Dados</Label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DATA_TYPE_LABELS).map(([type, { title }]) => (
                  <Button
                    key={type}
                    variant={dataType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDataTypeChange(type as DataType)}
                    className="justify-start"
                  >
                    {title}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {DATA_TYPE_LABELS[dataType].description}
              </p>
            </div>

            <Separator />

            {/* Export Format */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Formato de Exportação</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as ExportFormat)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="format-csv" />
                  <Label htmlFor="format-csv" className="cursor-pointer">
                    CSV (Excel)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="format-json" />
                  <Label htmlFor="format-json" className="cursor-pointer">
                    JSON
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Date Range Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Filtrar por Período (opcional)</Label>
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
                      "Todos os registros"
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

            {/* Status Filter (for candidates/applications) */}
            {(dataType === "candidates" || dataType === "applications") && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Filtrar por Status (opcional)</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="hired">Contratado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                    <SelectItem value="withdrawn">Desistiu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Column Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Colunas ({selectedColumns.length} selecionadas)
                </Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllColumns}>
                    Todas
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllColumns}>
                    Limpar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(columnsByCategory).map(([category, columns]) => (
                  <div key={category} className="space-y-2">
                    <Badge variant="outline" className="mb-1">
                      {category}
                    </Badge>
                    <div className="grid grid-cols-2 gap-2">
                      {columns.map((column) => (
                        <div
                          key={column.id}
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors",
                            selectedColumns.includes(column.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleColumn(column.id)}
                        >
                          <Checkbox
                            id={`col-${column.id}`}
                            checked={selectedColumns.includes(column.id)}
                            onCheckedChange={() => toggleColumn(column.id)}
                          />
                          <Label
                            htmlFor={`col-${column.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {column.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar {exportFormat.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
