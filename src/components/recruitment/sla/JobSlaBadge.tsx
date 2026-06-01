import { Badge } from "@/components/ui/badge";
import { differenceInBusinessDays, parseISO, isAfter } from "date-fns";

interface Props {
  deadline: string | null | undefined;
  className?: string;
}

export function JobSlaBadge({ deadline, className }: Props) {
  if (!deadline) {
    return <Badge variant="outline" className={className}>Sem prazo</Badge>;
  }
  const now = new Date();
  const d = parseISO(deadline);

  if (isAfter(now, d)) {
    const overdue = differenceInBusinessDays(now, d);
    return <Badge variant="destructive" className={className}>Atrasado — {overdue}d</Badge>;
  }
  const remaining = differenceInBusinessDays(d, now);
  if (remaining <= 3) {
    return <Badge className={`bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 ${className || ""}`}>Atenção — {remaining}d</Badge>;
  }
  return <Badge className={`bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 ${className || ""}`}>No prazo — {remaining}d</Badge>;
}
