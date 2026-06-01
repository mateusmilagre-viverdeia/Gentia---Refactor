import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Pause, Eye, Edit, Trash2, BarChart3, Copy, PlayCircle, Users, HelpCircle } from "lucide-react";
import type { PulseSurvey } from "@/types/pulseSurvey.types";
import { FREQUENCY_LABELS, STATUS_LABELS } from "@/types/pulseSurvey.types";

interface PulseSurveyCardProps {
  survey: PulseSurvey;
  onEdit: (survey: PulseSurvey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onClose: (id: string) => void;
  onViewResults: (survey: PulseSurvey) => void;
  onDuplicate?: (survey: PulseSurvey) => void;
}

export function PulseSurveyCard({
  survey,
  onEdit,
  onDelete,
  onPublish,
  onPause,
  onResume,
  onClose,
  onViewResults,
  onDuplicate,
}: PulseSurveyCardProps) {
  const getStatusColor = () => {
    switch (survey.status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'closed': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const teamsCount = survey.all_teams ? 'Todas' : survey.selected_team_ids?.length || 0;
  const questionsCount = survey.selected_question_ids?.length || 0;
  const driversCount = survey.selected_driver_keys?.length || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <CardTitle className="text-lg">{survey.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {FREQUENCY_LABELS[survey.frequency]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()} variant="outline">
              {STATUS_LABELS[survey.status]}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {survey.status === 'draft' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPublish(survey.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Publicar
                    </DropdownMenuItem>
                  </>
                )}
              {survey.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver Resultados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPause(survey.id)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClose(survey.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Encerrar
                    </DropdownMenuItem>
                  </>
                )}
              {survey.status === 'paused' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver Resultados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onResume(survey.id)}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Retomar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClose(survey.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Encerrar
                    </DropdownMenuItem>
                  </>
                )}
                {survey.status === 'closed' && (
                  <DropdownMenuItem onClick={() => onViewResults(survey)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Resultados
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(survey)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(survey.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {survey.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{survey.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{teamsCount} equipes</span>
          </div>
          <div className="flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>{questionsCount} perguntas</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{driversCount} drivers</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
