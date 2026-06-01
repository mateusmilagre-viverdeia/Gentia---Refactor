import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface Props {
  meta?: any;
  consultancyName?: string;
}

function whatsappUrl(value?: string) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

export function ROIReportFooter({ meta, consultancyName }: Props) {
  const name = meta?.consultancy_name || consultancyName || "nossa equipe";
  const siteUrl = meta?.consultancy_site?.startsWith("http") ? meta.consultancy_site : meta?.consultancy_site ? `https://${meta.consultancy_site}` : null;
  const contactUrl = whatsappUrl(meta?.consultancy_whatsapp) || siteUrl;

  return (
    <>
      <section className="space-y-4 rounded-lg bg-primary/5 p-5 text-center sm:p-8">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold sm:text-xl">Pronto para iniciar um novo processo?</h2>
          <p className="text-sm text-muted-foreground">
            Entre em contato com {name} para discutir sua próxima vaga.
          </p>
        </div>
        {contactUrl ? (
          <Button asChild>
            <a href={contactUrl} target="_blank" rel="noopener noreferrer">
              Solicitar nova vaga <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">Canal de contato não informado neste relatório. Fale com a consultoria responsável pelo processo.</p>
        )}
      </section>
      <footer className="space-y-1 border-t pt-6 text-center text-xs text-muted-foreground">
        <p className="break-words">{name}{meta?.consultancy_site ? ` · ${meta.consultancy_site}` : ""}{meta?.consultancy_whatsapp ? ` · ${meta.consultancy_whatsapp}` : ""}</p>
        <p>Relatório gerado por GENTIA</p>
      </footer>
    </>
  );
}
