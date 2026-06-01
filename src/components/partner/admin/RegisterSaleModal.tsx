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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminRoyalties } from "@/hooks/useAdminRoyalties";
import { useAdminPartners } from "@/hooks/useAdminPartners";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";

interface RegisterSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RegisterSaleModal({ open, onOpenChange, onSuccess }: RegisterSaleModalProps) {
  const { registerDirectSale } = useAdminRoyalties();
  const { partners, fetchAllPartners } = useAdminPartners();
  
  const [formData, setFormData] = useState({
    partnerId: "",
    saleDate: new Date().toISOString().split('T')[0],
    description: "",
    totalAmount: "",
    notes: "",
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAllPartners();
    }
  }, [open, fetchAllPartners]);

  const activePartners = partners.filter(p => p.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.partnerId) {
      toast.error("Selecione o sócio");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Preencha a descrição da venda");
      return;
    }

    const amount = parseFloat(formData.totalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setSubmitting(true);

    try {
      const result = await registerDirectSale({
        partnerId: formData.partnerId,
        saleDate: new Date(formData.saleDate),
        description: formData.description,
        totalAmount: amount,
        notes: formData.notes || undefined,
      });

      if (result.success) {
        toast.success("Venda registrada com sucesso!");
        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(result.error || "Erro ao registrar venda");
      }
    } catch (err) {
      console.error('Error registering sale:', err);
      toast.error("Erro ao registrar venda");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      partnerId: "",
      saleDate: new Date().toISOString().split('T')[0],
      description: "",
      totalAmount: "",
      notes: "",
    });
  };

  const partnerShare = formData.totalAmount ? parseFloat(formData.totalAmount) * 0.85 : 0;
  const epShare = formData.totalAmount ? parseFloat(formData.totalAmount) * 0.15 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Venda Direta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner Selection */}
          <div className="space-y-2">
            <Label htmlFor="partnerId">Sócio *</Label>
            <Select 
              value={formData.partnerId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, partnerId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o sócio..." />
              </SelectTrigger>
              <SelectContent>
                {activePartners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name} ({partner.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sale Date */}
          <div className="space-y-2">
            <Label htmlFor="saleDate">Data da Venda *</Label>
            <Input
              id="saleDate"
              type="date"
              value={formData.saleDate}
              onChange={(e) => setFormData(prev => ({ ...prev, saleDate: e.target.value }))}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Consultoria estratégica - Empresa XYZ"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Valor Total (R$) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Split Preview */}
          {formData.totalAmount && parseFloat(formData.totalAmount) > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">Divisão da Venda</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Sócio (85%):</span>
                  <span className="ml-2 font-medium text-green-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(partnerShare)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">EP (15%):</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(epShare)}
                  </span>
                </div>
              </div>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Registrar Venda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
