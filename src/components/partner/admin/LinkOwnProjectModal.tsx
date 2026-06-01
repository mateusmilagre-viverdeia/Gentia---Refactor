import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  slug: string | null;
}

interface LinkOwnProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  onLink: (partnerId: string, orgId: string) => Promise<{ success: boolean; error?: string }>;
}

export function LinkOwnProjectModal({ 
  open, 
  onOpenChange, 
  partnerId, 
  partnerName,
  onLink 
}: LinkOwnProjectModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setCompanies([]);
      setSelectedCompany(null);
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

  const handleLink = async () => {
    if (!selectedCompany) return;

    setIsLinking(true);
    const result = await onLink(partnerId, selectedCompany);
    setIsLinking(false);

    if (result.success) {
      onOpenChange(false);
    }
  };

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Projeto Próprio</DialogTitle>
          <DialogDescription>
            Vincule uma empresa como projeto próprio de <strong>{partnerName}</strong>. 
            Este acesso será gratuito e não conta como vaga usada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedCompany || isLinking}
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Vinculando...
              </>
            ) : (
              "Vincular Projeto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
