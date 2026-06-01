import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PartnerWithStats } from "@/hooks/useAdminPartners";

import { Building2, Mail, Phone, CreditCard, Users, Calendar, Link2, Plus } from "lucide-react";
import { LinkOwnProjectModal } from "./LinkOwnProjectModal";
import { toast } from "sonner";
import { formatBRT } from "@/lib/datetime";

interface PartnerDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner: PartnerWithStats;
  onLinkOwnProject?: (partnerId: string, orgId: string) => Promise<{ success: boolean; error?: string }>;
}

export function PartnerDetailsSheet({ open, onOpenChange, partner, onLinkOwnProject }: PartnerDetailsSheetProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  // Find own project grant using own_project_grant_id directly
  const ownProjectGrant = partner.own_project_grant_id 
    ? partner.grants.find(g => g.id === partner.own_project_grant_id)
    : null;

  const handleLinkOwnProject = async (partnerId: string, orgId: string) => {
    if (!onLinkOwnProject) return { success: false, error: "Função não disponível" };
    
    const result = await onLinkOwnProject(partnerId, orgId);
    if (result.success) {
      toast.success("Projeto próprio vinculado com sucesso!");
    } else {
      toast.error(result.error || "Erro ao vincular projeto");
    }
    return result;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {partner.name}
              <Badge variant={partner.active ? "default" : "secondary"}>
                {partner.active ? "Ativo" : "Inativo"}
              </Badge>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Informações</h4>
              
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{partner.email}</span>
              </div>
              
              {partner.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{partner.phone}</span>
                </div>
              )}
              
              {partner.company_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{partner.company_name}</span>
                </div>
              )}
              
              {partner.cpf_cnpj && (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{partner.cpf_cnpj}</span>
                </div>
              )}
            </div>

            {/* Own Project */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Projeto Próprio
              </h4>
              
              {ownProjectGrant ? (
                <div className="bg-green-500/10 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ownProjectGrant.company?.name || 'Projeto vinculado'}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira em {formatBRT(new Date(ownProjectGrant.expires_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-200">
                    Vinculado
                  </Badge>
                </div>
              ) : (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum projeto próprio vinculado. Este acesso é gratuito e não conta como vaga usada.
                  </p>
                  {onLinkOwnProject && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setLinkModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Vincular Projeto Próprio
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Promo Code */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Código Promocional</h4>
              <code className="bg-muted px-3 py-2 rounded text-lg font-mono block">
                {partner.promo_code}
              </code>
            </div>

            {/* License Stats */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Licenças</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{partner.totalSeats}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{partner.usedSeats}</div>
                  <div className="text-xs text-muted-foreground">Em Uso</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{partner.totalSeats - partner.usedSeats}</div>
                  <div className="text-xs text-muted-foreground">Disponíveis</div>
                </div>
              </div>
            </div>

            {/* Active Clients */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Clientes Ativos ({partner.grants.length})
              </h4>
              
              {partner.grants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cliente ativo</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {partner.grants.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm">{grant.company?.name || 'Cliente'}</p>
                        <p className="text-xs text-muted-foreground">
                          Expira em {formatBRT(new Date(grant.expires_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      {grant.notes?.includes("Projeto próprio") && (
                        <Badge variant="outline" className="text-xs">Próprio</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {partner.notes && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Notas</h4>
                <p className="text-sm bg-muted/50 rounded-lg p-3">{partner.notes}</p>
              </div>
            )}

            {/* Dates */}
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cadastrado em {partner.created_at ? formatBRT(new Date(partner.created_at), "dd/MM/yyyy") : "-"}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Link Own Project Modal */}
      {onLinkOwnProject && (
        <LinkOwnProjectModal
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          partnerId={partner.id}
          partnerName={partner.name}
          onLink={handleLinkOwnProject}
        />
      )}
    </>
  );
}
