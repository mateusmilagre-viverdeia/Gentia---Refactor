import { useState } from 'react';
import { Search, Filter, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InterviewDetailsSheet } from '../InterviewDetailsSheet';
import { useAgentInterviews, AgentInterviewData } from '@/hooks/useAgentInterviews';

interface AgentInterviewsTabProps {
  agentId: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    in_progress: { label: 'Em andamento', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    completed: { label: 'Concluído', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };
  const variant = variants[status] || variants.pending;
  return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
};

const getEvaluationBadge = (status: string, score: number) => {
  if (status === 'pending') {
    return <span className="text-muted-foreground">-</span>;
  }
  const variants: Record<string, { label: string; className: string }> = {
    approved: { label: `${score.toFixed(1)} Aprovado`, className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    rejected: { label: `${score.toFixed(1)} Reprovado`, className: 'bg-red-500/10 text-red-600 border-red-500/20' },
  };
  const variant = variants[status] || { label: '-', className: '' };
  return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
};

export function AgentInterviewsTab({ agentId }: AgentInterviewsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInterviews, setSelectedInterviews] = useState<string[]>([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: interviews = [], isLoading } = useAgentInterviews(agentId);

  const filteredInterviews = interviews.filter(
    (interview) =>
      interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedInterviews.length === filteredInterviews.length) {
      setSelectedInterviews([]);
    } else {
      setSelectedInterviews(filteredInterviews.map((i) => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInterviews((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleRowClick = (interview: AgentInterviewData) => {
    setSelectedInterviewId(interview.id);
    setSheetOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  // Empty state
  if (interviews.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Nenhuma entrevista realizada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por candidato ou vaga..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">Nenhuma entrevista encontrada para este agente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredInterviews.length} entrevistas realizadas
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por candidato ou vaga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedInterviews.length === filteredInterviews.length && filteredInterviews.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Candidato</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInterviews.map((interview) => (
              <TableRow
                key={interview.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(interview)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedInterviews.includes(interview.id)}
                    onCheckedChange={() => toggleSelect(interview.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{interview.candidateName}</span>
                  </div>
                </TableCell>
                <TableCell>{interview.jobTitle}</TableCell>
                <TableCell>{getStatusBadge(interview.status)}</TableCell>
                <TableCell>
                  {getEvaluationBadge(interview.evaluationStatus, interview.overallScore)}
                </TableCell>
                <TableCell>
                  {interview.duration > 0 ? formatDuration(interview.duration) : '-'}
                </TableCell>
                <TableCell>
                  {interview.status === 'completed' 
                    ? interview.completedAt.toLocaleDateString('pt-BR')
                    : '-'
                  }
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleRowClick(interview)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Ver detalhes
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InterviewDetailsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        interviewId={selectedInterviewId}
      />
    </div>
  );
}
