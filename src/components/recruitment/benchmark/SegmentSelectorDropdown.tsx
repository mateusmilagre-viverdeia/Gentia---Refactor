import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSegmentOptions } from "@/data/recruitmentBenchmarks";
import { Building2 } from "lucide-react";

interface SegmentSelectorDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function SegmentSelectorDropdown({ value, onChange }: SegmentSelectorDropdownProps) {
  const options = getSegmentOptions();

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione o segmento" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
