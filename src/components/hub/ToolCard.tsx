import { LucideIcon, ArrowRight, Lock, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ToolStatus = 'available' | 'in_progress' | 'completed' | 'locked' | 'coming_soon';
export type ToolCategory = 'primary' | 'blue' | 'green' | 'amber';

interface ToolCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  status?: ToolStatus;
  category?: ToolCategory;
  lockedMessage?: string;
  isDailyUse?: boolean;
}

const categoryColors: Record<ToolCategory, { border: string; icon: string; iconBg: string }> = {
  primary: {
    border: "border-l-primary/40",
    icon: "text-primary",
    iconBg: "bg-primary/5",
  },
  blue: {
    border: "border-l-blue-500/40",
    icon: "text-blue-500",
    iconBg: "bg-blue-500/5",
  },
  green: {
    border: "border-l-emerald-500/40",
    icon: "text-emerald-500",
    iconBg: "bg-emerald-500/5",
  },
  amber: {
    border: "border-l-amber-500/40",
    icon: "text-amber-500",
    iconBg: "bg-amber-500/5",
  },
};

export function ToolCard({
  title,
  description,
  icon: Icon,
  onClick,
  status = 'available',
  category = 'primary',
  lockedMessage,
  isDailyUse = false,
}: ToolCardProps) {
  const isLocked = status === 'locked' || status === 'coming_soon';
  const colors = categoryColors[category];

  const getStatusBadge = () => {
    if (isDailyUse && status !== 'completed' && status !== 'in_progress') {
      return (
        <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-500">
          Uso diário
        </Badge>
      );
    }
    switch (status) {
      case 'coming_soon':
        return <Badge variant="secondary" className="text-xs">Em breve</Badge>;
      case 'locked':
        return (
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Lock className="h-3 w-3" strokeWidth={1.75} />
            Bloqueado
          </Badge>
        );
      case 'in_progress':
        return <Badge className="text-xs bg-amber-500/90 hover:bg-amber-500/80">Em andamento</Badge>;
      case 'completed':
        return <Badge className="text-xs bg-emerald-500/90 hover:bg-emerald-500/80">Concluído</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500/80" strokeWidth={1.75} />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500/80" strokeWidth={1.75} />;
      case 'locked':
        return <Lock className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.75} />;
      default:
        return null;
    }
  };

  return (
    <Card 
      className={cn(
        "relative border-l-[3px] transition-all duration-200",
        colors.border,
        isLocked 
          ? "opacity-60 cursor-not-allowed" 
          : "hover:shadow-md cursor-pointer"
      )}
      onClick={() => !isLocked && onClick()}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn("p-2.5 rounded-lg", colors.iconBg)}>
            <Icon 
              className={cn("h-5 w-5", isLocked ? "text-muted-foreground/60" : colors.icon)} 
              strokeWidth={1.75} 
            />
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
        <CardTitle className="text-base font-medium mt-3">{title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {description}
          {status === 'locked' && lockedMessage && (
            <span className="block mt-1.5 text-amber-600/80 dark:text-amber-400/80 text-xs font-medium">
              {lockedMessage}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button 
          size="sm"
          className="w-full"
          variant={isLocked ? "secondary" : isDailyUse ? "outline" : "default"}
          disabled={isLocked}
        >
          {status === 'locked' ? (
            <>
              <Lock className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
              Bloqueado
            </>
          ) : status === 'coming_soon' ? (
            <>
              <Lock className="mr-2 h-3.5 w-3.5" strokeWidth={1.75} />
              Em breve
            </>
          ) : (
            <>
              Acessar
              <ArrowRight className="ml-2 h-3.5 w-3.5" strokeWidth={1.75} />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
