import { DISCTeamMember, DISC_DIMENSIONS } from '@/types/disc.types';
import { getDimensionHexColor } from '@/data/disc-team-analysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { formatBRT } from "@/lib/datetime";


interface DISCTeamMemberListProps {
  members: DISCTeamMember[];
  onViewResult?: (sessionId: string) => void;
}

export function DISCTeamMemberList({ members, onViewResult }: DISCTeamMemberListProps) {
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum membro avaliado ainda
      </div>
    );
  }

  return (
    <div className="divide-y">
      {members.map((member) => (
        <div
          key={member.sessionId}
          className="py-4 flex items-center justify-between hover:bg-muted/50 -mx-4 px-4 transition-colors"
        >
          <div className="flex items-center gap-4">
            {/* Profile badges */}
            <div className="flex items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: getDimensionHexColor(member.primaryProfile) }}
              >
                {member.primaryProfile}
              </div>
              {member.secondaryProfile && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs opacity-75"
                  style={{ backgroundColor: getDimensionHexColor(member.secondaryProfile) }}
                >
                  {member.secondaryProfile}
                </div>
              )}
            </div>

            {/* Name and info */}
            <div>
              <div className="font-medium">{member.participantName}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>
                  {DISC_DIMENSIONS[member.primaryProfile].name}
                  {member.secondaryProfile && ` / ${DISC_DIMENSIONS[member.secondaryProfile].name}`}
                </span>
                <span>•</span>
                <span>Intensidade {member.intensity}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Scores summary */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              {(['D', 'I', 'S', 'C'] as const).map((dim) => (
                <span
                  key={dim}
                  className="px-2 py-1 rounded"
                  style={{
                    backgroundColor: `${getDimensionHexColor(dim)}20`,
                    color: getDimensionHexColor(dim)
                  }}
                >
                  {dim}:{member.scores[dim]}
                </span>
              ))}
            </div>

            {/* Completed date */}
            <div className="text-xs text-muted-foreground hidden lg:block">
              {formatBRT(new Date(member.completedAt), "dd/MM/yyyy")}
            </div>

            {/* View button */}
            {onViewResult && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewResult(member.sessionId)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
