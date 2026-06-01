import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  Users,
  Star,
  MoreHorizontal,
  UserPlus,
  Mail,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useTalentPool } from "@/hooks/useTalentPool";
import { useTalentPoolScoring } from "@/hooks/useTalentPoolScoring";
import { useOrganization } from "@/contexts/OrganizationContext";
import { TalentPoolScoreCard } from "./TalentPoolScoreCard";
import { ConvertToApplicationDialog } from "./ConvertToApplicationDialog";

import { cn } from "@/lib/utils";
import type { TalentPoolEntry } from "@/hooks/useTalentPool";
import type { TalentPoolScore } from "@/hooks/useTalentPoolScoring";
import { formatBRTRelative } from "@/lib/datetime";

export function TalentPoolScoringDashboard() {
  const { currentAccount } = useOrganization();
  const { data: entries = [], isLoading: isLoadingEntries, refetch } = useTalentPool(currentAccount?.id);
  const { data: scoringData, isLoading: isLoadingScoring } = useTalentPoolScoring(entries);

  const [selectedEntry, setSelectedEntry] = useState<{
    entry: TalentPoolEntry;
    score?: TalentPoolScore;
  } | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);

  const isLoading = isLoadingEntries || isLoadingScoring;

  const handleConvert = (entry: TalentPoolEntry, score?: TalentPoolScore) => {
    setSelectedEntry({ entry, score });
    setConvertDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const scoredEntries = scoringData?.entries || [];
  const averageScore = scoringData?.averageScore || 0;
  const topCandidates = scoringData?.topCandidates || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-sm text-muted-foreground">Total no Pool</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                <Star className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{topCandidates}</p>
                <p className="text-sm text-muted-foreground">Top Candidatos (70+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageScore}</p>
                <p className="text-sm text-muted-foreground">Score Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Talent Pool Scoring
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {scoredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma entrada no Talent Pool</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Score</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Áreas de Interesse</TableHead>
                    <TableHead>Vagas Compatíveis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Adicionado</TableHead>
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scoredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <TalentPoolScoreCard score={entry.score} compact />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {entry.areas_of_interest?.slice(0, 2).map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {(entry.areas_of_interest?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{entry.areas_of_interest!.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.score.matchingJobs.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {entry.score.matchingJobs.slice(0, 2).map((job) => (
                              <Badge key={job.jobId} variant="secondary" className="text-xs">
                                {job.jobTitle.length > 15
                                  ? job.jobTitle.slice(0, 15) + "..."
                                  : job.jobTitle}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            entry.status === "novo" && "border-primary text-primary",
                            entry.status === "converted" && "border-accent-foreground text-accent-foreground",
                            entry.status === "contacted" && "border-muted-foreground text-muted-foreground"
                          )}
                        >
                          {entry.status === "novo"
                            ? "Novo"
                            : entry.status === "converted"
                            ? "Convertido"
                            : entry.status === "contacted"
                            ? "Contatado"
                            : entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBRTRelative(new Date(entry.created_at))}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleConvert(entry, entry.score)}
                              disabled={entry.status === "converted"}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Converter para Candidato
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => window.open(`mailto:${entry.email}`, "_blank")}
                            >
                              <Mail className="h-4 w-4 mr-2" />
                              Enviar Email
                            </DropdownMenuItem>
                            {entry.linkedin_url && (
                              <DropdownMenuItem
                                onClick={() => window.open(entry.linkedin_url!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver LinkedIn
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <ConvertToApplicationDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        entry={selectedEntry?.entry || null}
        score={selectedEntry?.score}
      />
    </div>
  );
}
