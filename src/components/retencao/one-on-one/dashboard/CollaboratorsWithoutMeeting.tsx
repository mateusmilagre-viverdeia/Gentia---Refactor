import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarPlus } from 'lucide-react';
import type { OneOnOneAnalytics } from '@/hooks/useOneOnOneMeetings';
import type { Meeting } from '@/hooks/useOneOnOneMeetings';

interface CollaboratorsWithoutMeetingProps {
  inactive: OneOnOneAnalytics['collaborators']['inactive'];
  meetings: Meeting[];
}

export function CollaboratorsWithoutMeeting({ inactive, meetings }: CollaboratorsWithoutMeetingProps) {
  const navigate = useNavigate();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
  };

  const getCollaboratorInfo = (collaboratorId: string) => {
    const meeting = meetings.find(m => m.collaborator_id === collaboratorId);
    return meeting?.collaborator;
  };

  if (inactive.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Colaboradores sem 1:1 Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground text-center">
            🎉 Todos os colaboradores tiveram reuniões nos últimos 14 dias
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Colaboradores sem 1:1 Recente
        </CardTitle>
        <CardDescription>
          Colaboradores sem reunião há mais de 14 dias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {inactive.map((item) => {
            const collaborator = getCollaboratorInfo(item.collaboratorId);
            return (
              <div 
                key={item.collaboratorId}
                className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={collaborator?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(collaborator?.first_name, collaborator?.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">
                      {collaborator?.first_name} {collaborator?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Última reunião: {new Date(item.lastMeeting).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    {item.daysSince} dias
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => navigate('/retencao/reunioes-1-1/nova')}
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
