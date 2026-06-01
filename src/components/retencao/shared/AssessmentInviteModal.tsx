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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Loader2, Send, UserCheck, Clock } from "lucide-react";
import { useAccountMembers, AccountMemberOption } from "@/hooks/useAccountMembers";
import { useAssessmentInvitations, AssessmentType } from "@/hooks/useAssessmentInvitations";
import { useAuth } from "@/contexts/AuthContext";

interface AssessmentInviteModalProps {
  open: boolean;
  onClose: () => void;
  assessmentType: AssessmentType;
}

export function AssessmentInviteModal({ 
  open, 
  onClose, 
  assessmentType 
}: AssessmentInviteModalProps) {
  const { user } = useAuth();
  const { members, loading: loadingMembers } = useAccountMembers();
  const { sendInvitations, getUsersWithPendingInvitations } = useAssessmentInvitations();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pendingInvitationUserIds, setPendingInvitationUserIds] = useState<string[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Load pending invitations when modal opens
  useEffect(() => {
    if (open) {
      setLoadingPending(true);
      getUsersWithPendingInvitations(assessmentType)
        .then(setPendingInvitationUserIds)
        .finally(() => setLoadingPending(false));
    } else {
      setSelectedUserIds([]);
      setSearchTerm("");
    }
  }, [open, assessmentType, getUsersWithPendingInvitations]);

  // Filter members (exclude current user and search)
  const filteredMembers = members.filter(member => {
    // Exclude current user
    if (member.user_id === user?.id) return false;
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        member.name.toLowerCase().includes(searchLower) ||
        member.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    const availableUserIds = filteredMembers
      .filter(m => !pendingInvitationUserIds.includes(m.user_id))
      .map(m => m.user_id);
    
    const allSelected = availableUserIds.every(id => selectedUserIds.includes(id));
    
    if (allSelected) {
      setSelectedUserIds(prev => prev.filter(id => !availableUserIds.includes(id)));
    } else {
      setSelectedUserIds(prev => [...new Set([...prev, ...availableUserIds])]);
    }
  };

  const handleSendInvitations = async () => {
    await sendInvitations.mutateAsync({
      userIds: selectedUserIds,
      assessmentType
    });
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const assessmentName = assessmentType === 'disc' ? 'Assessment DISC' : 'Teste QA';
  const availableMembers = filteredMembers.filter(m => !pendingInvitationUserIds.includes(m.user_id));
  const allAvailableSelected = availableMembers.length > 0 && 
    availableMembers.every(m => selectedUserIds.includes(m.user_id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Convidar para {assessmentName}
          </DialogTitle>
          <DialogDescription>
            Selecione os colaboradores que você deseja convidar para realizar o {assessmentName}.
            Eles receberão uma notificação com o convite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Select All */}
          {availableMembers.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={allAvailableSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Selecionar todos
                </label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedUserIds.length} selecionado(s)
              </span>
            </div>
          )}

          {/* Members List */}
          <ScrollArea className="h-[300px] border rounded-lg">
            {loadingMembers || loadingPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "Nenhum colaborador encontrado" : "Nenhum colaborador disponível"}
              </div>
            ) : (
              <div className="divide-y">
                {filteredMembers.map((member) => {
                  const hasPendingInvitation = pendingInvitationUserIds.includes(member.user_id);
                  const isSelected = selectedUserIds.includes(member.user_id);

                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors ${
                        hasPendingInvitation ? 'opacity-50' : 'cursor-pointer'
                      }`}
                      onClick={() => !hasPendingInvitation && handleToggleUser(member.user_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={hasPendingInvitation}
                        onCheckedChange={() => handleToggleUser(member.user_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{member.name}</span>
                          {hasPendingInvitation && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendInvitations}
            disabled={selectedUserIds.length === 0 || sendInvitations.isPending}
          >
            {sendInvitations.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
