import { useState } from 'react';

import { Plus, Search, Edit, Trash2, UserCircle, Cake, Calendar, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEmployees, type Employee } from '@/hooks/useEmployees';
import { EmployeeForm } from '@/components/intranet/EmployeeForm';
import { formatBRT } from "@/lib/datetime";

export default function EmployeesManagementPage() {
  const { employees, isLoading, deleteEmployee } = useEmployees();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleEdit = (employee: Employee) => {
    setEditEmployee(employee);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteEmployee.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const breadcrumb = [
    { label: 'Intranet', href: '/intranet' },
    { label: 'Colaboradores' },
  ];

  return (
    <AppLayout title="Gestão de Colaboradores" breadcrumb={breadcrumb}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Colaboradores
              </CardTitle>
              <Button onClick={() => { setEditEmployee(null); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Colaborador
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">
                {filteredEmployees.length} colaboradores
              </Badge>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Aniversário</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={employee.avatar_url || undefined} />
                            <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            {employee.email && (
                              <p className="text-xs text-muted-foreground">{employee.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.job_title || '-'}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>
                        {employee.birth_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Cake className="h-3 w-3 text-pink-500" />
                            {formatBRT(new Date(employee.birth_date), 'dd/MM')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {employee.hire_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-green-500" />
                            {formatBRT(new Date(employee.hire_date), 'dd/MM/yyyy')}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleteId(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <EmployeeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editEmployee={editEmployee}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O colaborador será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {deleteEmployee.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
