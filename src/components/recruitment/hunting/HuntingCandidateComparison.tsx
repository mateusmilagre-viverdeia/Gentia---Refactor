import { useMemo } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  X,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Briefcase,
  Star,
} from 'lucide-react';
import type { HuntingResult } from '@/hooks/useHuntingSearch';
import jsPDF from 'jspdf';
import { formatBRT } from "@/lib/datetime";


interface HuntingCandidateComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: HuntingResult[];
  jobTitle?: string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

const DIMENSION_LABELS: Record<string, string> = {
  mandatory_skills_match: 'Skills Obrigatórias',
  nice_to_have_match: 'Nice to Have',
  experience_fit: 'Experiência',
  culture_fit: 'Cultura',
};

export function HuntingCandidateComparison({
  open,
  onOpenChange,
  candidates,
  jobTitle,
}: HuntingCandidateComparisonProps) {
  const chartData = useMemo(() => {
    const dimensions = ['mandatory_skills_match', 'nice_to_have_match', 'experience_fit', 'culture_fit'];
    return dimensions.map(dim => {
      const point: Record<string, any> = {
        dimension: DIMENSION_LABELS[dim],
        fullMark: 100,
      };
      candidates.forEach((c, idx) => {
        const breakdown = c.extracted_data?.score_breakdown;
        point[`c${idx}`] = breakdown ? (breakdown as any)[dim] || 0 : 0;
      });
      return point;
    });
  }, [candidates]);

  const getName = (r: HuntingResult) =>
    r.extracted_data?.name || r.extracted_data?.title?.split(' at ')[0] || 'Candidato';

  const exportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparativo de Candidatos — Hunting', margin, y);
    y += 8;

    if (jobTitle) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Vaga: ${jobTitle}`, margin, y);
      y += 6;
    }

    doc.setTextColor(100);
    doc.setFontSize(9);
    doc.text(`Gerado em: ${formatBRT(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, margin, y);
    y += 12;
    doc.setTextColor(0);

    candidates.forEach((c, idx) => {
      const name = getName(c);
      const data = c.extracted_data || {};
      const breakdown = data.score_breakdown;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${name}`, margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (data.title) { doc.text(`   Cargo: ${data.title}`, margin, y); y += 5; }
      if (data.company) { doc.text(`   Empresa: ${data.company}`, margin, y); y += 5; }
      if (data.location) { doc.text(`   Local: ${data.location}`, margin, y); y += 5; }
      doc.text(`   Score Total: ${c.match_score || 0}%`, margin, y); y += 5;

      if (breakdown) {
        doc.text(`   Skills: ${breakdown.mandatory_skills_match}% | Nice-to-have: ${breakdown.nice_to_have_match}% | Exp: ${breakdown.experience_fit}% | Cultura: ${breakdown.culture_fit}%`, margin, y);
        y += 5;

        const details = breakdown.details;
        if (details?.matched_mandatory?.length) {
          doc.text(`   ✓ Skills: ${details.matched_mandatory.join(', ')}`, margin, y); y += 5;
        }
        if (details?.missed_mandatory?.length) {
          doc.text(`   ✗ Faltando: ${details.missed_mandatory.join(', ')}`, margin, y); y += 5;
        }
        if (details?.deal_breaker_flags?.length) {
          doc.text(`   ⚠ Deal breakers: ${details.deal_breaker_flags.join(', ')}`, margin, y); y += 5;
        }
      }

      if (c.recruiter_notes) {
        doc.text(`   Notas: ${c.recruiter_notes.substring(0, 100)}`, margin, y); y += 5;
      }

      y += 5;
      if (y > 260) { doc.addPage(); y = margin; }
    });

    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i}/${pages} | Gentia`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`comparativo-hunting-${formatBRT(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (candidates.length < 2) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Comparação de Candidatos ({candidates.length})
            </DialogTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={exportPDF}>
              <Download className="h-3.5 w-3.5" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Candidate cards side by side */}
            <div className={`grid gap-4 ${candidates.length === 2 ? 'grid-cols-2' : candidates.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {candidates.map((c, idx) => {
                const data = c.extracted_data || {};
                const breakdown = data.score_breakdown;
                const details = breakdown?.details;

                return (
                  <Card key={c.id} className="border-t-4" style={{ borderTopColor: CHART_COLORS[idx % CHART_COLORS.length] }}>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm">{getName(c)}</h3>
                        {data.title && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="h-3 w-3" />
                            {data.title}
                          </p>
                        )}
                        {data.company && (
                          <p className="text-xs text-muted-foreground">{data.company}</p>
                        )}
                        {data.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {data.location}
                          </p>
                        )}
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">{c.match_score || 0}%</span>
                      </div>

                      {/* Score breakdown */}
                      {breakdown && (
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className="p-1.5 rounded bg-muted/50 text-center">
                            <div className="font-semibold">{breakdown.mandatory_skills_match}%</div>
                            <div className="text-muted-foreground">Skills</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/50 text-center">
                            <div className="font-semibold">{breakdown.nice_to_have_match}%</div>
                            <div className="text-muted-foreground">Extras</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/50 text-center">
                            <div className="font-semibold">{breakdown.experience_fit}%</div>
                            <div className="text-muted-foreground">Experiência</div>
                          </div>
                          <div className="p-1.5 rounded bg-muted/50 text-center">
                            <div className="font-semibold">{breakdown.culture_fit}%</div>
                            <div className="text-muted-foreground">Cultura</div>
                          </div>
                        </div>
                      )}

                      {/* Matched skills */}
                      {details?.matched_mandatory && details.matched_mandatory.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Skills encontradas</p>
                          <div className="flex flex-wrap gap-1">
                            {details.matched_mandatory.map((s: string) => (
                              <Badge key={s} variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missed skills */}
                      {details?.missed_mandatory && details.missed_mandatory.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Skills faltantes</p>
                          <div className="flex flex-wrap gap-1">
                            {details.missed_mandatory.map((s: string) => (
                              <Badge key={s} variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30">
                                <XCircle className="h-2.5 w-2.5 mr-0.5" />
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deal breakers */}
                      {details?.deal_breaker_flags && details.deal_breaker_flags.length > 0 && (
                        <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                          <p className="text-xs font-medium text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Deal Breakers
                          </p>
                          <ul className="text-[10px] text-destructive/80 mt-1 space-y-0.5">
                            {details.deal_breaker_flags.map((f: string, i: number) => (
                              <li key={i}>• {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tags */}
                      {(c.tags || []).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {c.recruiter_notes && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                          {c.recruiter_notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Radar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Comparação de Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickCount={5} />
                    {candidates.map((c, idx) => (
                      <Radar
                        key={c.id}
                        name={getName(c)}
                        dataKey={`c${idx}`}
                        stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value) => (
                        <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                      )}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
