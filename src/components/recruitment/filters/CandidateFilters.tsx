import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FilterChip } from "./FilterChip";
import { TagBadge } from "../tags/TagBadge";
import { useCandidateTags } from "@/hooks/useCandidateTags";
import { subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

export interface CandidateFiltersState {
  statuses: string[];
  tags: string[];
  sources: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  scoreRange: string[];
  jobIds: string[];
}

const INITIAL_FILTERS: CandidateFiltersState = {
  statuses: [],
  tags: [],
  sources: [],
  dateRange: { from: undefined, to: undefined },
  scoreRange: [],
  jobIds: [],
};

const STATUS_OPTIONS = [
  { value: "applied", label: "Aplicado" },
  { value: "screening", label: "Triagem" },
  { value: "interviewed", label: "Entrevistado" },
  { value: "evaluation", label: "Em avaliação" },
  { value: "offer", label: "Proposta" },
  { value: "hired", label: "Contratado" },
  { value: "rejected", label: "Rejeitado" },
];

const SOURCE_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "careers_page", label: "Página de Carreiras" },
  { value: "referral", label: "Indicação" },
  { value: "indeed", label: "Indeed" },
  { value: "gupy", label: "Gupy" },
  { value: "other", label: "Outros" },
];

const SCORE_OPTIONS = [
  { value: "high", label: "Alta (75-100%)" },
  { value: "medium", label: "Média (50-74%)" },
  { value: "low", label: "Baixa (0-49%)" },
  { value: "none", label: "Sem pontuação" },
];

const PERIOD_PRESETS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

interface CandidateFiltersProps {
  filters: CandidateFiltersState;
  onFiltersChange: (filters: CandidateFiltersState) => void;
  jobs?: { id: string; title: string }[];
}

