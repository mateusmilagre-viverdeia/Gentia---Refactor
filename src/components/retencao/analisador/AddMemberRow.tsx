import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PulseUser {
  id: string;
  user_id: string;
  full_name: string;
  team_id: string | null;
  org_node_id: string | null;
}

interface AddMemberRowProps {
  valuesCount: number;
  onAdd: (name: string, userId?: string, teamId?: string, orgNodeId?: string) => void;
}

export function AddMemberRow({ valuesCount, onAdd }: AddMemberRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [pulseUsers, setPulseUsers] = useState<PulseUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { account } = useAccount();

  useEffect(() => {
    if (isAdding && account?.id) {
      loadPulseUsers();
    }
  }, [isAdding, account?.id]);

  const loadPulseUsers = async () => {
    if (!account?.id) return;
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data, error } = await client
        .from('pulse_user_profiles')
        .select('id, user_id, full_name, team_id, org_node_id')
        .eq('account_id', account.id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setPulseUsers(data || []);
    } catch (error) {
      console.error('Error loading pulse users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (pulseProfileId: string) => {
    const user = pulseUsers.find(u => u.id === pulseProfileId);
    if (user) {
      onAdd(
        user.full_name, 
        user.user_id, 
        user.team_id || undefined, 
        user.org_node_id || undefined
      );
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <TableRow className="hover:bg-muted/30">
        <TableCell colSpan={valuesCount + 2}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full justify-start text-muted-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Pessoa
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={valuesCount + 2}>
        <div className="flex items-center gap-2">
          <Select onValueChange={handleSelectUser} disabled={loading}>
            <SelectTrigger className="w-[300px] bg-background">
              <SelectValue placeholder={loading ? "Carregando..." : "Selecione uma pessoa"} />
            </SelectTrigger>
            <SelectContent className="bg-background border shadow-lg z-50">
              {pulseUsers.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  {loading ? "Carregando usuários..." : "Nenhum usuário encontrado"}
                </div>
              ) : (
                pulseUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setIsAdding(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
