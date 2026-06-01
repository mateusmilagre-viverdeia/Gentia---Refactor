import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm, Controller } from "react-hook-form";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCreateClient, useUpdateClient, type Client } from "@/hooks/useClients";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { useClientContacts, useSaveContacts } from "@/hooks/useClientContacts";
import { ClientContactsSection, type ContactRow } from "./ClientContactsSection";
import { useEffect, useState } from "react";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
}

interface FormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  setor: string;
  porte: string;
  site: string;
  observacoes: string;
  modelo_fee: string;
  fee_percentual: string;
  fee_fixo: string;
  prazo_entrega_dias: string;
  prazo_garantia_dias: string;
  status: string;
  responsavel_interno: string;
}

const setores = [
  "Tecnologia", "Varejo", "Indústria", "Saúde", "Financeiro", "Educação", "Serviços", "Outros"
];

const portes = [
  { value: "startup", label: "Startup" },
  { value: "pequena", label: "Pequena" },
  { value: "media", label: "Média" },
  { value: "grande", label: "Grande" },
  { value: "enterprise", label: "Enterprise" },
];

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const { currentOrganization } = useOrganization();
  const { members } = useAccountMembers();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const saveContacts = useSaveContacts();
  const { data: existingContacts = [] } = useClientContacts(client?.id);
  const isEditing = !!client;

  const [contacts, setContacts] = useState<ContactRow[]>([]);

  const { register, handleSubmit, control, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: {
      razao_social: "", nome_fantasia: "", cnpj: "", setor: "", porte: "",
      site: "", observacoes: "", modelo_fee: "percentual", fee_percentual: "",
      fee_fixo: "", prazo_entrega_dias: "15", prazo_garantia_dias: "90", status: "ativo",
      responsavel_interno: "",
    },
  });

  useEffect(() => {
    if (client) {
      reset({
        razao_social: client.razao_social,
        nome_fantasia: client.nome_fantasia || "",
        cnpj: client.cnpj || "",
        setor: client.setor || "",
        porte: client.porte || "",
        site: client.site || "",
        observacoes: client.observacoes || "",
        modelo_fee: client.modelo_fee || "percentual",
        fee_percentual: client.fee_percentual?.toString() || "",
        fee_fixo: client.fee_fixo?.toString() || "",
        prazo_entrega_dias: client.prazo_entrega_dias?.toString() || "15",
        prazo_garantia_dias: client.prazo_garantia_dias?.toString() || "90",
        status: client.status,
        responsavel_interno: client.responsavel_interno || "",
      });
    } else {
      reset({
        razao_social: "", nome_fantasia: "", cnpj: "", setor: "", porte: "",
        site: "", observacoes: "", modelo_fee: "percentual", fee_percentual: "",
        fee_fixo: "", prazo_entrega_dias: "15", prazo_garantia_dias: "90", status: "ativo",
        responsavel_interno: "",
      });
    }
  }, [client, reset, open]);

  // Sync existing contacts
  useEffect(() => {
    if (existingContacts.length > 0) {
      setContacts(existingContacts.map((c) => ({
        nome: c.nome,
        cargo: c.cargo || "",
        email: c.email || "",
        whatsapp: c.whatsapp || "",
        eh_decisor: c.eh_decisor,
        eh_contato_principal: c.eh_contato_principal,
      })));
    } else if (!client) {
      setContacts([]);
    }
  }, [existingContacts, client]);

  const modeloFee = watch("modelo_fee");

  const onSubmit = async (data: FormData) => {
    if (!currentOrganization?.id) return;

    const payload = {
      account_id: currentOrganization.id,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || null,
      cnpj: data.cnpj || null,
      setor: data.setor || null,
      porte: data.porte || null,
      site: data.site || null,
      observacoes: data.observacoes || null,
      modelo_fee: data.modelo_fee || null,
      fee_percentual: data.fee_percentual ? Number(data.fee_percentual) : null,
      fee_fixo: data.fee_fixo ? Number(data.fee_fixo) : null,
      prazo_entrega_dias: data.prazo_entrega_dias ? Number(data.prazo_entrega_dias) : 15,
      prazo_garantia_dias: data.prazo_garantia_dias ? Number(data.prazo_garantia_dias) : 90,
      status: data.status,
      responsavel_interno: data.responsavel_interno || null,
      logo_url: client?.logo_url || null,
    };

    let clientId = client?.id;
    if (isEditing && client) {
      await updateClient.mutateAsync({ id: client.id, ...payload });
    } else {
      const created = await createClient.mutateAsync(payload);
      clientId = created.id;
    }

    // Save contacts
    if (clientId) {
      const validContacts = contacts.filter((c) => c.nome.trim());
      await saveContacts.mutateAsync({
        clientId,
        accountId: currentOrganization.id,
        contacts: validContacts,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados da empresa */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dados da empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input {...register("razao_social", { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input {...register("nome_fantasia")} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input {...register("cnpj")} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input {...register("site")} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Controller
                  control={control}
                  name="setor"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Porte</Label>
                <Controller
                  control={control}
                  name="porte"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {portes.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea {...register("observacoes")} rows={3} />
            </div>
          </div>

          {/* Responsável interno */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Responsável Interno</h3>
            <div className="space-y-2">
              <Label>Recrutador responsável</Label>
              <Controller
                control={control}
                name="responsavel_interno"
                render={({ field }) => (
                  <Select value={field.value || "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione um membro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem responsável</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.name} {m.email && `(${m.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Acordo comercial */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Acordo Comercial</h3>
            <div className="space-y-3">
              <Label>Modelo de Fee</Label>
              <Controller
                control={control}
                name="modelo_fee"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="percentual" id="fee-pct" />
                      <Label htmlFor="fee-pct" className="font-normal">Percentual do salário anual</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fixo" id="fee-fixo" />
                      <Label htmlFor="fee-fixo" className="font-normal">Valor fixo por vaga</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="hibrido" id="fee-hibrido" />
                      <Label htmlFor="fee-hibrido" className="font-normal">Híbrido</Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(modeloFee === "percentual" || modeloFee === "hibrido") && (
                <div className="space-y-2">
                  <Label>Fee Percentual (%)</Label>
                  <Input type="number" step="0.1" {...register("fee_percentual")} />
                </div>
              )}
              {(modeloFee === "fixo" || modeloFee === "hibrido") && (
                <div className="space-y-2">
                  <Label>Fee Fixo (R$)</Label>
                  <Input type="number" step="0.01" {...register("fee_fixo")} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Prazo de entrega (dias úteis)</Label>
                <Input type="number" {...register("prazo_entrega_dias")} />
              </div>
              <div className="space-y-2">
                <Label>Prazo de garantia (dias)</Label>
                <Input type="number" {...register("prazo_garantia_dias")} />
              </div>
            </div>
          </div>

          {/* Contatos inline */}
          <ClientContactsSection contacts={contacts} onChange={setContacts} />

          {/* Status */}
          {isEditing && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEditing ? "Salvar" : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
