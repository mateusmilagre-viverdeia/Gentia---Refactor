import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellingQuestionCardProps {
  title: string;
  description?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  autoFilled?: boolean;
  autoFilledValue?: string;
  onReload?: () => void;
  required?: boolean;
  minRows?: number;
}

export function SellingQuestionCard({
  title,
  description,
  placeholder,
  value,
  onChange,
  autoFilled,
  autoFilledValue,
  onReload,
  required,
  minRows = 3,
}: SellingQuestionCardProps) {
  const displayValue = autoFilled && !value ? autoFilledValue : value;
  const showReloadButton = autoFilled && autoFilledValue && !!value && onReload;

  return (
    <Card className={cn(
      "transition-all",
      autoFilled && !value && "border-primary/30 bg-primary/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              {title}
              {required && <span className="text-destructive">*</span>}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showReloadButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReload}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Recarregar da cultura
              </Button>
            )}
            {autoFilled && autoFilledValue && !value && (
              <Badge variant="secondary">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-preenchido
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={placeholder}
          value={displayValue || ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "resize-none",
            autoFilled && !value && "bg-primary/5"
          )}
          rows={minRows}
        />
        {autoFilled && autoFilledValue && !value && (
          <p className="text-xs text-muted-foreground mt-2">
            Dados carregados automaticamente. Edite se necessário.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
