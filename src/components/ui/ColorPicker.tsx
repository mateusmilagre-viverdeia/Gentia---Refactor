import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  description?: string;
  className?: string;
}

const presetColors = [
  "#000000", "#1a1a1a", "#374151", "#6b7280",
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
];

export function ColorPicker({
  value,
  onChange,
  label,
  description,
  className,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Validate hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setInputValue(newColor);
    onChange(newColor);
  };

  const handlePresetClick = (color: string) => {
    setInputValue(color);
    onChange(color);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-10"
          >
            <div
              className="w-6 h-6 rounded border shadow-sm"
              style={{ backgroundColor: value }}
            />
            <span className="font-mono text-sm">{value}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-4">
            {/* Native color picker */}
            <div className="space-y-2">
              <Label className="text-xs">Selecionar Cor</Label>
              <div className="relative">
                <input
                  ref={colorInputRef}
                  type="color"
                  value={value}
                  onChange={handleColorPickerChange}
                  className="w-full h-24 rounded-lg cursor-pointer border-0 p-0"
                />
              </div>
            </div>

            {/* Hex input */}
            <div className="space-y-2">
              <Label className="text-xs">Código Hex</Label>
              <Input
                value={inputValue}
                onChange={handleInputChange}
                placeholder="#000000"
                className="font-mono"
              />
            </div>

            {/* Preset colors */}
            <div className="space-y-2">
              <Label className="text-xs">Cores Pré-definidas</Label>
              <div className="grid grid-cols-8 gap-1.5">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => handlePresetClick(color)}
                    className={cn(
                      "w-6 h-6 rounded border shadow-sm transition-transform hover:scale-110",
                      value === color && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