export function CandidateFilters({ filters, onFiltersChange, jobs = [] }: CandidateFiltersProps) {
  const { allTags } = useCandidateTags();
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const activeFilterCount =
    filters.statuses.length +
    filters.tags.length +
    filters.sources.length +
    filters.scoreRange.length +
    filters.jobIds.length +
    (filters.dateRange.from ? 1 : 0);

  const clearAllFilters = () => {
    onFiltersChange(INITIAL_FILTERS);
  };

  const toggleArrayFilter = (
    key: keyof Pick<CandidateFiltersState, "statuses" | "tags" | "sources" | "scoreRange" | "jobIds">,
    value: string
  ) => {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
  };

  const setDatePreset = (days: number) => {
    const from = startOfDay(subDays(new Date(), days));
    const to = new Date();
    onFiltersChange({ ...filters, dateRange: { from, to } });
    setOpenPopover(null);
  };

  const clearDateRange = () => {
    onFiltersChange({ ...filters, dateRange: { from: undefined, to: undefined } });
  };

  return (
    <div className="space-y-3">
      {/* Filter Buttons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Filter */}
        <Popover open={openPopover === "status"} onOpenChange={(open) => setOpenPopover(open ? "status" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Status
              {filters.statuses.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filters.statuses.length}
                </Badge>
              )}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={filters.statuses.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter("statuses", option.value)}
                  />
                  <Label htmlFor={`status-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Tags Filter */}
        <Popover open={openPopover === "tags"} onOpenChange={(open) => setOpenPopover(open ? "tags" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Tags
              {filters.tags.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filters.tags.length}
                </Badge>
              )}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar tags..." />
              <CommandList>
                <CommandEmpty>Nenhuma tag encontrada</CommandEmpty>
                <CommandGroup>
                  {allTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => toggleArrayFilter("tags", tag)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={filters.tags.includes(tag)} />
                      <TagBadge tag={tag} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Source Filter */}
        <Popover open={openPopover === "source"} onOpenChange={(open) => setOpenPopover(open ? "source" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Fonte
              {filters.sources.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filters.sources.length}
                </Badge>
              )}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
              {SOURCE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`source-${option.value}`}
                    checked={filters.sources.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter("sources", option.value)}
                  />
                  <Label htmlFor={`source-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Period Filter */}
        <Popover open={openPopover === "period"} onOpenChange={(open) => setOpenPopover(open ? "period" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
              Período
              {filters.dateRange.from && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  1
                </Badge>
              )}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PERIOD_PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="outline"
                    size="sm"
                    onClick={() => setDatePreset(preset.days)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">Ou selecione um período:</p>
                <Calendar
                  mode="range"
                  selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                  onSelect={(range) =>
                    onFiltersChange({ ...filters, dateRange: { from: range?.from, to: range?.to } })
                  }
                  locale={ptBR}
                  numberOfMonths={1}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Score Filter */}
        <Popover open={openPopover === "score"} onOpenChange={(open) => setOpenPopover(open ? "score" : null)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              Pontuação
              {filters.scoreRange.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filters.scoreRange.length}
                </Badge>
              )}
              <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <div className="space-y-2">
              {SCORE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`score-${option.value}`}
                    checked={filters.scoreRange.includes(option.value)}
                    onCheckedChange={() => toggleArrayFilter("scoreRange", option.value)}
                  />
                  <Label htmlFor={`score-${option.value}`} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Jobs Filter */}
        {jobs.length > 0 && (
          <Popover open={openPopover === "jobs"} onOpenChange={(open) => setOpenPopover(open ? "jobs" : null)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                Vagas
                {filters.jobIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filters.jobIds.length}
                  </Badge>
                )}
                <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar vagas..." />
                <CommandList>
                  <CommandEmpty>Nenhuma vaga encontrada</CommandEmpty>
                  <CommandGroup>
                    {jobs.map((job) => (
                      <CommandItem
                        key={job.id}
                        onSelect={() => toggleArrayFilter("jobIds", job.id)}
                        className="flex items-center gap-2"
                      >
                        <Checkbox checked={filters.jobIds.includes(job.id)} />
                        <span className="truncate">{job.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear All */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-muted-foreground">
            <X className="mr-1.5 h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Active Filters Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">
            <Filter className="inline h-3.5 w-3.5 mr-1" />
            Filtros ativos:
          </span>
          {filters.statuses.map((status) => {
            const label = STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
            return (
              <FilterChip
                key={`status-${status}`}
                label="Status"
                value={label}
                onRemove={() => toggleArrayFilter("statuses", status)}
              />
            );
          })}
          {filters.tags.map((tag) => (
            <FilterChip
              key={`tag-${tag}`}
              label="Tag"
              value={tag}
              onRemove={() => toggleArrayFilter("tags", tag)}
            />
          ))}
          {filters.sources.map((source) => {
            const label = SOURCE_OPTIONS.find((s) => s.value === source)?.label || source;
            return (
              <FilterChip
                key={`source-${source}`}
                label="Fonte"
                value={label}
                onRemove={() => toggleArrayFilter("sources", source)}
              />
            );
          })}
          {filters.dateRange.from && (
            <FilterChip
              label="Período"
              value={`${formatBRT(filters.dateRange.from, "dd/MM")} - ${filters.dateRange.to ? formatBRT(filters.dateRange.to, "dd/MM") : "hoje"}`}
              onRemove={clearDateRange}
            />
          )}
          {filters.scoreRange.map((score) => {
            const label = SCORE_OPTIONS.find((s) => s.value === score)?.label || score;
            return (
              <FilterChip
                key={`score-${score}`}
                label="Pontuação"
                value={label}
                onRemove={() => toggleArrayFilter("scoreRange", score)}
              />
            );
          })}
          {filters.jobIds.map((jobId) => {
            const job = jobs.find((j) => j.id === jobId);
            return (
              <FilterChip
                key={`job-${jobId}`}
                label="Vaga"
                value={job?.title || jobId}
                onRemove={() => toggleArrayFilter("jobIds", jobId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export { INITIAL_FILTERS };
