import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignedCvLink } from "./SignedCvLink";
import {
  User,
  MapPin, 
  Briefcase, 
  Lock, 
  Unlock, 
  ExternalLink,
  Mail,
  Phone,
  Linkedin,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketplaceCandidate, RevealedData } from "@/hooks/useMarketplace";

interface MarketplaceCandidateCardProps {
  candidate: MarketplaceCandidate;
  onUnlock: (poolId: string) => void;
  isUnlocking?: boolean;
  revealedData?: RevealedData;
  creditCost?: number;
}

const discColors: Record<string, string> = {
  D: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  I: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  S: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  C: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

const seniorityLabels: Record<string, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
  especialista: "Especialista",
};

export function MarketplaceCandidateCard({
  candidate,
  onUnlock,
  isUnlocking,
  revealedData,
  creditCost = 8,
}: MarketplaceCandidateCardProps) {
  const [showRevealed, setShowRevealed] = useState(false);
  const isUnlocked = candidate.is_unlocked || !!revealedData;

  const discProfile = candidate.disc_primary 
    ? candidate.disc_secondary 
      ? `${candidate.disc_primary}${candidate.disc_secondary}`
      : candidate.disc_primary
    : null;

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isUnlocked && "border-primary/50"
    )}>
      <CardContent className="pt-5 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isUnlocked ? "bg-primary/10" : "bg-muted"
            )}>
              <User className={cn(
                "h-5 w-5",
                isUnlocked ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              {isUnlocked && revealedData ? (
                <p className="font-semibold text-foreground">
                  {revealedData.full_name || revealedData.name}
                </p>
              ) : (
                <p className="font-medium text-muted-foreground">
                  Candidato {candidate.display_id}
                </p>
              )}
              {candidate.location_city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{candidate.location_city}</span>
                  {candidate.location_state && <span>, {candidate.location_state}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Cultural Score */}
          {candidate.cultural_score && (
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {candidate.cultural_score}%
              </div>
              <p className="text-xs text-muted-foreground">Fit Cultural</p>
            </div>
          )}
        </div>

        {/* DISC Profile */}
        {discProfile && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-muted-foreground">DISC:</span>
            <Badge 
              variant="secondary" 
              className={cn("text-xs", discColors[candidate.disc_primary || ""])}
            >
              {discProfile}
            </Badge>
          </div>
        )}

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {candidate.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {candidate.skills.length > 5 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{candidate.skills.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Experience & Seniority */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {candidate.experience_years && (
            <div className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{candidate.experience_years} anos</span>
            </div>
          )}
          {candidate.seniority_level && (
            <Badge variant="secondary" className="text-xs">
              {seniorityLabels[candidate.seniority_level] || candidate.seniority_level}
            </Badge>
          )}
          {candidate.remote_preference && (
            <span className="text-xs capitalize">{candidate.remote_preference}</span>
          )}
        </div>

        {/* Revealed Data */}
        {isUnlocked && revealedData && showRevealed && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {revealedData.email && (
              <a 
                href={`mailto:${revealedData.email}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Mail className="h-4 w-4" />
                {revealedData.email}
              </a>
            )}
            {revealedData.phone && (
              <a 
                href={`tel:${revealedData.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="h-4 w-4" />
                {revealedData.phone}
              </a>
            )}
            {revealedData.linkedin_url && (
              <a 
                href={revealedData.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Linkedin className="h-4 w-4" />
                Ver LinkedIn
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <SignedCvLink cvUrl={revealedData.cv_url} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <FileText className="h-4 w-4" />
              Ver Currículo
              <ExternalLink className="h-3 w-3" />
            </SignedCvLink>
            {revealedData.source_sector && (
              <p className="text-xs text-muted-foreground mt-2">
                Setor anterior: {revealedData.source_sector}
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        {isUnlocked ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowRevealed(!showRevealed)}
          >
            <Unlock className="h-4 w-4 mr-2" />
            {showRevealed ? "Ocultar Dados" : "Ver Dados Completos"}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onUnlock(candidate.id)}
            disabled={isUnlocking}
          >
            <Lock className="h-4 w-4 mr-2" />
            {isUnlocking ? "Desbloqueando..." : `Desbloquear (${creditCost} créditos)`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
