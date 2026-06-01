import { User, Users, Database } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DISCAnalysisLevel } from "@/types/disc.types";
import { cn } from "@/lib/utils";

interface DISCAnalysisLevelSelectorProps {
  value: DISCAnalysisLevel;
  onChange: (level: DISCAnalysisLevel) => void;
  disabled?: boolean;
}

const LEVEL_OPTIONS: { value: DISCAnalysisLevel; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: 'collaborator',
    label: 'Colaborador',
    icon: User,
    description: 'Autoconhecimento e desenvolvimento pessoal'
  },
  {
    value: 'leader',
    label: 'Líder / RH',
    icon: Users,
    description: 'Gestão, potencial e riscos'
  },
];

export function DISCAnalysisLevelSelector({ value, onChange, disabled }: DISCAnalysisLevelSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        Perspectiva da análise
      </label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as DISCAnalysisLevel)}
        disabled={disabled}
        className="justify-start"
      >
        {LEVEL_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.label}
              className={cn(
                "flex items-center gap-2 px-4 py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{option.label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        {LEVEL_OPTIONS.find(o => o.value === value)?.description}
      </p>
    </div>
  );
}
