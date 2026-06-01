import { Calendar, Clock, ExternalLink, Mail, User, Briefcase, Bot, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatBRT } from "@/lib/datetime";


interface InterviewOverviewTabProps {
  interview: {
    candidateName: string;
    candidateEmail: string;
    candidateId: string;
    jobTitle: string;
    jobId: string;
    agentName: string;
    agentId: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    evaluationStatus: 'approved' | 'rejected' | 'pending' | 'approved_with_caveats';
    duration: number;
    sentAt: Date;
    startedAt: Date;
    completedAt: Date;
    updatedAt: Date;
    overallScore?: number | null;
  };
}

export function InterviewOverviewTab({ interview }: InterviewOverviewTabProps) {
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '-- minutos';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} segundos`;
    if (secs === 0) return `${mins} minutos`;
    return `${mins} minutos ${secs} segundos`;
  };

  const formatDate = (date: Date) => {
    return formatBRT(date, "d 'de' MMM, yyyy 'às' HH:mm");
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

  const getEvaluationBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      approved: { label: 'Recomendado', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
      approved_with_caveats: { label: 'Com ressalvas', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      rejected: { label: 'Não recomendado', className: 'bg-red-500/10 text-red-600 border-red-500/20' },
      pending: { label: 'Pendente', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    };
    const variant = variants[status] || variants.pending;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Grid de informações */}
      <div className="grid grid-cols-2 gap-6">
        {/* Candidato */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Candidato
          </label>
          <a
            href={`/atracao-contratacao/recrutamento/candidates/${interview.candidateId}`}
            className="text-sm font-medium flex items-center gap-1 hover:text-primary transition-colors"
          >
            {interview.candidateName}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Email
          </label>
          <p className="text-sm font-medium">{interview.candidateEmail}</p>
        </div>

        {/* Vaga */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Vaga
          </label>
          <a
            href={`/atracao-contratacao/recrutamento/jobs/${interview.jobId}`}
            className="text-sm font-medium flex items-center gap-1 hover:text-primary transition-colors"
          >
            {interview.jobTitle}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Status</label>
          {getStatusBadge(interview.status)}
        </div>

        {/* Status da Avaliação */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground">Status da Avaliação</label>
          {getEvaluationBadge(interview.evaluationStatus)}
        </div>

        {/* Score de Matching */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" />
            Score de Matching
          </label>
          {interview.overallScore != null ? (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                interview.overallScore >= 70 ? "bg-green-500" : 
                interview.overallScore >= 40 ? "bg-yellow-500" : "bg-red-500"
              }`} />
              <span className="text-sm font-medium">{interview.overallScore}%</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Pendente</p>
          )}
        </div>

        {/* Duração */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Duração
          </label>
          <p className="text-sm font-medium">{formatDuration(interview.duration)}</p>
        </div>

        {/* Data de envio */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Data de envio
          </label>
          <p className="text-sm font-medium">{formatDate(interview.sentAt)}</p>
        </div>

        {/* Iniciou em */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Iniciou em
          </label>
          <p className="text-sm font-medium">{formatDate(interview.startedAt)}</p>
        </div>

        {/* Concluído em */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Concluído em
          </label>
          <p className="text-sm font-medium">{formatDate(interview.completedAt)}</p>
        </div>

        {/* Última atualização */}
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Última atualização
          </label>
          <p className="text-sm font-medium">{formatDate(interview.updatedAt)}</p>
        </div>
      </div>

      {/* Agente */}
      <div className="pt-4 border-t">
        <div className="space-y-1">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            Agente
          </label>
          <a
            href={`/atracao-contratacao/recrutamento/agents/${interview.agentId}`}
            className="text-sm font-medium flex items-center gap-1 hover:text-primary transition-colors"
          >
            {interview.agentName}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
