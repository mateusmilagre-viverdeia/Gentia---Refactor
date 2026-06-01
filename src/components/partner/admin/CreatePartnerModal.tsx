import React, { useState } from "react";
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
import { useAdminPartners } from "@/hooks/useAdminPartners";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Loader2, Check, AlertCircle } from "lucide-react";
import { addMonths, addYears } from "date-fns";

interface CreatePartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface UserSearchResult {
  id: string;
  email: string;
  full_name: string | null;
  account_id: string | null;
}

export function CreatePartnerModal({ open, onOpenChange, onSuccess }: CreatePartnerModalProps) {
  const { createPartner } = useAdminPartners();
  
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cpfCnpj: "",
    companyName: "",
    totalSeats: 5,
    validityMonths: 12,
    notes: "",
    createOwnProjectGrant: true,
  });
  
  const [submitting, setSubmitting] = useState(false);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      // Search in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, account_id')
        .eq('email', searchEmail.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError("Usuário não encontrado. Certifique-se de que o email está correto.");
        return;
      }

      // Check if already a partner
      const { data: existingPartner } = await supabase
        .from('ep_partners')
        .select('id')
        .eq('user_id', data.id)
        .maybeSingle();

      if (existingPartner) {
        setSearchError("Este usuário já é um Sócio EP.");
        return;
      }

      const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ');
      setSearchResult({
        id: data.id,
        email: data.email || '',
        full_name: fullName || null,
        account_id: data.account_id,
      });
      setFormData(prev => ({
        ...prev,
        name: fullName || "",
      }));
    } catch (err) {
      console.error('Error searching user:', err);
      setSearchError("Erro ao buscar usuário. Tente novamente.");
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchResult) {
      toast.error("Busque e selecione um usuário primeiro");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Preencha o nome do sócio");
      return;
    }

    setSubmitting(true);

    try {
      const validUntil = addMonths(new Date(), formData.validityMonths);
      
      const result = await createPartner({
        userId: searchResult.id,
        email: searchResult.email,
        name: formData.name,
        phone: formData.phone || undefined,
        cpfCnpj: formData.cpfCnpj || undefined,
        companyName: formData.companyName || undefined,
        totalSeats: formData.totalSeats,
        validUntil,
        notes: formData.notes || undefined,
        ownProjectOrgId: formData.createOwnProjectGrant && searchResult.account_id ? searchResult.account_id : undefined,
      });

      if (result.success) {
        toast.success("Sócio EP criado com sucesso!");
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(result.error || "Erro ao criar sócio");
      }
    } catch (err) {
      console.error('Error creating partner:', err);
      toast.error("Erro ao criar sócio");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSearchEmail("");
    setSearchResult(null);
    setSearchError(null);
    setFormData({
      name: "",
      phone: "",
      cpfCnpj: "",
      companyName: "",
      totalSeats: 5,
      validityMonths: 12,
      notes: "",
      createOwnProjectGrant: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Sócio EP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Search */}
          <div className="space-y-2">
            <Label>Email do Usuário</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Digite o email do usuário..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                disabled={!!searchResult}
              />
              {!searchResult ? (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleSearchUser}
                  disabled={searching || !searchEmail.trim()}
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setSearchResult(null); setSearchEmail(""); }}
                >
                  Trocar
                </Button>
              )}
            </div>
            
            {searchError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {searchError}
              </div>
            )}
            
            {searchResult && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                <Check className="h-4 w-4" />
                Usuário encontrado: {searchResult.full_name || searchResult.email}
              </div>
            )}
          </div>

          {searchResult && (
            <>
              {/* Partner Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Empresa</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
              </div>

              {/* License Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalSeats">Quota de Vagas</Label>
                  <Input
                    id="totalSeats"
                    type="number"
                    min={1}
                    value={formData.totalSeats}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSeats: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validityMonths">Validade (meses)</Label>
                  <Input
                    id="validityMonths"
                    type="number"
                    min={1}
                    value={formData.validityMonths}
                    onChange={(e) => setFormData(prev => ({ ...prev, validityMonths: parseInt(e.target.value) || 12 }))}
                  />
                </div>
              </div>

              {/* Own Project Grant */}
              {searchResult.account_id && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createOwnProjectGrant"
                    checked={formData.createOwnProjectGrant}
                    onChange={(e) => setFormData(prev => ({ ...prev, createOwnProjectGrant: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="createOwnProjectGrant" className="text-sm font-normal">
                    Criar acesso gratuito para o projeto próprio do sócio
                  </Label>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações internas..."
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !searchResult}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Sócio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
