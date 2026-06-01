import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Calendar, FileText } from "lucide-react";
import type { EvolutionWizardData } from "@/types/evolution.types";

interface WizardStepBasicInfoProps {
  data: EvolutionWizardData;
  updateData: (updates: Partial<EvolutionWizardData>) => void;
}

export function WizardStepBasicInfo({ data, updateData }: WizardStepBasicInfoProps) {
  const { currentOrganization } = useOrganization();
  const { members, loading: loadingMembers } = useAccountMembers();

  // Fetch job descriptions
  const { data: jobDescriptions, isLoading: loadingJobs } = useQuery({
    queryKey: ["job-descriptions-published", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data, error } = await supabase
        .from("job_descriptions")
        .select("id, title")
        .eq("account_id", currentOrganization.id)
        .eq("status", "published")
        .order("title");

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrganization?.id,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Informações Básicas
        </CardTitle>
        <CardDescription>
          Defina o colaborador, líder responsável e período do ciclo de evolução
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Collaborator Select */}
        <div className="space-y-2">
          <Label htmlFor="collaborator">Colaborador *</Label>
          <Select
            value={data.collaborator_id}
            onValueChange={(value) => updateData({ collaborator_id: value })}
            disabled={loadingMembers}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingMembers ? "Carregando..." : "Selecione o colaborador"} />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex flex-col">
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Pessoa que será desenvolvida neste ciclo
          </p>
        </div>

        {/* Leader Select */}
        <div className="space-y-2">
          <Label htmlFor="leader">Líder Responsável</Label>
          <Select
            value={data.leader_id || "none"}
            onValueChange={(value) => updateData({ leader_id: value === "none" ? undefined : value })}
            disabled={loadingMembers}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingMembers ? "Carregando..." : "Selecione o líder (opcional)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  <div className="flex flex-col">
                    <span>{member.name}</span>
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Líder que acompanhará o desenvolvimento
          </p>
        </div>

        {/* Job Description Select */}
        <div className="space-y-2">
          <Label htmlFor="job_description" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vincular a Job Description
          </Label>
          <Select
            value={data.job_description_id || "none"}
            onValueChange={(value) => updateData({ job_description_id: value === "none" ? undefined : value })}
            disabled={loadingJobs}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingJobs ? "Carregando..." : "Selecione uma JD (opcional)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma</SelectItem>
              {jobDescriptions?.map((jd) => (
                <SelectItem key={jd.id} value={jd.id}>
                  {jd.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Vincule a uma Job Description para contexto adicional
          </p>
        </div>

        {/* Dates */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="start_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Início *
            </Label>
            <Input
              id="start_date"
              type="date"
              value={data.start_date}
              onChange={(e) => updateData({ start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Término *
            </Label>
            <Input
              id="end_date"
              type="date"
              value={data.end_date}
              onChange={(e) => updateData({ end_date: e.target.value })}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea
            id="notes"
            placeholder="Anotações adicionais sobre este ciclo..."
            value={data.notes || ""}
            onChange={(e) => updateData({ notes: e.target.value })}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
