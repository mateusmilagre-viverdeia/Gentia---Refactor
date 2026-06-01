import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import type { Survey } from "@/types/survey.types";

interface SurveyInviteModalProps {
  survey: Survey | null;
  open: boolean;
  onClose: () => void;
  onSend: (surveyId: string, userIds: string[]) => Promise<void>;
}

interface TeamMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function SurveyInviteModal({ survey, open, onClose, onSend }: SurveyInviteModalProps) {
  const { account } = useAccount();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [existingInvites, setExistingInvites] = useState<string[]>([]);

  useEffect(() => {
    if (open && account?.id && survey) {
      loadMembers();
      loadExistingInvites();
    }
  }, [open, account?.id, survey]);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const { data: accountMembers } = await supabase
        .from('account_members')
        .select('user_id')
        .eq('account_id', account!.id)
        .eq('is_active', true);

      if (accountMembers) {
        const userIds = accountMembers.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        setMembers(profiles || []);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingInvites = async () => {
    if (!survey) return;
    const { data } = await supabase
      .from('survey_invitations')
      .select('user_id')
      .eq('survey_id', survey.id);

    setExistingInvites(data?.map((i) => i.user_id) || []);
  };

  const filteredMembers = members.filter((m) => {
    const name = `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase();
    const email = (m.email || '').toLowerCase();
    const searchLower = search.toLowerCase();
    return name.includes(searchLower) || email.includes(searchLower);
  });

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const availableIds = filteredMembers
      .filter((m) => !existingInvites.includes(m.id))
      .map((m) => m.id);
    setSelectedIds(availableIds);
  };

  const handleSend = async () => {
    if (!survey || selectedIds.length === 0) return;
    setIsSending(true);
    try {
      await onSend(survey.id, selectedIds);
      setSelectedIds([]);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (member: TeamMember) => {
    const first = member.first_name?.[0] || '';
    const last = member.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enviar Questionário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione os usuários que receberão o questionário "{survey?.title}"
          </p>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedIds.length} selecionado(s)
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Selecionar todos
            </Button>
          </div>

          <ScrollArea className="h-[300px] border rounded-md">
            <div className="p-2 space-y-1">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">Nenhum usuário encontrado</div>
              ) : (
                filteredMembers.map((member) => {
                  const isAlreadyInvited = existingInvites.includes(member.id);
                  const isSelected = selectedIds.includes(member.id);

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                        isAlreadyInvited ? 'opacity-50' : ''
                      }`}
                      onClick={() => !isAlreadyInvited && toggleMember(member.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isAlreadyInvited}
                        onCheckedChange={() => !isAlreadyInvited && toggleMember(member.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(member)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.first_name || ''} {member.last_name || ''}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      {isAlreadyInvited && (
                        <Badge variant="outline" className="text-xs">Já enviado</Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={selectedIds.length === 0 || isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Enviando...' : `Enviar para ${selectedIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
