import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SimulationCaptureModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (nomeEmpresa: string, email: string) => void;
  onSkip: () => void;
}

export function SimulationCaptureModal({
  open,
  onClose,
  onSubmit,
  onSkip,
}: SimulationCaptureModalProps) {
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ nomeEmpresa?: string; email?: string }>({});

  const validateForm = () => {
    const newErrors: { nomeEmpresa?: string; email?: string } = {};

    if (!nomeEmpresa.trim()) {
      newErrors.nomeEmpresa = 'Nome da empresa é obrigatório';
    } else if (nomeEmpresa.trim().length < 3) {
      newErrors.nomeEmpresa = 'Nome da empresa deve ter pelo menos 3 caracteres';
    }

    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(nomeEmpresa.trim(), email.trim());
      setNomeEmpresa('');
      setEmail('');
      setErrors({});
    }
  };

  const handleSkip = () => {
    onSkip();
    setNomeEmpresa('');
    setEmail('');
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar esta simulação?</DialogTitle>
          <DialogDescription>
            Salve esta simulação para consultar depois e apresentar para o cliente sem precisar preencher tudo novamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
            <Input
              id="nomeEmpresa"
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              placeholder="Ex: Empresa ABC Ltda"
            />
            {errors.nomeEmpresa && (
              <p className="text-sm text-destructive">{errors.nomeEmpresa}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleSkip}>
            Pular
          </Button>
          <Button onClick={handleSubmit}>
            Salvar e Calcular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
