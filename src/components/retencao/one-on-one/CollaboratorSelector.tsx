import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAccountMembers, AccountMemberOption } from '@/hooks/useAccountMembers';
import { Loader2 } from 'lucide-react';

interface CollaboratorSelectorProps {
  form: UseFormReturn<any>;
  name?: string;
  label?: string;
  placeholder?: string;
  onSelect?: (member: AccountMemberOption | null) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CollaboratorSelector({ 
  form, 
  name = 'collaborator_id',
  label = 'Colaborador',
  placeholder = 'Selecione um colaborador',
  onSelect
}: CollaboratorSelectorProps) {
  const { members, loading } = useAccountMembers();

  const handleValueChange = (value: string) => {
    form.setValue(name, value);
    if (onSelect && members) {
      const selected = members.find(m => m.user_id === value) || null;
      onSelect(selected);
    }
  };

  if (loading) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando colaboradores...</span>
        </div>
      </FormItem>
    );
  }

  if (!members || members.length === 0) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
          <span className="text-sm text-muted-foreground">
            Nenhum colaborador encontrado na equipe.
          </span>
        </div>
      </FormItem>
    );
  }

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={handleValueChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({member.role})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
