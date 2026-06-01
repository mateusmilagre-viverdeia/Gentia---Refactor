"use client";

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, UserPlus, User, Building2, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccountMembers } from '@/hooks/useAccountMembers';

export interface SelectedEmployee {
  id?: string;
  name: string;
  email: string;
  source: 'member' | 'manual';
  department?: string;
  jobTitle?: string;
}

interface EmployeeComboboxProps {
  onSelect: (data: SelectedEmployee | null) => void;
  value?: SelectedEmployee | null;
  placeholder?: string;
  disabled?: boolean;
  showDepartmentFilter?: boolean;
}

export function EmployeeCombobox({
  onSelect,
  value,
  placeholder = "Selecionar colaborador...",
  disabled = false,
  showDepartmentFilter = true,
}: EmployeeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { members, loading } = useAccountMembers();

  // Get unique roles for filter
  const roles = useMemo(() => {
    const roleSet = new Set<string>();
    members.forEach(member => {
      if (member.role) roleSet.add(member.role);
    });
    return Array.from(roleSet).sort();
  }, [members]);

  // Filter members
  const filteredMembers = useMemo(() => {
    let result = members;
    
    if (roleFilter && roleFilter !== "all") {
      result = result.filter(m => m.role === roleFilter);
    }
    
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [members, search, roleFilter]);

  // Group by role
  const groupedMembers = useMemo(() => {
    const groups: Record<string, typeof members> = {};
    filteredMembers.forEach(member => {
      const role = member.role || 'Sem função';
      if (!groups[role]) groups[role] = [];
      groups[role].push(member);
    });
    return groups;
  }, [filteredMembers]);

  const handleSelect = (member: typeof members[0] | 'manual') => {
    if (member === 'manual') {
      onSelect({ name: '', email: '', source: 'manual' });
    } else {
      onSelect({
        id: member.user_id,
        name: member.name,
        email: member.email,
        source: 'member',
      });
    }
    setOpen(false);
    setSearch('');
    setRoleFilter("all");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{value.name}</span>
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Ativo
                </Badge>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          {showDepartmentFilter && roles.length > 0 && (
            <div className="flex items-center gap-2 p-3 border-b">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue placeholder="Filtrar por função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as funções</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role} ({members.filter(m => m.role === role).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <CommandInput 
            placeholder="Buscar por nome ou email..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Nenhum membro encontrado</p>
                    <Button variant="outline" size="sm" onClick={() => handleSelect('manual')}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Adicionar manualmente
                    </Button>
                  </div>
                </CommandEmpty>

                {Object.entries(groupedMembers).map(([role, roleMembers]) => (
                  <CommandGroup 
                    key={role} 
                    heading={
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        <span>{role}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">{roleMembers.length}</Badge>
                      </div>
                    }
                  >
                    {roleMembers.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={`${member.name} ${member.email}`}
                        onSelect={() => handleSelect(member)}
                        className="cursor-pointer py-3"
                      >
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted mr-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{member.name}</span>
                            <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Ativo
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        </div>
                        <Check className={cn("h-4 w-4 shrink-0", value?.id === member.user_id ? "opacity-100" : "opacity-0")} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

                <CommandSeparator />
                
                <CommandGroup>
                  <CommandItem onSelect={() => handleSelect('manual')} className="cursor-pointer py-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted mr-3">
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium">Adicionar manualmente</span>
                      <p className="text-sm text-muted-foreground">Para colaboradores não cadastrados</p>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
