import { useState, useMemo } from 'react';
import { Search, Users, Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { useEmployees } from '@/hooks/useEmployees';
import { Loader2 } from 'lucide-react';

const DEPARTMENT_COLORS: Record<string, 'default' | 'info' | 'success' | 'warning' | 'purple' | 'secondary'> = {
  'RH': 'info',
  'Tecnologia': 'purple',
  'Marketing': 'warning',
  'Comercial': 'success',
  'Financeiro': 'default',
  'Operações': 'secondary',
};

function getDeptVariant(dept: string | null) {
  if (!dept) return 'secondary';
  return DEPARTMENT_COLORS[dept] || 'default';
}

export default function TeamDirectoryPage() {
  const { employees, isLoading } = useEmployees();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = !search || 
        emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
        emp.job_title?.toLowerCase().includes(search.toLowerCase()) ||
        emp.department?.toLowerCase().includes(search.toLowerCase()) ||
        emp.location?.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === 'all' || emp.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, search, deptFilter]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const breadcrumb = [
    { label: 'Intranet', href: '/intranet' },
    { label: 'Diretório' },
  ];

  return (
    <AppLayout title="Diretório de Colaboradores" breadcrumb={breadcrumb}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Diretório da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cargo, departamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="secondary">{filtered.length} colaboradores</Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>LinkedIn</TableHead>
                  <TableHead>Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={emp.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{getInitials(emp.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{emp.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.department ? (
                        <Badge variant={getDeptVariant(emp.department)}>{emp.department}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.location ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {emp.location}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{emp.job_title || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>
                      {emp.linkedin_url ? (
                        <a
                          href={emp.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                        >
                          <Linkedin className="h-4 w-4" />
                          Perfil
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {emp.email && (
                          <a href={`mailto:${emp.email}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                            <Mail className="h-3 w-3" />
                            {emp.email}
                          </a>
                        )}
                        {emp.phone && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {emp.phone}
                          </span>
                        )}
                        {!emp.email && !emp.phone && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
