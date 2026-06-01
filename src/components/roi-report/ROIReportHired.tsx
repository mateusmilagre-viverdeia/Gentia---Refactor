import { parseISO, isValid } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import { ExternalLink } from "lucide-react";

interface Props {
  hired: any;
}

function initials(name?: string) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? formatBRT(date, "dd/MM/yyyy") : null;
}

export function ROIReportHired({ hired }: Props) {
  if (!hired) {
    return (
      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">Candidato contratado</h2>
        <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground sm:p-6">Processo em andamento.</div>
      </section>
    );
  }

  const score = Number(hired.composite_score);
  const hasScore = Number.isFinite(score) && score > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold sm:text-2xl">Candidato contratado</h2>
      <div className="rounded-lg border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {hired.avatar_url ? (
            <img src={hired.avatar_url} alt={hired.name || "Candidato"} className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {initials(hired.name)}
            </div>
          )}
          <div className="flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-xl font-semibold">{hired.name || "Candidato contratado"}</h3>
                {hired.linkedin_url && (
                  <a href={hired.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-xs font-medium text-primary hover:underline">
                    LinkedIn <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
              {(hired.current_role || hired.current_company) && (
                <p className="break-words text-sm text-muted-foreground">
                  {hired.current_role || "Cargo não informado"}
                  {hired.current_company ? ` · ${hired.current_company}` : ""}
                </p>
              )}
              {hired.start_date && <p className="text-xs text-muted-foreground">Início: {formatDate(hired.start_date) || "Não informado"}</p>}
            </div>
            {Array.isArray(hired.strengths) && hired.strengths.length > 0 && (
              <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                {hired.strengths.slice(0, 3).map((strength: string, index: number) => (
                  <li key={index} className="rounded-md bg-muted/60 p-2">{strength}</li>
                ))}
              </ul>
            )}
          </div>
          {hasScore && (
            <div className="text-left sm:text-right">
              <div className="text-3xl font-bold text-primary">{score.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">score composto</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
