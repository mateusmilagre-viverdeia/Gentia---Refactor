import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, X, Loader2 } from "lucide-react";
import { AssessmentInvitation } from "@/hooks/useAssessmentInvitations";
import { formatBRT } from "@/lib/datetime";


interface PendingInvitationCardProps {
  invitation: AssessmentInvitation;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export function PendingInvitationCard({
  invitation,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining
}: PendingInvitationCardProps) {
  const assessmentName = invitation.assessment_type === 'disc' 
    ? 'Assessment DISC' 
    : 'Teste QA';

  return (
    <Card className="border-primary bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Você foi convidado!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          <strong>{invitation.invited_by_name}</strong> convidou você para realizar o{" "}
          <strong>{assessmentName}</strong>
          {invitation.sent_at && (
            <> em {formatBRT(new Date(invitation.sent_at), "dd/MM/yyyy")}</>
          )}
          .
        </p>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={onAccept} 
            disabled={isAccepting || isDeclining}
            size="sm"
          >
            {isAccepting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Aceitar e Iniciar
          </Button>
          <Button 
            variant="outline" 
            onClick={onDecline}
            disabled={isAccepting || isDeclining}
            size="sm"
          >
            {isDeclining ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            Recusar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
