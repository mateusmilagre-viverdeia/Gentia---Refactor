import { Button } from "@/components/ui/button";
import { Briefcase, Plus } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
}

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon || <Briefcase className="h-8 w-8 text-muted-foreground" />}
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      
      <Button onClick={onAction}>
        <Plus className="h-4 w-4 mr-2" />
        {actionLabel}
      </Button>
    </div>
  );
};
