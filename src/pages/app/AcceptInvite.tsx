import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamInvites } from '@/hooks/useTeamInvites';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, AlertTriangle, UserPlus, Building2 } from 'lucide-react';
import { roleLabels, AccountInvite } from '@/types/account.types';
import { toast } from 'sonner';
import logoGentia from '@/assets/logo-gentia.png';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { validatePassword, translatePasswordError } from '@/lib/passwordValidation';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [invite, setInvite] = useState<AccountInvite | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [accountExists, setAccountExists] = useState<{ email: string } | null>(null);

  // Signup form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { acceptInvite, rejectInvite } = useTeamInvites(null);

  const inviteId = searchParams.get('invite_id');

  // Store masked email from validation for display
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteId) {
        setError('Convite não encontrado');
        setLoading(false);
        return;
      }

      try {
        // Use validate-invite edge function to avoid exposing emails via RLS
        const { data, error: fnError } = await supabase.functions.invoke('validate-invite', {
          body: { invite_id: inviteId },
        });

        if (fnError || !data?.valid) {
          console.error('Validate invite error:', fnError || data?.error);
          setError(data?.error || 'Convite não encontrado ou expirado');
          return;
        }

        // Create invite object with real email for comparison
        setInvite({
          id: inviteId,
          email: data.email || '', // Real email from edge function
          role: data.role,
          expires_at: data.expires_at,
          accepted: false,
          account_id: '',
          invited_by: '',
          created_at: '',
        } as AccountInvite);
        setAccountName(data.company_name);
        setMaskedEmail(data.masked_email || '');

      } catch (err) {
        console.error('Error fetching invite:', err);
        setError('Erro ao carregar convite');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [inviteId]);

  const handleSignUpAndAccept = async () => {
    if (!inviteId || !invite) return;

    // Validate form
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Preencha seu nome e sobrenome');
      return;
    }

    const pwd = validatePassword(password);
    if (!pwd.valid) {
      toast.error(`Senha inválida: ${pwd.failed[0].label.toLowerCase()}`);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setProcessing(true);

    try {
      // Call edge function to create user and accept invite
      const { data, error: fnError } = await supabase.functions.invoke('accept-invite-with-signup', {
        body: {
          invite_id: inviteId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
        },
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        const friendly = translatePasswordError(fnError.message);
        toast.error(friendly || `Erro ao criar conta: ${fnError.message || 'tente novamente'}`);
        setProcessing(false);
        return;
      }

      // User already exists — show dedicated screen instead of redirecting silently
      if (data?.needs_login || data?.account_exists) {
        setAccountExists({ email: data.email });
        setProcessing(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setProcessing(false);
        return;
      }

      // Auto-login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });

      if (signInError) {
        console.error('Auto-login error:', signInError);
        toast.error(`Conta criada, mas o login automático falhou: ${signInError.message}. Faça login manualmente.`);
        navigate(`/auth/login?email=${encodeURIComponent(data.email)}`);
        return;
      }

      toast.success('Conta criada e convite aceito!');
      navigate('/');
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = async () => {
    if (!inviteId) return;

    setProcessing(true);
    const success = await acceptInvite(inviteId);
    if (success) {
      navigate('/');
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!inviteId) return;

    setProcessing(true);
    const success = await rejectInvite(inviteId);
    if (success) {
      navigate('/auth/login');
    }
    setProcessing(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth/login')}>
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Account already exists for this email — show login/reset options instead of signup
  if (accountExists && invite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Você já tem uma conta</CardTitle>
            <CardDescription>
              Já existe um cadastro com o email <strong>{accountExists.email}</strong>.
              Use a sua <strong>senha atual</strong> para entrar — a senha digitada na tela anterior
              <strong> não foi salva</strong>. Após o login, o convite para <strong>{accountName}</strong> será
              aceito automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => navigate(`/auth/login?email=${encodeURIComponent(accountExists.email)}&invite=${inviteId}`)}
            >
              Entrar com minha senha atual
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => navigate(`/auth/esqueci-senha?email=${encodeURIComponent(accountExists.email)}`)}
            >
              Esqueci minha senha
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User NOT logged in - show signup form inline
  if (!user && invite) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <UserPlus className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle>Complete seu Cadastro</CardTitle>
            <CardDescription>
              Você foi convidado para fazer parte de uma equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Invite details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa
                </span>
                <span className="font-medium">{accountName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seu cargo</span>
                <Badge>{roleLabels[invite.role]}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Email</span>
                <span className="text-sm font-medium">{maskedEmail || '***@***'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Válido até
                </span>
                <span className="text-sm">
                  {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            {/* Signup form */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    placeholder="Seu nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={processing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    placeholder="Seu sobrenome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={processing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Crie uma senha forte"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={processing}
                />
                <PasswordStrengthIndicator password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={processing}
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">As senhas não coincidem.</p>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleSignUpAndAccept}
              disabled={processing || !validatePassword(password).valid || password !== confirmPassword}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Criando conta...' : 'Criar Conta e Aceitar Convite'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Já tem uma conta?{' '}
              <a 
                href={`/auth/login?email=${encodeURIComponent(invite.email)}&invite=${inviteId}`}
                className="text-primary hover:underline"
              >
                Faça login
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if email matches
  if (invite && user && user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle>Email Diferente</CardTitle>
            <CardDescription>
              Este convite foi enviado para <strong>{invite.email}</strong>, 
              mas você está logado como <strong>{user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Faça logout e entre com o email correto para aceitar o convite.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/')}>
                Voltar
              </Button>
              <Button onClick={async () => {
                await supabase.auth.signOut();
                navigate(`/auth/login?email=${encodeURIComponent(invite.email)}&invite=${inviteId}`);
              }}>
                Fazer Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in with correct email - show accept/reject
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img src={logoGentia} alt="Gent.IA" className="h-36 w-auto mb-6" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <CardTitle>Convite para Equipe</CardTitle>
          <CardDescription>
            Você foi convidado para fazer parte de uma equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Empresa</span>
              <span className="font-medium">{accountName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Seu cargo</span>
              <Badge>{roleLabels[invite?.role || 'member']}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expira em
              </span>
              <span className="text-sm">
                {invite ? new Date(invite.expires_at).toLocaleDateString('pt-BR') : '-'}
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReject}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Recusar
            </Button>
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={processing}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Aceitando...' : 'Aceitar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
