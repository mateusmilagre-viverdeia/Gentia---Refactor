import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserCog, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MemberItem {
  id: string;
  user_id: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  admin_rh: "Admin RH",
  leader: "Líder",
  member: "Membro",
  viewer: "Visualizador",
};

export function ImpersonationUserSelect() {
  const { user } = useAuth();
  const { account, isOwner } = useAccount();
  const { startImpersonation, isImpersonating } = useImpersonation();
  
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadMembers = async () => {
      if (!account?.id || !user) return;

      try {
        setLoading(true);
        
        // Fetch all members except current user
        const { data: membersData, error: membersError } = await supabase
          .from('account_members')
          .select('id, user_id, role')
          .eq('account_id', account.id)
          .eq('is_active', true)
          .neq('user_id', user.id);

        if (membersError) throw membersError;

        if (!membersData || membersData.length === 0) {
          setMembers([]);
          return;
        }

        // Fetch profiles for these members
        const userIds = membersData.map(m => m.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const formattedMembers: MemberItem[] = membersData.map(m => {
          const profile = profilesMap.get(m.user_id);
          return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            email: profile?.email || '',
          };
        });

        setMembers(formattedMembers);
      } catch (error) {
        console.error('Error loading members:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [account?.id, user]);

  const filteredMembers = members.filter(m => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || m.email.toLowerCase().includes(query);
  });

  const handleImpersonate = async (member: MemberItem) => {
    if (!account?.id) return;

    try {
      setImpersonatingUserId(member.user_id);
      await startImpersonation(member.user_id, account.id);
      toast.success(`Agora você está visualizando como ${member.first_name || member.email}`);
    } catch (error) {
      console.error('Error impersonating:', error);
      toast.error('Erro ao assumir identidade');
    } finally {
      setImpersonatingUserId(null);
    }
  };

  const getInitials = (firstName: string, lastName: string, email: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
  };

  if (!isOwner) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas o proprietário da conta pode assumir identidade de outros usuários.
      </p>
    );
  }

  if (isImpersonating) {
    return (
      <p className="text-sm text-muted-foreground">
        Você já está visualizando como outro usuário. Use o banner no topo para voltar ao seu perfil.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Não há outros usuários na sua conta para visualizar.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredMembers.map((member) => {
            const displayName = `${member.first_name} ${member.last_name}`.trim() || member.email;
            const isLoading = impersonatingUserId === member.user_id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {getInitials(member.first_name, member.last_name, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[member.role] || member.role}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleImpersonate(member)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserCog className="h-4 w-4 mr-1" />
                      Assumir
                    </>
                  )}
                </Button>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário encontrado.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
