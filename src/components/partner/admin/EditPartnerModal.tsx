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
import { useAdminPartners, PartnerWithStats } from "@/hooks/useAdminPartners";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { addMonths } from "date-fns";

interface EditPartnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: PartnerWithStats;
  onSuccess: () => void;
}

export function EditPartnerModal({ open, onOpenChange, partner, onSuccess }: EditPartnerModalProps) {
  const { updatePartner, adjustLicenseQuota } = useAdminPartners();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cpfCnpj: "",
    companyName: "",
    notes: "",
  });
  
  const [licenseData, setLicenseData] = useState({
    totalSeats: 0,
    validityMonths: 12,
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [adjustingLicense, setAdjustingLicense] = useState(false);

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || "",
        phone: partner.phone || "",
        cpfCnpj: partner.cpf_cnpj || "",
        companyName: partner.company_name || "",
        notes: partner.notes || "",
      });
      setLicenseData({
        totalSeats: partner.totalSeats,
        validityMonths: 12,
      });
    }
  }, [partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Preencha o nome do sócio");
      return;
    }

    setSubmitting(true);

    try {
      const result = await updatePartner(partner.id, {
        name: formData.name,
        phone: formData.phone || null,
        cpf_cnpj: formData.cpfCnpj || null,
        company_name: formData.companyName || null,
        notes: formData.notes || null,
      });

      if (result.success) {
        toast.success("Dados do sócio atualizados!");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Erro ao atualizar sócio");
      }
    } catch (err) {
      console.error('Error updating partner:', err);
      toast.error("Erro ao atualizar sócio");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustLicense = async () => {
    if (licenseData.totalSeats < partner.usedSeats) {
      toast.error(`Quota não pode ser menor que ${partner.usedSeats} (vagas em uso)`);
      return;
    }

    setAdjustingLicense(true);

    try {
      const validUntil = addMonths(new Date(), licenseData.validityMonths);
      const result = await adjustLicenseQuota(partner.id, licenseData.totalSeats, validUntil);

      if (result.success) {
        toast.success("Quota de licenças atualizada!");
        onSuccess();
      } else {
        toast.error(result.error || "Erro ao ajustar quota");
      }
    } catch (err) {
      console.error('Error adjusting license:', err);
      toast.error("Erro ao ajustar quota");
    } finally {
      setAdjustingLicense(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Sócio EP</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner Info */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={partner.email} disabled className="bg-muted" />
          </div>

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

          {/* License Adjustment Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Ajustar Licença</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalSeats">
                  Nova Quota ({partner.usedSeats} em uso)
                </Label>
                <Input
                  id="totalSeats"
                  type="number"
                  min={partner.usedSeats}
                  value={licenseData.totalSeats}
                  onChange={(e) => setLicenseData(prev => ({ ...prev, totalSeats: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validityMonths">Validade (meses)</Label>
                <div className="flex gap-2">
                  <Input
                    id="validityMonths"
                    type="number"
                    min={1}
                    value={licenseData.validityMonths}
                    onChange={(e) => setLicenseData(prev => ({ ...prev, validityMonths: parseInt(e.target.value) || 12 }))}
                  />
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={handleAdjustLicense}
                    disabled={adjustingLicense}
                  >
                    {adjustingLicense ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajustar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
