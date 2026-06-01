import { parseISO, isValid } from "date-fns";
import { formatBRT } from "@/lib/datetime";

interface Props {
  meta: any;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? formatBRT(date, "dd 'de' MMM yyyy") : null;
}

export function ROIReportCover({ meta }: Props) {
  const start = formatDate(meta.period_start);
  const end = formatDate(meta.period_end);
  const generated = formatDate(meta.generated_at);

  return (
    <section className="space-y-5 py-8 text-center sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">RELATÓRIO DE PROCESSO SELETIVO</p>
      <div className="space-y-3">
        <h1 className="break-words text-3xl font-bold sm:text-4xl">{meta.job_title || "Vaga não informada"}</h1>
        <p className="break-words text-lg text-muted-foreground sm:text-xl">{meta.client_name || "Cliente não informado"}</p>
      </div>
      <div className="mx-auto grid max-w-2xl gap-3 pt-4 text-sm text-muted-foreground sm:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-xs uppercase">Período</p>
          <p className="break-words font-medium text-foreground">{start ? `${start}${end ? ` a ${end}` : ""}` : "Em andamento"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs uppercase">Geração</p>
          <p className="break-words font-medium text-foreground">{generated || "Não informado"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs uppercase">Responsável</p>
          <p className="break-words font-medium text-foreground">{meta.recruiter_name || "Não informado"}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs uppercase">Consultoria</p>
          <p className="break-words font-medium text-foreground">{meta.consultancy_name || "Não informado"}</p>
        </div>
      </div>
    </section>
  );
}
