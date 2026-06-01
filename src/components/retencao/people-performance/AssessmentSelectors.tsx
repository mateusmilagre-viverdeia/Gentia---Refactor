import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, BarChart3, TrendingUp } from 'lucide-react';

interface Assessment {
  id: string;
  name: string;
}

interface AssessmentSelectorsProps {
  peopleAnalyses: Assessment[];
  performanceAssessments: Assessment[];
  maturityAssessments: Assessment[];
  selectedPeopleAnalysisId: string | null;
  selectedPerformanceAssessmentId: string | null;
  selectedMaturityAssessmentId: string | null;
  onPeopleAnalysisChange: (id: string | null) => void;
  onPerformanceAssessmentChange: (id: string | null) => void;
  onMaturityAssessmentChange: (id: string | null) => void;
}

export function AssessmentSelectors({
  peopleAnalyses,
  performanceAssessments,
  maturityAssessments,
  selectedPeopleAnalysisId,
  selectedPerformanceAssessmentId,
  selectedMaturityAssessmentId,
  onPeopleAnalysisChange,
  onPerformanceAssessmentChange,
  onMaturityAssessmentChange,
}: AssessmentSelectorsProps) {
  const selectors = [
    {
      label: 'Analisador de Pessoas',
      icon: UserCheck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      items: peopleAnalyses,
      value: selectedPeopleAnalysisId,
      onChange: onPeopleAnalysisChange,
      placeholder: 'Selecionar análise...',
    },
    {
      label: 'Avaliação de Desempenho',
      icon: BarChart3,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      items: performanceAssessments,
      value: selectedPerformanceAssessmentId,
      onChange: onPerformanceAssessmentChange,
      placeholder: 'Selecionar avaliação...',
    },
    {
      label: 'Maturidade do Time',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      items: maturityAssessments,
      value: selectedMaturityAssessmentId,
      onChange: onMaturityAssessmentChange,
      placeholder: 'Selecionar avaliação...',
    },
  ];

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectors.map(({ label, icon: Icon, color, bgColor, items, value, onChange, placeholder }) => (
            <div key={label} className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <div className={`p-1.5 rounded ${bgColor}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                {label}
              </Label>
              <Select
                value={value || ''}
                onValueChange={(val) => onChange(val || null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {items.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhuma avaliação disponível
                    </SelectItem>
                  ) : (
                    items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
