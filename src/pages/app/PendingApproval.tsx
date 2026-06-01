import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Mail, ArrowLeft } from 'lucide-react';
import logoGentia from '@/assets/logo-gentia.png';

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img 
        src={logoGentia} 
        alt="Gent.IA" 
        className="h-36 w-auto mb-6"
      />
      
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Aguardando Aprovação</CardTitle>
          <CardDescription className="text-base">
            Seu acesso está sendo processado
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              O administrador da equipe foi notificado sobre sua solicitação de acesso.
              Você receberá um email assim que for aprovado.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Verifique sua caixa de entrada</span>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate('/auth/login')}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
