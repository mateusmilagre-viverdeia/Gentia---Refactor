import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  MoreVertical, 
  Calendar, 
  Flag,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Trash2,
  Filter
} from 'lucide-react';
import { usePulseActions, PulseAction } from '@/hooks/usePulseActions';
import { formatBRT } from "@/lib/datetime";


interface ActionsListProps {
  accountId: string;
}

const statusConfig = {
  planned: { label: 'Planejado', icon: Clock, color: 'bg-muted text-muted-foreground' },
  doing: { label: 'Em Andamento', icon: Loader2, color: 'bg-primary/20 text-primary' },
  done: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-500/20 text-green-600' },
  wont_do_now: { label: 'Não Fazer', icon: XCircle, color: 'bg-orange-500/20 text-orange-600' },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média', color: 'bg-yellow-500/20 text-yellow-600' },
  high: { label: 'Alta', color: 'bg-orange-500/20 text-orange-600' },
  critical: { label: 'Crítica', color: 'bg-destructive/20 text-destructive' },
};

export function ActionsList({ accountId }: ActionsListProps) {
  const { actions, loading, fetchActions, updateStatus, deleteAction } = usePulseActions(accountId);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || action.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || action.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStatusChange = async (actionId: string, newStatus: string) => {
    await updateStatus(actionId, newStatus);
  };

  const handleDelete = async (actionId: string) => {
    if (confirm('Tem certeza que deseja excluir esta ação?')) {
      await deleteAction(actionId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle>Lista de Ações</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <Flag className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredActions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma ação encontrada
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Data Limite</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.map((action) => {
                const status = statusConfig[action.status as keyof typeof statusConfig] || statusConfig.planned;
                const priority = priorityConfig[action.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                const StatusIcon = status.icon;

                return (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{action.title}</p>
                        {action.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${action.status === 'doing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priority.color}>
                        {priority.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {action.pulse_drivers?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {action.due_date ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatBRT(new Date(action.due_date), "d MMM yyyy")}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {action.profiles?.first_name || action.profiles?.email || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <DropdownMenuItem 
                              key={key}
                              onClick={() => handleStatusChange(action.id, key)}
                              disabled={action.status === key}
                            >
                              <config.icon className="h-4 w-4 mr-2" />
                              {config.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(action.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
