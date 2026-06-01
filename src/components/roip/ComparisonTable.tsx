import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PillarScore } from '@/store/assessmentStore';

interface ComparisonTableProps {
  pillarScores: PillarScore[];
}

export const ComparisonTable = ({ pillarScores }: ComparisonTableProps) => {
  if (!pillarScores || pillarScores.length === 0) {
    return null;
  }

  const getGapIcon = (gap: number) => {
    if (gap > 5) return <TrendingUp className="h-4 w-4" />;
    if (gap < -5) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getGapColor = (gap: number) => {
    if (gap > 5) return 'text-green-600 bg-green-50';
    if (gap < -5) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const avgBenchmark = pillarScores.length > 0 
    ? Math.round(pillarScores.reduce((acc, p) => acc + p.benchmark, 0) / pillarScores.length)
    : 75;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo com Benchmark de Mercado</CardTitle>
        <p className="text-sm text-muted-foreground">
          Benchmark médio: {avgBenchmark}% (empresas de alto desempenho em gestão de pessoas)
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pilar</TableHead>
              <TableHead className="text-center">Seu Score</TableHead>
              <TableHead className="text-center">Benchmark</TableHead>
              <TableHead className="text-center">Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pillarScores.map((pillar, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{pillar.name}</TableCell>
                <TableCell className="text-center">
                  {Math.round(pillar.score)}%
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {Math.round(pillar.benchmark)}%
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getGapColor(pillar.gap)}`}>
                    {getGapIcon(pillar.gap)}
                    <span>
                      {pillar.gap > 0 ? '+' : ''}{Math.round(pillar.gap)}%
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
