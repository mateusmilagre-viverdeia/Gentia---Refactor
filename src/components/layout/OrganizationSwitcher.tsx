import { useState } from "react";
import { Building2, ChevronsUpDown, Plus, Check } from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSidebar } from "@/components/ui/sidebar";
import { CreateOrganizationModal } from "./CreateOrganizationModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function OrganizationSwitcher() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { organizations, currentOrganization, loading, switchOrganization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <div className={cn("border-b border-border", isCollapsed ? "p-1" : "p-2")}>
        <Skeleton className={cn("h-10", isCollapsed ? "w-10" : "w-full")} />
      </div>
    );
  }

  if (!currentOrganization) {
    // Show create button when no organization exists
    return (
      <>
        <div className={cn("border-b border-border", isCollapsed ? "p-1" : "p-2")}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-5 w-5 text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Criar Organização
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors text-left"
            >
              <Plus className="h-5 w-5 shrink-0 text-primary" />
              <span className="flex-1 min-w-0 text-sm font-medium text-primary">Criar Organização</span>
            </button>
          )}
        </div>
        <CreateOrganizationModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  const handleSelectOrg = (orgId: string) => {
    switchOrganization(orgId);
    setOpen(false);
  };

  const handleAddOrg = () => {
    setOpen(false);
    setModalOpen(true);
  };

  const triggerContent = isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="flex items-center justify-center w-10 h-10 rounded-md bg-accent/50 hover:bg-accent transition-colors"
        >
          <Building2 className="h-5 w-5 text-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {currentOrganization.name}
      </TooltipContent>
    </Tooltip>
  ) : (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md bg-accent/50 hover:bg-accent transition-colors text-left"
    >
      <Building2 className="h-5 w-5 shrink-0 text-primary" />
      <p className="flex-1 min-w-0 text-sm font-medium truncate">{currentOrganization.name}</p>
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );

  return (
    <>
      <div className={cn("border-b border-border", isCollapsed ? "p-1" : "p-2")}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            {triggerContent}
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-1"
            side={isCollapsed ? "right" : "bottom"}
            align="start"
          >
            <div className="space-y-1">
              {/* Organization list */}
              <div className="max-h-64 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-2 rounded-md text-left transition-colors",
                      org.id === currentOrganization.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <p className="flex-1 min-w-0 text-sm font-medium truncate">{org.name}</p>
                    {org.id === currentOrganization.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="h-px bg-border my-1" />

              {/* Add organization button */}
              <button
                onClick={handleAddOrg}
                className="flex items-center gap-2 w-full px-2 py-2 rounded-md text-left hover:bg-accent transition-colors text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">Adicionar Organização</span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <CreateOrganizationModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
