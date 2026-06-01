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
import { useIntranetCollaborators, type Collaborator } from '@/hooks/useIntranetCollaborators';
import { Loader2 } from 'lucide-react';

interface CollaboratorSelectProps {
  form: UseFormReturn<any>;
  name?: string;
  label?: string;
  placeholder?: string;
  onSelect?: (collaborator: Collaborator | null) => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CollaboratorSelect({ 
  form, 
  name = 'related_employee_id',
  label = 'Colaborador',
  placeholder = 'Selecione um colaborador',
  onSelect
}: CollaboratorSelectProps) {
  const { data: collaborators, isLoading } = useIntranetCollaborators();

  const handleValueChange = (value: string) => {
    form.setValue(name, value);
    if (onSelect && collaborators) {
      const selected = collaborators.find(c => c.id === value) || null;
      onSelect(selected);
    }
  };

  if (isLoading) {
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

  if (!collaborators || collaborators.length === 0) {
    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center h-10 px-3 border rounded-md bg-muted/50">
          <span className="text-sm text-muted-foreground">
            Nenhum colaborador encontrado. Cadastre colaboradores primeiro.
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
              {collaborators.map((collab) => (
                <SelectItem key={collab.id} value={collab.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={collab.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(collab.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{collab.full_name}</span>
                    {collab.job_title && (
                      <span className="text-xs text-muted-foreground">
                        ({collab.job_title})
                      </span>
                    )}
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
