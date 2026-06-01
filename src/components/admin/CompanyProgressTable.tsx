import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Users, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompanyProgress } from "@/hooks/useAdminDashboard";
import { CompanyDetailPanel } from "./CompanyDetailPanel";
import { formatBRTRelative } from "@/lib/datetime";


interface CompanyProgressTableProps {
  companies: CompanyProgress[];
  onViewDetails: (companyId: string) => void;
}

// Stage thresholds for completion
const STAGE_THRESHOLDS = {
  mission: { final: 16, mid: 8 },
  vision: { final: 13, mid: 6 },
  values: { final: 9, mid: 4 },
  indicators: { final: 3, mid: 2 },
  decision: { final: 9, mid: 4 },
  energy: { final: 5, mid: 2 },
  development: { final: 5, mid: 2 },
  event: { final: 11, mid: 5 },
  ritual: { final: 7, mid: 3 },
};

function getStatusBadge(stage: number | null, pillar: keyof typeof STAGE_THRESHOLDS) {
  const threshold = STAGE_THRESHOLDS[pillar];
  const currentStage = stage || 0;

  if (currentStage >= threshold.final) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        ✅ {currentStage}/{threshold.final}
      </Badge>
    );
  }
  if (currentStage >= threshold.mid) {
    return (
      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
        🔵 {currentStage}/{threshold.final}
      </Badge>
    );
  }
  if (currentStage > 1) {
    return (
      <Badge variant="outline">
        ⚪ {currentStage}/{threshold.final}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      ⚪ -
    </Badge>
  );
}

export function CompanyProgressTable({ companies, onViewDetails }: CompanyProgressTableProps) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleExpand = (companyId: string) => {
    setExpandedCompany(expandedCompany === companyId ? null : companyId);
  };

  const handleViewProject = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    navigate(`/admin/company/${companyId}`);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Empresa</TableHead>
            <TableHead className="text-center">Missão</TableHead>
            <TableHead className="text-center">Visão</TableHead>
            <TableHead className="text-center">Valores</TableHead>
            <TableHead className="text-center">Indic.</TableHead>
            <TableHead className="text-center">Decisão</TableHead>
            <TableHead className="text-center">Energia</TableHead>
            <TableHead className="text-center">Desenv.</TableHead>
            <TableHead className="text-center">Evento</TableHead>
            <TableHead className="text-center">Rituais</TableHead>
            <TableHead className="text-right">Última Atividade</TableHead>
            <TableHead className="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <>
              <TableRow 
                key={company.company_id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(company.company_id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                      {expandedCompany === company.company_id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <div>
                      <p className="font-medium">{company.company_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{company.member_count} membros</span>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.mission_stage, 'mission')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.vision_stage, 'vision')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.values_stage, 'values')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.indicators_stage, 'indicators')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.decision_stage, 'decision')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.energy_stage, 'energy')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.development_stage, 'development')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.event_stage, 'event')}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(company.ritual_stage, 'ritual')}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {company.last_activity 
                    ? formatBRTRelative(new Date(company.last_activity))
                    : '-'}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => handleViewProject(e, company.company_id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
              {expandedCompany === company.company_id && (
                <TableRow key={`${company.company_id}-detail`}>
                  <TableCell colSpan={12} className="p-0 bg-muted/20">
                    <CompanyDetailPanel companyId={company.company_id} companyName={company.company_name} />
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
          {companies.length === 0 && (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                Nenhuma empresa encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
