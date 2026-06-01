import { useState } from 'react';
import { Plus, Filter, Copy, Edit, Archive, Trash2, Building2, Search, Eye, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { JobDescription } from '@/types/job-description.types';
import { STATUS_CONFIG } from '@/types/job-description.types';

import { JobDescriptionPDFPreview } from './JobDescriptionPDFPreview';
import { CreateRecruitmentJobDialog } from './CreateRecruitmentJobDialog';
import { formatBRTRelative } from "@/lib/datetime";

interface OrgNode {
  id: string;
  title: string;
  roles: string[] | null;
}

interface JobDescriptionListProps {
  jobDescriptions: JobDescription[];
  availableOrgNodes: OrgNode[];
  areas: string[];
  onCreate: (orgNodeId?: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
}

export function JobDescriptionList({
  jobDescriptions,
  availableOrgNodes,
  areas,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  onArchive,
}: JobDescriptionListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [previewJob, setPreviewJob] = useState<JobDescription | null>(null);
  const [recruitmentJobTarget, setRecruitmentJobTarget] = useState<JobDescription | null>(null);

  // Filter job descriptions
  const filteredJobs = jobDescriptions.filter(jd => {
    const matchesSearch = jd.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || jd.status === statusFilter;
    const matchesArea = areaFilter === 'all' || jd.area === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

  const handleCreateNew = () => {
    if (availableOrgNodes.length > 0) {
      setShowOrgSelector(true);
    } else {
      onCreate();
    }
  };

  const handleSelectOrgNode = (nodeId: string) => {
    setShowOrgSelector(false);
    onCreate(nodeId);
  };

  const handleCreateBlank = () => {
    setShowOrgSelector(false);
    onCreate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Job Descriptions</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as descrições de cargo da sua empresa
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Job Description
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        {areas.length > 0 && (
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum job description encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {jobDescriptions.length === 0
                ? 'Crie seu primeiro job description para começar'
                : 'Tente ajustar os filtros de busca'}
            </p>
            {jobDescriptions.length === 0 && (
              <Button onClick={handleCreateNew} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Job Description
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredJobs.map((jd) => (
            <Card key={jd.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{jd.title}</h3>
                      <Badge className={STATUS_CONFIG[jd.status].color}>
                        {STATUS_CONFIG[jd.status].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {jd.area && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {jd.area}
                        </span>
                      )}
                      <span>
                        Atualizado {formatBRTRelative(new Date(jd.updated_at))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewJob(jd)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(jd.id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <span className="sr-only">Ações</span>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="6" r="1" />
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="18" r="1" />
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setRecruitmentJobTarget(jd)}>
                          <Briefcase className="h-4 w-4 mr-2" />
                          Criar Vaga de Recrutamento
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDuplicate(jd.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onArchive(jd.id)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(jd.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Org Node Selector Dialog */}
      <Dialog open={showOrgSelector} onOpenChange={setShowOrgSelector}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Job Description</DialogTitle>
            <DialogDescription>
              Selecione um cargo do organograma ou crie do zero
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {availableOrgNodes.map((node) => (
                <Button
                  key={node.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleSelectOrgNode(node.id)}
                >
                  <div className="text-left">
                    <div className="font-medium">{node.title}</div>
                    {node.roles && node.roles.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {node.roles.slice(0, 2).join(', ')}
                        {node.roles.length > 2 && ` +${node.roles.length - 2} mais`}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
          <Button variant="secondary" onClick={handleCreateBlank} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Criar do Zero
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Job Description?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O job description será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview */}
      {previewJob && (
        <JobDescriptionPDFPreview
          open={!!previewJob}
          onClose={() => setPreviewJob(null)}
          jobDescription={previewJob}
        />
      )}

      {/* Create Recruitment Job Dialog */}
      {recruitmentJobTarget && (
        <CreateRecruitmentJobDialog
          open={!!recruitmentJobTarget}
          onClose={() => setRecruitmentJobTarget(null)}
          jobDescription={recruitmentJobTarget}
        />
      )}
    </div>
  );
}
