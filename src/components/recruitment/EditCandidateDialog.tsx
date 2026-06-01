import { useState, useEffect } from "react";
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
import { useRecruitmentActions } from "@/hooks/useRecruitmentActions";

interface CandidateData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

interface EditCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateData | null;
}

export function EditCandidateDialog({ open, onOpenChange, candidate }: EditCandidateDialogProps) {
  const { updateCandidate } = useRecruitmentActions();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  useEffect(() => {
    if (candidate) {
      setFirstName(candidate.firstName || "");
      setLastName(candidate.lastName || "");
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");
      setLinkedinUrl(candidate.linkedinUrl || "");
    }
  }, [candidate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!candidate || !firstName.trim()) return;

    updateCandidate.mutate({
      candidateId: candidate.id,
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
      },
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Candidato</DialogTitle>
          <DialogDescription>
            Atualize as informações do candidato.
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCandidate.isPending || !firstName.trim()}>
              {updateCandidate.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
