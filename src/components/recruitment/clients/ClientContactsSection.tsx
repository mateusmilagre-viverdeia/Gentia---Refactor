import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

export interface ContactRow {
  nome: string;
  cargo: string;
  email: string;
  whatsapp: string;
  eh_decisor: boolean;
  eh_contato_principal: boolean;
}

interface Props {
  contacts: ContactRow[];
  onChange: (contacts: ContactRow[]) => void;
}

const blank: ContactRow = {
  nome: "",
  cargo: "",
  email: "",
  whatsapp: "",
  eh_decisor: false,
  eh_contato_principal: false,
};

export function ClientContactsSection({ contacts, onChange }: Props) {
  const update = (i: number, patch: Partial<ContactRow>) => {
    const next = contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    // ensure only one principal
    if (patch.eh_contato_principal) {
      next.forEach((c, idx) => {
        if (idx !== i) c.eh_contato_principal = false;
      });
    }
    onChange(next);
  };

  const remove = (i: number) => onChange(contacts.filter((_, idx) => idx !== i));
  const add = () => onChange([...contacts, { ...blank, eh_contato_principal: contacts.length === 0 }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Contatos
        </h3>
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar contato
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nenhum contato cadastrado. Adicione ao menos um para gerar acesso ao portal.
        </p>
      ) : (
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={i} className="rounded-lg border p-3 space-y-3 bg-muted/20">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={c.nome}
                    onChange={(e) => update(i, { nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cargo</Label>
                  <Input
                    value={c.cargo}
                    onChange={(e) => update(i, { cargo: e.target.value })}
                    placeholder="Ex: Head de RH"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    type="email"
                    value={c.email}
                    onChange={(e) => update(i, { email: e.target.value })}
                    placeholder="email@empresa.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input
                    value={c.whatsapp}
                    onChange={(e) => update(i, { whatsapp: e.target.value })}
                    placeholder="+55 11 99999-9999"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={c.eh_decisor}
                      onCheckedChange={(v) => update(i, { eh_decisor: !!v })}
                    />
                    Decisor
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <Checkbox
                      checked={c.eh_contato_principal}
                      onCheckedChange={(v) => update(i, { eh_contato_principal: !!v })}
                    />
                    Contato principal
                  </label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(i)}
                  className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
