import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

export function AccessDenied({
  title = 'Acesso Negado',
  description = 'Você não tem permissão para acessar este recurso. Entre em contato com o administrador da sua conta.',
  showBackButton = true,
}: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        {showBackButton && (
          <CardContent>
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
