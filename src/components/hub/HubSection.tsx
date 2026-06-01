import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HubSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
  columns?: 2 | 3;
}

export function HubSection({ title, children, className, columns = 3 }: HubSectionProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h2>
      <div className={cn(
        "grid gap-4",
        columns === 2 
          ? "grid-cols-1 md:grid-cols-2" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {children}
      </div>
    </div>
  );
}
