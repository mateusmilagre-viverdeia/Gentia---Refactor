import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, MoreHorizontal, Pencil, History, Trash2 } from "lucide-react";
import { SalaryRangeIndicator } from "./SalaryRangeIndicator";
import type { EmployeePositionWithDetails } from "@/hooks/useEmployeePositions";

interface EmployeesListProps {
  employees: EmployeePositionWithDetails[];
  onEdit: (employee: EmployeePositionWithDetails) => void;
  onViewHistory: (employee: EmployeePositionWithDetails) => void;
  onDelete: (id: string) => void;
}

export function EmployeesList({ employees, onEdit, onViewHistory, onDelete }: EmployeesListProps) {
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    
    const searchLower = search.toLowerCase();
    return employees.filter(emp => {
      const fullName = `${emp.profile.first_name || ''} ${emp.profile.last_name || ''}`.toLowerCase();
      const email = emp.profile.email?.toLowerCase() || '';
      const position = emp.level.position.name.toLowerCase();
      const family = emp.level.position.family.name.toLowerCase();
      
      return fullName.includes(searchLower) || 
             email.includes(searchLower) || 
             position.includes(searchLower) ||
             family.includes(searchLower);
    });
  }, [employees, search]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'entry': return 'Entrada';
      case 'developing': return 'Desenvolvimento';
      case 'ready': return 'Pronto';
      case 'exceeding': return 'Acima';
      default: return '-';
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'entry': return 'text-blue-600 bg-blue-50';
      case 'developing': return 'text-amber-600 bg-amber-50';
      case 'ready': return 'text-green-600 bg-green-50';
      case 'exceeding': return 'text-purple-600 bg-purple-50';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          {/* Search */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo / Nível</TableHead>
                  <TableHead>Salário Atual</TableHead>
                  <TableHead className="w-[200px]">Posição na Faixa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {search ? "Nenhum colaborador encontrado" : "Nenhum colaborador vinculado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {emp.profile.first_name} {emp.profile.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {emp.profile.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{emp.level.position.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {emp.level.position.family.name} • {emp.level.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(emp.current_salary)}
                      </TableCell>
                      <TableCell>
                        {emp.salary_range && emp.current_salary ? (
                          <SalaryRangeIndicator
                            currentSalary={emp.current_salary}
                            minimum={emp.salary_range.minimum}
                            midpoint={emp.salary_range.midpoint}
                            maximum={emp.salary_range.maximum}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem faixa definida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(emp.progression_status)}`}>
                          {getStatusLabel(emp.progression_status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(emp)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewHistory(emp)}>
                              <History className="h-4 w-4 mr-2" />
                              Histórico
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(emp.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vínculo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o colaborador do cargo e todo o histórico salarial associado.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
