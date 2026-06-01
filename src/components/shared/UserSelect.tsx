import { useAccountMembers, AccountMemberOption } from "@/hooks/useAccountMembers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, User } from "lucide-react";

interface UserSelectProps {
  value: string;
  onChange: (userId: string, userName: string) => void;
  placeholder?: string;
  showEmail?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UserSelect({
  value,
  onChange,
  placeholder = "Selecione um usuário",
  showEmail = true,
  disabled = false,
  className,
}: UserSelectProps) {
  const { members, loading } = useAccountMembers();

  const handleChange = (userId: string) => {
    const member = members.find((m) => m.user_id === userId);
    if (member) {
      onChange(member.user_id, member.name);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando usuários...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {members.find((m) => m.user_id === value)?.name || value}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {members.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado
          </div>
        ) : (
          members.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
              <div className="flex flex-col">
                <span className="font-medium">{member.name}</span>
                {showEmail && member.email && (
                  <span className="text-xs text-muted-foreground">{member.email}</span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
