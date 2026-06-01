import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Play, Pause, Eye, Edit, Trash2, Users, BarChart3, Copy, FileEdit, Archive } from "lucide-react";
import { isPast, isFuture, isWithinInterval } from "date-fns";
import type { Survey } from "@/types/survey.types";
import { CATEGORY_ICONS, CATEGORY_LABELS, STATUS_LABELS } from "@/types/survey.types";
import { formatBRT } from "@/lib/datetime";

interface SurveyCardProps {
  survey: Survey;
  onEdit: (survey: Survey) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onClose: (id: string) => void;
  onViewResults: (survey: Survey) => void;
  onInvite: (survey: Survey) => void;
  onDuplicate?: (survey: Survey) => void;
  onReactivate?: (id: string) => void;
  onArchive?: (id: string) => void;
  onDraft?: (id: string) => void;
}

export function SurveyCard({
  survey,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewResults,
  onInvite,
  onDuplicate,
  onReactivate,
  onArchive,
  onDraft,
}: SurveyCardProps) {
  const startDate = new Date(survey.start_date);
  const endDate = new Date(survey.end_date);
  const now = new Date();

  const isActive = survey.status === 'active' && isWithinInterval(now, { start: startDate, end: endDate });
  const isExpired = isPast(endDate) && survey.status === 'active';
  const isPending = isFuture(startDate) && survey.status === 'active';

  const getStatusColor = () => {
    if (survey.status === 'draft') return 'bg-muted text-muted-foreground';
    if (survey.status === 'closed' || isExpired) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (isActive) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (isPending) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = () => {
    if (isExpired) return 'Expirado';
    if (isPending) return 'Aguardando início';
    return STATUS_LABELS[survey.status];
  };

  const categoryIcon = survey.category ? CATEGORY_ICONS[survey.category as keyof typeof CATEGORY_ICONS] : '📋';
  const categoryLabel = survey.category ? CATEGORY_LABELS[survey.category as keyof typeof CATEGORY_LABELS] : 'Questionário';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryIcon}</span>
            <div>
              <CardTitle className="text-lg">{survey.title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{categoryLabel}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()} variant="outline">
              {getStatusLabel()}
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
                {survey.status === 'active' && !isExpired && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onInvite(survey)}>
                      <Users className="h-4 w-4 mr-2" />
                      Enviar para usuários
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver resultados
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onClose(survey.id)}>
                      <Pause className="h-4 w-4 mr-2" />
                      Encerrar
                    </DropdownMenuItem>
                    {onDraft && (
                      <DropdownMenuItem onClick={() => onDraft(survey.id)}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Voltar para Rascunho
                      </DropdownMenuItem>
                    )}
                    {onArchive && (
                      <DropdownMenuItem onClick={() => onArchive(survey.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {isExpired && survey.status === 'active' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver resultados
                    </DropdownMenuItem>
                    {onReactivate && (
                      <DropdownMenuItem onClick={() => onReactivate(survey.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Reativar
                      </DropdownMenuItem>
                    )}
                    {onDraft && (
                      <DropdownMenuItem onClick={() => onDraft(survey.id)}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Voltar para Rascunho
                      </DropdownMenuItem>
                    )}
                    {onArchive && (
                      <DropdownMenuItem onClick={() => onArchive(survey.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {survey.status === 'closed' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(survey)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver resultados
                    </DropdownMenuItem>
                    {onReactivate && (
                      <DropdownMenuItem onClick={() => onReactivate(survey.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Reativar
                      </DropdownMenuItem>
                    )}
                    {onDraft && (
                      <DropdownMenuItem onClick={() => onDraft(survey.id)}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Voltar para Rascunho
                      </DropdownMenuItem>
                    )}
                    {onArchive && (
                      <DropdownMenuItem onClick={() => onArchive(survey.id)}>
                        <Archive className="h-4 w-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {survey.status === 'archived' && (
                  <>
                    <DropdownMenuItem onClick={() => onViewResults(survey)}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Ver resultados
                    </DropdownMenuItem>
                    {onReactivate && (
                      <DropdownMenuItem onClick={() => onReactivate(survey.id)}>
                        <Play className="h-4 w-4 mr-2" />
                        Reativar
                      </DropdownMenuItem>
                    )}
                    {onDraft && (
                      <DropdownMenuItem onClick={() => onDraft(survey.id)}>
                        <FileEdit className="h-4 w-4 mr-2" />
                        Voltar para Rascunho
                      </DropdownMenuItem>
                    )}
                  </>
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              {formatBRT(startDate, "dd/MM/yyyy")} - {formatBRT(endDate, "dd/MM/yyyy")}
            </span>
            {survey.is_anonymous && (
              <Badge variant="outline" className="text-xs">
                Anônimo
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
