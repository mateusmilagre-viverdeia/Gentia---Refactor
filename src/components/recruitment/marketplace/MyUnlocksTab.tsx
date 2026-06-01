import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Mail, 
  Phone, 
  Linkedin, 
  FileText, 
  ExternalLink,
  MessageSquare,
  Calendar,
  CheckCircle2,
  Loader2
} from "lucide-react";

import { useMyUnlocks, useUpdateUnlockStatus, type TalentPoolUnlock } from "@/hooks/useMarketplace";
import { formatBRT } from "@/lib/datetime";

const STATUS_OPTIONS = [
  { value: "unlocked", label: "Desbloqueado", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contatado", color: "bg-yellow-100 text-yellow-800" },
  { value: "interviewing", label: "Em Entrevista", color: "bg-purple-100 text-purple-800" },
  { value: "hired", label: "Contratado", color: "bg-green-100 text-green-800" },
  { value: "declined", label: "Não Prosseguiu", color: "bg-gray-100 text-gray-800" },
];

export function MyUnlocksTab() {
  const { data: unlocks, isLoading } = useMyUnlocks();
  const updateStatus = useUpdateUnlockStatus();
  const [filterStatus, setFilterStatus] = useState<string>("");

  const filteredUnlocks = unlocks?.filter(u => 
    !filterStatus || u.status === filterStatus
  ) || [];

  const handleStatusChange = (unlock: TalentPoolUnlock, newStatus: string) => {
    const updates: Partial<TalentPoolUnlock> = { status: newStatus };
    
    if (newStatus === "contacted" && !unlock.contact_initiated) {
      updates.contact_initiated = true;
      updates.contacted_at = new Date().toISOString();
    }
    if (newStatus === "hired") {
      updates.hired = true;
      updates.hired_at = new Date().toISOString();
    }

    updateStatus.mutate({ unlockId: unlock.id, updates });
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option ? (
      <Badge className={option.color}>{option.label}</Badge>
    ) : (
      <Badge variant="outline">{status}</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unlocks || unlocks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Nenhum candidato desbloqueado</p>
            <p className="text-sm">
              Busque candidatos no Talent Pool e desbloqueie os que mais combinam com sua empresa.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {STATUS_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {filteredUnlocks.length} candidato(s)
        </span>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidato</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Fit Cultural</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Desbloqueado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUnlocks.map((unlock) => (
              <TableRow key={unlock.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {unlock.revealed_data.full_name || unlock.revealed_data.name || "—"}
                    </p>
                    {unlock.revealed_data.source_sector && (
                      <p className="text-xs text-muted-foreground">
                        Setor: {unlock.revealed_data.source_sector}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {unlock.revealed_data.email && (
                      <a
                        href={`mailto:${unlock.revealed_data.email}`}
                        className="text-muted-foreground hover:text-primary"
                        title={unlock.revealed_data.email}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {unlock.revealed_data.phone && (
                      <a
                        href={`tel:${unlock.revealed_data.phone}`}
                        className="text-muted-foreground hover:text-primary"
                        title={unlock.revealed_data.phone}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    {unlock.revealed_data.linkedin_url && (
                      <a
                        href={unlock.revealed_data.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                    {unlock.revealed_data.cv_url && (
                      <a
                        href={unlock.revealed_data.cv_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <FileText className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {unlock.revealed_data.cultural_score ? (
                    <Badge variant="secondary">
                      {unlock.revealed_data.cultural_score}%
                    </Badge>
                  ) : "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={unlock.status}
                    onValueChange={(value) => handleStatusChange(unlock, value)}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatBRT(new Date(unlock.created_at), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {unlock.contact_initiated && (
                      <MessageSquare className="h-4 w-4 text-primary" />
                    )}
                    {unlock.interview_scheduled && (
                      <Calendar className="h-4 w-4 text-primary" />
                    )}
                    {unlock.hired && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
