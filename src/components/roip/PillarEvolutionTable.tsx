import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendIndicator } from './TrendIndicator';
import { MonthlyScore, calculateTrend } from '@/hooks/useROIPEvolution';
import { Users, Heart, Magnet, Target } from 'lucide-react';

interface PillarEvolutionTableProps {
  current: MonthlyScore | undefined;
  previous: MonthlyScore | undefined;
}

const PILLAR_CONFIG = [
  { key: 'retencao', label: 'Retenção', icon: Users },
  { key: 'cultura', label: 'Cultura', icon: Heart },
  { key: 'atracao', label: 'Atração', icon: Magnet },
  { key: 'resultados', label: 'Resultados', icon: Target },
];

export const PillarEvolutionTable = ({ current, previous }: PillarEvolutionTableProps) => {
  if (!current?.pillarScores) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução por Pilar</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilar</TableHead>
              <TableHead className="text-center">Mês Anterior</TableHead>
              <TableHead className="text-center">Mês Atual</TableHead>
              <TableHead className="text-center">Variação</TableHead>
              <TableHead className="text-center">Tendência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PILLAR_CONFIG.map(({ key, label, icon: Icon }) => {
              const currentValue = current.pillarScores?.[key as keyof typeof current.pillarScores] || 0;
              const previousValue = previous?.pillarScores?.[key as keyof typeof previous.pillarScores] || 0;
              const trend = calculateTrend(currentValue, previousValue);

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {previous?.pillarScores ? `${previousValue.toFixed(1)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {currentValue.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">
                    {previous?.pillarScores ? (
                      <span className={
                        trend.change > 0 ? 'text-green-500' : 
                        trend.change < 0 ? 'text-red-500' : 
                        'text-muted-foreground'
                      }>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {previous?.pillarScores ? (
                      <TrendIndicator 
                        direction={trend.direction} 
                        percentage={trend.percentage}
                        size="sm"
                      />
                    ) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
