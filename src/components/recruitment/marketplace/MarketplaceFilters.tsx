import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, X, Filter, RotateCcw } from "lucide-react";
import type { MarketplaceFilters as FiltersType } from "@/hooks/useMarketplace";

interface MarketplaceFiltersProps {
  filters: FiltersType;
  onFiltersChange: (filters: FiltersType) => void;
}

const DISC_PROFILES = [
  { value: "D", label: "Dominância (D)" },
  { value: "I", label: "Influência (I)" },
  { value: "S", label: "Estabilidade (S)" },
  { value: "C", label: "Conformidade (C)" },
];

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Júnior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Sênior" },
  { value: "especialista", label: "Especialista" },
];

const REMOTE_OPTIONS = [
  { value: "presencial", label: "Presencial" },
  { value: "hibrido", label: "Híbrido" },
  { value: "remoto", label: "Remoto" },
];

export function MarketplaceFilters({ filters, onFiltersChange }: MarketplaceFiltersProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [skillInput, setSkillInput] = useState("");

  const updateFilter = <K extends keyof FiltersType>(key: K, value: FiltersType[K]) => {
    onFiltersChange({ ...filters, [key]: value, offset: 0 });
  };

  const addSkill = () => {
    if (skillInput.trim()) {
      const currentSkills = filters.skills || [];
      if (!currentSkills.includes(skillInput.trim())) {
        updateFilter("skills", [...currentSkills, skillInput.trim()]);
      }
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    updateFilter("skills", (filters.skills || []).filter(s => s !== skill));
  };

  const toggleDiscProfile = (profile: string) => {
    const currentProfiles = filters.disc_profiles || [];
    if (currentProfiles.includes(profile)) {
      updateFilter("disc_profiles", currentProfiles.filter(p => p !== profile));
    } else {
      updateFilter("disc_profiles", [...currentProfiles, profile]);
    }
  };

  const toggleSeniority = (level: string) => {
    const currentLevels = filters.seniority_levels || [];
    if (currentLevels.includes(level)) {
      updateFilter("seniority_levels", currentLevels.filter(l => l !== level));
    } else {
      updateFilter("seniority_levels", [...currentLevels, level]);
    }
  };

  const resetFilters = () => {
    onFiltersChange({ limit: 20, offset: 0 });
  };

  const hasActiveFilters = 
    (filters.min_cultural_score && filters.min_cultural_score > 0) ||
    (filters.disc_profiles && filters.disc_profiles.length > 0) ||
    (filters.skills && filters.skills.length > 0) ||
    filters.location_city ||
    filters.remote_preference ||
    (filters.seniority_levels && filters.seniority_levels.length > 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center justify-between mb-4">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="gap-2 p-0 h-auto hover:bg-transparent">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filtros</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Ativos
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
            <RotateCcw className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      <CollapsibleContent className="space-y-6">
        {/* Cultural Score */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Fit Cultural Mínimo</Label>
            <span className="text-sm font-medium text-primary">
              {filters.min_cultural_score || 0}%
            </span>
          </div>
          <Slider
            value={[filters.min_cultural_score || 0]}
            onValueChange={([value]) => updateFilter("min_cultural_score", value)}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* DISC Profiles */}
        <div className="space-y-3">
          <Label>Perfil DISC</Label>
          <div className="flex flex-wrap gap-2">
            {DISC_PROFILES.map(({ value, label }) => (
              <Badge
                key={value}
                variant={filters.disc_profiles?.includes(value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleDiscProfile(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-3">
          <Label>Skills</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar skill..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={addSkill}>
              Adicionar
            </Button>
          </div>
          {filters.skills && filters.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {filters.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSkill(skill)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Seniority */}
        <div className="space-y-3">
          <Label>Senioridade</Label>
          <div className="flex flex-wrap gap-2">
            {SENIORITY_OPTIONS.map(({ value, label }) => (
              <Badge
                key={value}
                variant={filters.seniority_levels?.includes(value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleSeniority(value)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              placeholder="Ex: São Paulo"
              value={filters.location_city || ""}
              onChange={(e) => updateFilter("location_city", e.target.value || undefined)}
            />
          </div>
          <div className="space-y-2">
            <Label>Modelo de Trabalho</Label>
            <Select
              value={filters.remote_preference || "all"}
              onValueChange={(value) => updateFilter("remote_preference", value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {REMOTE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
