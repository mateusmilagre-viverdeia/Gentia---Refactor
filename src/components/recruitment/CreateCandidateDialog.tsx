import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";
import { SOURCE_OPTIONS } from "@/hooks/useSourceAttribution";

interface CreateCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCandidateDialog({ open, onOpenChange }: CreateCandidateDialogProps) {
  const { createCandidate } = useRecruitmentActions();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [source, setSource] = useState("direct");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim()) return;

    createCandidate.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      source,
    }, {
      onSuccess: () => {
        resetForm();
        onOpenChange(false);
      },
    });
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setLinkedinUrl("");
    setSource("direct");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Candidato</DialogTitle>
          <DialogDescription>
            Preencha as informações do novo candidato.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sobrenome"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
              <p className="text-[11px] text-muted-foreground">Necessário para envio de testes e lembretes via WhatsApp.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createCandidate.isPending || !firstName.trim() || phone.trim().length < 10}>
              {createCandidate.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
