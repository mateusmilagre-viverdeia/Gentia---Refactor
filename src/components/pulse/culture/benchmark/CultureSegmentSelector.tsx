import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCultureSegmentOptions } from "@/data/cultureBenchmarks";

interface CultureSegmentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CultureSegmentSelector({ value, onChange }: CultureSegmentSelectorProps) {
  const options = getCultureSegmentOptions();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Selecione o setor" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
