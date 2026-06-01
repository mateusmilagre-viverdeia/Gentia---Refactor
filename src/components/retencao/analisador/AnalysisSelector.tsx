import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PeopleAnalysis } from "@/types/people-analysis.types";

interface AnalysisSelectorProps {
  analyses: PeopleAnalysis[];
  selectedAnalysis: PeopleAnalysis | null;
  onSelect: (analysis: PeopleAnalysis) => void;
  onCreateNew: () => void;
}

export function AnalysisSelector({
  analyses,
  selectedAnalysis,
  onSelect,
  onCreateNew,
}: AnalysisSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={selectedAnalysis?.id || ""}
        onValueChange={(value) => {
          const analysis = analyses.find((a) => a.id === value);
          if (analysis) onSelect(analysis);
        }}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Selecione uma análise" />
        </SelectTrigger>
        <SelectContent>
          {analyses.map((analysis) => (
            <SelectItem key={analysis.id} value={analysis.id}>
              {analysis.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={onCreateNew} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Nova Análise
      </Button>
    </div>
  );
}
