import React from 'react';
import ReactMarkdown from 'react-markdown';

import { 
  FileText, 
  Download, 
  Edit, 
  Send, 
  Eye,
  Copy,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatBRT } from "@/lib/datetime";

interface ProposalPreviewProps {
  content: string;
  status?: string;
  candidateName?: string;
  jobTitle?: string;
  createdAt?: string;
  className?: string;
  onEdit?: () => void;
  onSend?: () => void;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  pending_approval: { label: 'Aguardando Aprovação', variant: 'outline' },
  approved: { label: 'Aprovada', variant: 'default' },
  sent: { label: 'Enviada', variant: 'default' },
  viewed: { label: 'Visualizada', variant: 'default' },
  accepted: { label: 'Aceita', variant: 'default' },
  rejected: { label: 'Recusada', variant: 'destructive' },
  negotiating: { label: 'Em Negociação', variant: 'outline' },
  expired: { label: 'Expirada', variant: 'secondary' },
  withdrawn: { label: 'Retirada', variant: 'secondary' },
};

export function ProposalPreview({
  content,
  status = 'draft',
  candidateName,
  jobTitle,
  createdAt,
  className,
  onEdit,
  onSend,
  showActions = true,
}: ProposalPreviewProps) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Conteúdo copiado!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Proposta - ${candidateName || 'Candidato'}</title>
          <style>
            body {
              font-family: 'Georgia', serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3 { margin-top: 1.5em; }
            h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3em; }
            ul, ol { margin-left: 20px; }
            strong { color: #111; }
          </style>
        </head>
        <body>
          ${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Proposta
          </CardTitle>
          <Badge variant={statusConfig.variant}>
            {statusConfig.label}
          </Badge>
        </div>
        {(candidateName || jobTitle || createdAt) && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {candidateName && <span>{candidateName}</span>}
            {candidateName && jobTitle && <span>•</span>}
            {jobTitle && <span>{jobTitle}</span>}
            {createdAt && (
              <>
                <span>•</span>
                <span>{formatBRT(new Date(createdAt), "dd 'de' MMMM 'de' yyyy")}</span>
              </>
            )}
          </div>
        )}
      </CardHeader>
      
      <Separator />
      
      <CardContent className="pt-4">
        {/* Markdown content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Actions */}
        {showActions && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                {onEdit && status === 'draft' && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
                {onSend && ['draft', 'approved'].includes(status) && (
                  <Button size="sm" onClick={onSend}>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
