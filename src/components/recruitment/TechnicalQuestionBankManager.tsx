import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Star, 
  StarOff,
  Code,
  BarChart3,
} from 'lucide-react';
import { useTechnicalQuestionBank, type TechnicalQuestionBankItem, type CreateQuestionInput } from '@/hooks/useTechnicalQuestionBank';
import { TechnicalQuestionFormDialog } from './TechnicalQuestionFormDialog';
import { cn } from '@/lib/utils';

interface TechnicalQuestionBankManagerProps {
  accountId: string;
  agentId?: string;
}

export function TechnicalQuestionBankManager({ accountId, agentId }: TechnicalQuestionBankManagerProps) {
  const [filters, setFilters] = useState({
    skill: '',
    level: undefined as number | undefined,
    type: '',
    search: '',
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<TechnicalQuestionBankItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const {
    questions,
    isLoading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    toggleMandatory,
  } = useTechnicalQuestionBank(accountId, {
    skill: filters.skill || undefined,
    level: filters.level,
    type: filters.type || undefined,
    search: filters.search || undefined,
  });

  const handleSubmit = async (data: CreateQuestionInput) => {
    if (editingQuestion) {
      await updateQuestion.mutateAsync({ id: editingQuestion.id, ...data });
    } else {
      await createQuestion.mutateAsync({ ...data, agent_id: agentId });
    }
    setEditingQuestion(null);
  };

  const handleEdit = (question: TechnicalQuestionBankItem) => {
    setEditingQuestion(question);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteQuestion.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleToggleMandatory = async (question: TechnicalQuestionBankItem) => {
    await toggleMandatory.mutateAsync({
      id: question.id,
      is_mandatory: !question.is_mandatory,
    });
  };

  const getLevelBadge = (level: number) => {
    const configs: Record<number, { label: string; className: string }> = {
      1: { label: 'Nível 1', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      2: { label: 'Nível 2', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
      3: { label: 'Nível 3', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
    };
    return configs[level] || configs[1];
  };

  const getTypeBadge = (type: string) => {
    const configs: Record<string, { label: string }> = {
      conceptual: { label: 'Conceitual' },
      practical: { label: 'Prática' },
      scenario: { label: 'Cenário' },
      debugging: { label: 'Debugging' },
    };
    return configs[type] || { label: type };
  };

  // Get unique skills for filter
  const uniqueSkills = [...new Set(questions.map(q => q.skill_name))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Banco de Perguntas Técnicas
          </CardTitle>
          <CardDescription>
            Gerencie perguntas reutilizáveis para entrevistas técnicas
          </CardDescription>
        </div>
        <Button onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Pergunta
        </Button>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pergunta..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            />
          </div>
          
          <Select
            value={filters.skill || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, skill: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Skills</SelectItem>
              {uniqueSkills.map(skill => (
                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.level?.toString() || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, level: v === 'all' ? undefined : parseInt(v) }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Níveis</SelectItem>
              <SelectItem value="1">Nível 1</SelectItem>
              <SelectItem value="2">Nível 2</SelectItem>
              <SelectItem value="3">Nível 3</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.type || 'all'}
            onValueChange={(v) => setFilters(f => ({ ...f, type: v === 'all' ? '' : v }))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="conceptual">Conceitual</SelectItem>
              <SelectItem value="practical">Prática</SelectItem>
              <SelectItem value="scenario">Cenário</SelectItem>
              <SelectItem value="debugging">Debugging</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <Code className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="font-medium mb-1">Nenhuma pergunta encontrada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie perguntas para usar nas entrevistas técnicas
            </p>
            <Button onClick={() => { setEditingQuestion(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Pergunta
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map(question => {
              const levelConfig = getLevelBadge(question.level);
              const typeConfig = getTypeBadge(question.question_type);

              return (
                <div
                  key={question.id}
                  className={cn(
                    "border rounded-lg p-4 transition-colors hover:bg-muted/30",
                    question.is_mandatory && "border-primary/30 bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {question.is_mandatory && (
                          <Star className="h-4 w-4 text-primary fill-primary" />
                        )}
                        <Badge variant="secondary">{question.skill_name}</Badge>
                        <Badge variant="outline" className={levelConfig.className}>
                          {levelConfig.label}
                        </Badge>
                        <Badge variant="outline">{typeConfig.label}</Badge>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm">{question.question_text}</p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          Usada {question.usage_count}x
                        </span>
                        {question.avg_score && (
                          <span>Score médio: {Math.round(question.avg_score)}%</span>
                        )}
                      </div>

                      {/* Follow-ups */}
                      {(question.followup_if_superficial || question.followup_if_excellent) && (
                        <div className="text-xs text-muted-foreground pt-1 border-t mt-2">
                          {question.followup_if_superficial && (
                            <p>↳ Se superficial: {question.followup_if_superficial}</p>
                          )}
                          {question.followup_if_excellent && (
                            <p>↳ Se excelente: {question.followup_if_excellent}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(question)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleMandatory(question)}>
                          {question.is_mandatory ? (
                            <>
                              <StarOff className="mr-2 h-4 w-4" />
                              Remover Obrigatório
                            </>
                          ) : (
                            <>
                              <Star className="mr-2 h-4 w-4" />
                              Marcar Obrigatória
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(question.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Form Dialog */}
      <TechnicalQuestionFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingQuestion(null);
        }}
        onSubmit={handleSubmit}
        question={editingQuestion}
        isLoading={createQuestion.isPending || updateQuestion.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pergunta será removida do banco e não poderá mais ser usada em novas entrevistas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
