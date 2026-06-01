import { ReactNode } from "react";

interface HubHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function HubHeader({ title, description, children }: HubHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-medium tracking-tight mb-1.5">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
