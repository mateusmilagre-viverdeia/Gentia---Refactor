import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, User, AlertTriangle } from 'lucide-react';
import { PeoplePerformanceScore, getPerformanceLevel } from '@/types/people-performance.types';
import { cn } from '@/lib/utils';

interface PeoplePerformanceTableProps {
  scores: PeoplePerformanceScore[];
  onSelectPerson?: (person: PeoplePerformanceScore) => void;
}

type SortField = 'name' | 'cultural' | 'performance' | 'maturity' | 'index';
type SortDirection = 'asc' | 'desc';

export function PeoplePerformanceTable({ scores, onSelectPerson }: PeoplePerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedScores = [...scores].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortField) {
      case 'name':
        aVal = a.displayName.toLowerCase();
        bVal = b.displayName.toLowerCase();
        break;
      case 'cultural':
        aVal = a.culturalScore ?? -1;
        bVal = b.culturalScore ?? -1;
        break;
      case 'performance':
        aVal = a.performanceScore ?? -1;
        bVal = b.performanceScore ?? -1;
        break;
      case 'maturity':
        aVal = a.maturityScore ?? -1;
        bVal = b.maturityScore ?? -1;
        break;
      case 'index':
        aVal = a.peoplePerformanceIndex;
        bVal = b.peoplePerformanceIndex;
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
      )}
    </Button>
  );

  const ScoreCell = ({ score, showAlert = false }: { score: number | null; showAlert?: boolean }) => {
    if (score === null) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }
    
    const level = getPerformanceLevel(score);
    return (
      <div className="flex items-center gap-2">
        <span className={cn('font-medium', level.color)}>{score.toFixed(0)}%</span>
        {showAlert && score < 50 && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
      </div>
    );
  };

  const SourceBadges = ({ sources }: { sources: PeoplePerformanceScore['sources'] }) => (
    <div className="flex gap-1">
      {sources.peopleAnalysis && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">C</Badge>
      )}
      {sources.performanceAssessment && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">D</Badge>
      )}
      {sources.teamMaturity && (
        <Badge variant="outline" className="text-xs px-1.5 py-0">M</Badge>
      )}
    </div>
  );

  if (scores.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma pessoa encontrada</h3>
        <p className="text-sm text-muted-foreground">
          Selecione avaliações que contenham pessoas para ver o ranking.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>
              <SortButton field="name">Nome</SortButton>
            </TableHead>
            <TableHead className="text-center">
              <SortButton field="cultural">Cultural</SortButton>
            </TableHead>
            <TableHead className="text-center">
              <SortButton field="performance">Desempenho</SortButton>
            </TableHead>
            <TableHead className="text-center">
              <SortButton field="maturity">Maturidade</SortButton>
            </TableHead>
            <TableHead className="text-center w-48">
              <SortButton field="index">PP Index</SortButton>
            </TableHead>
            <TableHead className="w-20">Fontes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedScores.map((person, index) => {
            const level = getPerformanceLevel(person.peoplePerformanceIndex);
            const rank = sortField === 'index' && sortDirection === 'desc' ? index + 1 : null;
            
            return (
              <TableRow 
                key={person.id}
                className={cn(
                  'cursor-pointer hover:bg-muted/50 transition-colors',
                  person.peoplePerformanceIndex < 50 && 'bg-destructive/5'
                )}
                onClick={() => onSelectPerson?.(person)}
              >
                <TableCell className="font-medium text-muted-foreground">
                  {rank && (
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs',
                      rank <= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}>
                      {rank}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {person.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{person.displayName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={person.culturalScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={person.performanceScore} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={person.maturityScore} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className={cn('font-bold', level.color)}>
                        {person.peoplePerformanceIndex.toFixed(1)}%
                      </span>
                      <Badge variant="outline" className={cn('text-xs', level.color, level.bgClass)}>
                        {level.label}
                      </Badge>
                    </div>
                    <Progress 
                      value={person.peoplePerformanceIndex} 
                      className="h-1.5"
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <SourceBadges sources={person.sources} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
