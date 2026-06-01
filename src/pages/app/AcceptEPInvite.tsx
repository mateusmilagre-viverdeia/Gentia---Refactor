import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface EPInvite {
  id: string;
  email: string;
  name: string;
  role: string;
  accepted: boolean | null;
  expires_at: string;
}

const roleLabels: Record<string, string> = {
  ep_consultant: 'Consultor EP',
  head_cs: 'Head de CS',
};

export default function AcceptEPInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inviteId = searchParams.get('invite_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invite, setInvite] = useState<EPInvite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state for new user registration
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!inviteId) {
      setError('ID do convite não fornecido');
      setLoading(false);
      return;
    }

    loadInvite();
  }, [inviteId]);

  const loadInvite = async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-ep-invite', {
        body: { invite_id: inviteId },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (!data?.invite) {
        setError('Convite não encontrado');
        return;
      }

      setInvite(data.invite);
    } catch (err: any) {
      console.error('Error loading invite:', err);
      setError('Erro ao carregar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invite) return;

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setSubmitting(true);

    try {
      // Call the edge function to handle the invite acceptance
      const { data, error: fnError } = await supabase.functions.invoke('accept-ep-invite', {
        body: {
          invite_id: invite.id,
          password,
        },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast.success('Conta criada com sucesso!');

      // Auto-login the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        setTimeout(() => navigate('/auth/login'), 2000);
      } else {
        setTimeout(() => navigate('/consultor'), 2000);
      }
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      toast.error(err.message || 'Erro ao aceitar convite');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Conta Criada!</h2>
              <p className="text-muted-foreground">
                Sua conta foi criada com sucesso. Você será redirecionado em instantes...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Convite Inválido</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={() => navigate('/auth/login')}>
                Ir para Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Aceitar Convite EP Partners</CardTitle>
          <CardDescription>
            Você foi convidado para fazer parte da equipe como{' '}
            <span className="font-medium text-foreground">
              {roleLabels[invite?.role || ''] || invite?.role}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Nome:</strong> {invite?.name}</p>
                  <p><strong>Email:</strong> {invite?.email}</p>
                  <p><strong>Cargo:</strong> {roleLabels[invite?.role || ''] || invite?.role}</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="password">Criar Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Aceitar Convite e Criar Conta'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
