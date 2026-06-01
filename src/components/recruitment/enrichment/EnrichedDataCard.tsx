import { Building2, Briefcase, Calendar, ExternalLink, Github, Linkedin, Mail, Phone, Twitter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EnrichedProfile } from "@/hooks/useEnrichCandidate";
import { formatBRTRelative } from "@/lib/datetime";


interface EnrichedDataCardProps {
  data: EnrichedProfile;
  compact?: boolean;
}

const seniorityLabels: Record<string, string> = {
  entry: "Júnior",
  mid: "Pleno",
  senior: "Sênior",
  executive: "Executivo",
  director: "Diretor",
  vp: "VP",
  c_suite: "C-Level",
  owner: "Proprietário",
};

export function EnrichedDataCard({ data, compact = false }: EnrichedDataCardProps) {
  const enrichedAgo = formatBRTRelative(new Date(data.enriched_at));

  if (compact) {
    return (
      <div className="space-y-2 text-sm">
        {data.current_title && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-3.5 w-3.5" />
            <span>{data.current_title}</span>
            {data.seniority && (
              <Badge variant="secondary" className="text-xs">
                {seniorityLabels[data.seniority] || data.seniority}
              </Badge>
            )}
          </div>
        )}
        {data.current_company && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{data.current_company}</span>
            {data.company_industry && (
              <span className="text-xs opacity-70">• {data.company_industry}</span>
            )}
          </div>
        )}
        <div className="flex gap-2 mt-1">
          {data.linkedin_url && (
            <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer">
              <Linkedin className="h-4 w-4 text-primary hover:text-primary/80" />
            </a>
          )}
          {data.github_url && (
            <a href={data.github_url} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 text-foreground hover:text-foreground/80" />
            </a>
          )}
          {data.twitter_url && (
            <a href={data.twitter_url} target="_blank" rel="noopener noreferrer">
              <Twitter className="h-4 w-4 text-primary hover:text-primary/80" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Dados Enriquecidos
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            via {data.provider}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Atualizado {enrichedAgo}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Professional Info */}
        {(data.current_title || data.current_company) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Profissional</h4>
            {data.current_title && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{data.current_title}</span>
                {data.seniority && (
                  <Badge variant="secondary">
                    {seniorityLabels[data.seniority] || data.seniority}
                  </Badge>
                )}
              </div>
            )}
            {data.current_company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{data.current_company}</span>
              </div>
            )}
          </div>
        )}

        {/* Company Info */}
        {(data.company_industry || data.company_size || data.company_location) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Empresa Atual</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {data.company_industry && (
                  <div>
                    <span className="text-muted-foreground">Setor:</span>{" "}
                    <span>{data.company_industry}</span>
                  </div>
                )}
                {data.company_size && (
                  <div>
                    <span className="text-muted-foreground">Tamanho:</span>{" "}
                    <span>{data.company_size} funcionários</span>
                  </div>
                )}
                {data.company_location && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Local:</span>{" "}
                    <span>{data.company_location}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Contact Info */}
        {(data.work_email || data.personal_email || data.phone_numbers?.length) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Contato</h4>
              <div className="space-y-1 text-sm">
                {data.work_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${data.work_email}`} className="text-primary hover:underline">
                      {data.work_email}
                    </a>
                    <Badge variant="outline" className="text-xs">trabalho</Badge>
                  </div>
                )}
                {data.personal_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${data.personal_email}`} className="text-primary hover:underline">
                      {data.personal_email}
                    </a>
                    <Badge variant="outline" className="text-xs">pessoal</Badge>
                  </div>
                )}
                {data.phone_numbers?.map((phone, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${phone}`} className="hover:underline">
                      {phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Social Links */}
        {(data.linkedin_url || data.github_url || data.twitter_url) && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Redes Sociais</h4>
              <div className="flex flex-wrap gap-2">
                {data.linkedin_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-1 text-primary" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                {data.github_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.github_url} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-1" />
                      GitHub
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
                {data.twitter_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={data.twitter_url} target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4 mr-1 text-primary" />
                      Twitter
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
