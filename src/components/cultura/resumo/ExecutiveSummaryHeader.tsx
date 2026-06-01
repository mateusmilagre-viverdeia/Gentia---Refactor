import { formatBRT } from "@/lib/datetime";
import logoGentia from "@/assets/logo-gentia.png";

interface ExecutiveSummaryHeaderProps {
  companyName: string;
}

export function ExecutiveSummaryHeader({ companyName }: ExecutiveSummaryHeaderProps) {
  const today = formatBRT(new Date(), "dd 'de' MMMM 'de' yyyy");

  return (
    <div className="text-center mb-8 pb-6 border-b print:mb-6 print:pb-4">
      <img
        src={logoGentia}
        alt="Gent.IA"
        className="h-36 w-auto mx-auto mb-4 print:h-48"
      />
      <h1 className="text-2xl font-bold mb-2">Código de Cultura</h1>
      <p className="text-lg font-medium text-muted-foreground">{companyName}</p>
      <p className="text-sm text-muted-foreground mt-1">
        Gerado em {today}
      </p>
    </div>
  );
}
