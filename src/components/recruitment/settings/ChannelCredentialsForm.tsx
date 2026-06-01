import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Shield,
  ExternalLink,
  XCircle,
  Clock,
} from 'lucide-react';
import { 
  useSaveCredentials, 
  useValidateCredentials,
  useDeleteCredentials,
  type DistributionCredential,
} from '@/hooks/useDistributionCredentials';
import type { PremiumChannel } from '@/hooks/useJobDistribution';
import { ChannelLogo } from '@/components/recruitment/jobs/ChannelLogo';

const oauthSchema = z.object({
  clientId: z.string().min(1, 'Client ID é obrigatório'),
  clientSecret: z.string().min(1, 'Client Secret é obrigatório'),
  organizationId: z.string().optional(),
});

const apiKeySchema = z.object({
  clientId: z.string().min(1, 'API Key é obrigatória'),
  clientSecret: z.string().optional().default(''),
  organizationId: z.string().optional(),
});

type CredentialsFormValues = z.infer<typeof oauthSchema>;

interface ChannelCredentialsFormProps {
  channel: PremiumChannel;
  existingCredential?: DistributionCredential;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelCredentialsForm({ 
  channel, 
  existingCredential,
  open, 
  onOpenChange,
}: ChannelCredentialsFormProps) {
  const [isValidating, setIsValidating] = useState(false);
  const isApiKey = channel.type === 'api_key';
  
  const saveCredentials = useSaveCredentials();
  const validateCredentials = useValidateCredentials();
  const deleteCredentials = useDeleteCredentials();
  
  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(isApiKey ? apiKeySchema : oauthSchema),
    defaultValues: {
      clientId: existingCredential?.client_id || '',
      clientSecret: '',
      organizationId: existingCredential?.organization_id || '',
    },
  });

  // Reset form when dialog opens with existing credential
  useEffect(() => {
    if (open && existingCredential) {
      form.reset({
        clientId: existingCredential.client_id || '',
        clientSecret: '', // Never show existing secret
        organizationId: existingCredential.organization_id || '',
      });
    }
  }, [open, existingCredential, form]);

  const handleValidate = async () => {
    const values = form.getValues();
    if (!values.clientId || (!isApiKey && !values.clientSecret)) {
      form.trigger();
      return;
    }
    
    setIsValidating(true);
    try {
      await validateCredentials.mutateAsync({
        channelName: channel.name,
        clientId: values.clientId,
        clientSecret: values.clientSecret || '',
        organizationId: values.organizationId,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async (values: CredentialsFormValues) => {
    await saveCredentials.mutateAsync({
      channelName: channel.name,
      clientId: values.clientId,
      clientSecret: values.clientSecret,
      organizationId: values.organizationId,
      credentialType: channel.type,
    });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteCredentials.mutateAsync(channel.name);
    onOpenChange(false);
  };

  const getStatusBadge = () => {
    if (!existingCredential) return null;
    
    switch (existingCredential.status) {
      case 'active':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativo
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive">
            <Clock className="h-3 w-3 mr-1" />
            Expirado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            Revogado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
    }
  };

  const getClientIdLabel = () => {
    switch (channel.name) {
      case 'jooble':
        return 'API Key (Jooble)';
      case 'careerjet':
        return 'Affiliate ID (Careerjet)';
      default:
        return 'Client ID';
    }
  };

  const getClientIdPlaceholder = () => {
    switch (channel.name) {
      case 'jooble':
        return 'Chave obtida em jooble.org/api/about';
      case 'careerjet':
        return 'ID obtido no painel de publisher';
      default:
        return 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    }
  };

  const getOrgIdLabel = () => {
    switch (channel.name) {
      case 'linkedin_api':
        return 'Organization URN (LinkedIn)';
      case 'indeed_api':
        return 'Employer ID (Indeed)';
      case 'vagas_com':
        return 'ID da Empresa (Vagas)';
      case 'infojobs_api':
        return 'E-mail do Usuário (InfoJobs)';
      default:
        return 'Organization ID';
    }
  };

  const getOrgIdPlaceholder = () => {
    switch (channel.name) {
      case 'linkedin_api':
        return 'urn:li:organization:123456789';
      case 'indeed_api':
        return 'emp-123456';
      case 'vagas_com':
        return 'ID fornecido pelo Vagas for Business';
      case 'infojobs_api':
        return 'usuario@empresa.com';
      default:
        return 'ID da organização na plataforma';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelLogo channelName={channel.name} size="md" fallbackIcon={channel.icon} />
            Configurar {channel.displayName}
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            {isApiKey 
              ? 'Configure a chave de API para integração' 
              : 'Configure as credenciais OAuth para integração direta'}
          </DialogDescription>
        </DialogHeader>

        {channel.requiresPartnership && (
          <Alert variant="default" className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Importante:</strong> Esta integração requer parceria formal com a plataforma.
              {channel.partnershipUrl && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto ml-1 text-amber-800 dark:text-amber-200 underline"
                  onClick={() => window.open(channel.partnershipUrl, '_blank')}
                >
                  Saiba mais
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {existingCredential?.error_message && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {existingCredential.error_message}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{getClientIdLabel()}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={getClientIdPlaceholder()} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isApiKey && (
              <FormField
                control={form.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Client Secret
                      {existingCredential && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (deixe em branco para manter o atual)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="••••••••••••••••" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="flex items-center gap-1 text-xs">
                      <Shield className="h-3 w-3" />
                      Armazenado de forma segura no servidor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {!isApiKey && (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getOrgIdLabel()}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={getOrgIdPlaceholder()} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Identificador da sua empresa na plataforma
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {channel.scopes && (
              <div className="space-y-2">
                <FormLabel>Permissões necessárias (Scopes)</FormLabel>
                <div className="flex flex-wrap gap-1">
                  {channel.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
              {existingCredential && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteCredentials.isPending}
                  className="sm:mr-auto"
                >
                  {deleteCredentials.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Remover
                </Button>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={handleValidate}
                disabled={isValidating || validateCredentials.isPending}
              >
                {(isValidating || validateCredentials.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Validar
              </Button>
              
              <Button
                type="submit"
                disabled={saveCredentials.isPending}
              >
                {saveCredentials.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
