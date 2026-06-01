import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ArrowRight, Clock, CheckSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AtRiskProject } from '@/types/consulting-reports.types';

interface AtRiskProjectsTableProps {
  projects: AtRiskProject[];
  loading?: boolean;
}

export function AtRiskProjectsTable({ projects, loading }: AtRiskProjectsTableProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Projetos em Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <div className="p-4 rounded-full bg-green-50 dark:bg-green-950/30 mb-3">
            <CheckSquare className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-muted-foreground">Nenhum projeto em situação de risco</p>
          <p className="text-sm text-muted-foreground mt-1">Todos os projetos estão saudáveis</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    if (status === 'critical') {
      return <Badge variant="destructive">Crítico</Badge>;
    }
    return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Atenção</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Projetos em Risco
            </CardTitle>
            <CardDescription>
              Projetos que requerem atenção imediata
            </CardDescription>
          </div>
          <Badge variant="secondary">{projects.length} projeto(s)</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Inatividade</TableHead>
              <TableHead>Fatores de Risco</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.slice(0, 5).map((project) => (
              <TableRow key={project.projectId}>
                <TableCell>
                  <div>
                    <p className="font-medium">{project.projectName}</p>
                    {project.consultants.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {project.consultants.join(', ')}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(project.healthStatus)}</TableCell>
                <TableCell>
                  <span className={`font-semibold ${
                    project.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {project.healthScore}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm">{project.daysSinceLastActivity} dias</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {project.riskFactors.slice(0, 2).map((factor, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                    {project.riskFactors.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.riskFactors.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/consultor/projeto/${project.projectId}`)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {projects.length > 5 && (
          <div className="mt-4 text-center">
            <Button variant="link" className="text-sm">
              Ver todos os {projects.length} projetos em risco
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
