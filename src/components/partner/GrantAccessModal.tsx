import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, Building2, Loader2 } from "lucide-react";
import { addYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatBRT } from "@/lib/datetime";

interface Company {
  id: string;
  name: string;
  slug: string | null;
}

interface GrantAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGrant: (orgId: string, expiresAt: Date, notes?: string) => Promise<{ success: boolean; error?: string }>;
  availableSeats: number;
}

export function GrantAccessModal({ open, onOpenChange, onGrant, availableSeats }: GrantAccessModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date>(addYears(new Date(), 1));
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setCompanies([]);
      setSelectedCompany(null);
      setExpiresAt(addYears(new Date(), 1));
      setNotes("");
    }
  }, [open]);

  // Search companies
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) {
        setCompanies([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, slug')
          .ilike('name', `%${searchQuery}%`)
          .limit(10);

        if (error) throw error;
        setCompanies(data || []);
      } catch (err) {
        console.error('Error searching companies:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleGrant = async () => {
    if (!selectedCompany) return;

    setIsGranting(true);
    const result = await onGrant(selectedCompany, expiresAt, notes || undefined);
    setIsGranting(false);

    if (result.success) {
      onOpenChange(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conceder Acesso a Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {availableSeats <= 0 && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
              Você não possui vagas disponíveis. Solicite mais vagas ao administrador.
            </div>
          )}

          {/* Search */}
          <div className="space-y-2">
            <Label>Buscar empresa</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o nome da empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search Results */}
          {(companies.length > 0 || isSearching) && (
            <div className="space-y-2">
              <Label>Resultados</Label>
              <RadioGroup value={selectedCompany || ""} onValueChange={setSelectedCompany}>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-4 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Buscando...
                    </div>
                  ) : companies.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhuma empresa encontrada
                    </div>
                  ) : (
                    companies.map((company) => (
                      <label
                        key={company.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      >
                        <RadioGroupItem value={company.id} id={company.id} />
                        <div className="flex items-center gap-2 flex-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{company.name}</p>
                            {company.slug && (
                              <p className="text-xs text-muted-foreground">/{company.slug}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Selected Company */}
          {selectedCompanyData && (
            <div className="bg-primary/10 p-3 rounded-lg">
              <p className="text-sm font-medium">Empresa selecionada:</p>
              <p className="text-sm">{selectedCompanyData.name}</p>
            </div>
          )}

          {/* Expiration Date */}
          <div className="space-y-2">
            <Label>Data de expiração</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !expiresAt && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? formatBRT(expiresAt, "dd 'de' MMMM, yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(date) => date && setExpiresAt(date)}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              placeholder="Observações sobre este acesso..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGrant} 
            disabled={!selectedCompany || isGranting || availableSeats <= 0}
          >
            {isGranting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Concedendo...
              </>
            ) : (
              "Conceder Acesso"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
