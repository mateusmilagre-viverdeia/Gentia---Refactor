import { formatBRT } from "@/lib/datetime";

interface ReportCoverPageProps {
  empresa: string;
  vaga: { titulo: string; area?: string; localizacao?: string };
  mensagemAbertura: string;
  generatedAt: string;
  totalCandidatos: number;
}

export function ReportCoverPage({ empresa, vaga, mensagemAbertura, generatedAt, totalCandidatos }: ReportCoverPageProps) {
  return (
    <div className="text-center py-12 px-8 border-b">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
        <span className="text-2xl font-bold">{empresa.charAt(0)}</span>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-1">{empresa}</h1>
      <p className="text-muted-foreground text-sm mb-8">Relatório de Shortlist</p>

      <div className="bg-muted/30 rounded-xl p-6 max-w-md mx-auto mb-8">
        <h2 className="text-lg font-semibold">{vaga.titulo}</h2>
        {vaga.area && <p className="text-sm text-muted-foreground">{vaga.area}</p>}
        {vaga.localizacao && <p className="text-sm text-muted-foreground">{vaga.localizacao}</p>}
        <p className="text-xs text-muted-foreground mt-2">
          {totalCandidatos} candidato{totalCandidatos !== 1 ? 's' : ''} selecionado{totalCandidatos !== 1 ? 's' : ''}
        </p>
      </div>

      {mensagemAbertura && (
        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed italic">
          "{mensagemAbertura}"
        </p>
      )}

      <p className="text-xs text-muted-foreground mt-6">
        Gerado em {formatBRT(generatedAt, "dd 'de' MMMM 'de' yyyy")}
      </p>
    </div>
  );
}
