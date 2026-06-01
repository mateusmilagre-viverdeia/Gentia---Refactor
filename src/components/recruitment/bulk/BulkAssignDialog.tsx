import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (evaluatorId: string) => Promise<void>;
  isLoading?: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email?: string;
  };
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading = false,
}: BulkAssignDialogProps) {
  const { currentAccount } = useOrganization();
  const [selectedEvaluator, setSelectedEvaluator] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch team members who can be evaluators
  const { data: teamMembers = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["team-members-evaluators", currentAccount?.id],
    queryFn: async () => {
      if (!currentAccount?.id) return [];

      const { data, error } = await supabase
        .from("account_members")
        .select(`
          id,
          user_id,
          role,
          profile:profiles!account_members_user_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("account_id", currentAccount.id)
        .eq("is_active", true);

      if (error) throw error;

      // Get emails from auth.users through a function or just use profiles
      return (data || []).map((member) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        profile: Array.isArray(member.profile) ? member.profile[0] : member.profile,
      })) as TeamMember[];
    },
    enabled: open && !!currentAccount?.id,
  });

  useEffect(() => {
    if (open) {
      setSelectedEvaluator("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedEvaluator) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedEvaluator);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      owner: "Proprietário",
      admin: "Administrador",
      manager: "Gerente",
      member: "Membro",
    };
    return labels[role] || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Atribuir Avaliador
          </DialogTitle>
          <DialogDescription>
            Selecione um membro da equipe para avaliar {selectedCount} candidato(s).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Label className="text-sm font-medium">Membros da equipe</Label>

          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum membro da equipe encontrado
            </p>
          ) : (
            <ScrollArea className="h-[280px] rounded-md border">
              <RadioGroup
                value={selectedEvaluator}
                onValueChange={setSelectedEvaluator}
                className="p-2"
              >
                {teamMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                      selectedEvaluator === member.user_id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                    onClick={() => setSelectedEvaluator(member.user_id)}
                  >
                    <RadioGroupItem
                      value={member.user_id}
                      id={`evaluator-${member.user_id}`}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profile?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(member.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.profile?.full_name || "Usuário"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleBadge(member.role)}
                      </p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedEvaluator || isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atribuindo...
              </>
            ) : (
              "Atribuir Avaliador"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
