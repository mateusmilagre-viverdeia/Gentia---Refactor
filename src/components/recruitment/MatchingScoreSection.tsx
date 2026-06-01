import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface CandidateItem {
  id: string;
  score: number;
  candidate: {
    id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } | null;
  created_at?: string;
}

interface MatchingScoreSectionProps {
  title: string;
  items: CandidateItem[];
  onClickCandidate: (item: CandidateItem) => void;
}

const getInitials = (candidate: CandidateItem["candidate"]) => {
  const fullName = candidate?.full_name || `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim();
  if (!fullName) return "C";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
};

const getCandidateName = (candidate: CandidateItem["candidate"]) => {
  return candidate?.full_name || `${candidate?.first_name || ''} ${candidate?.last_name || ''}`.trim() || "Candidato";
};

function CandidateCard({
  item,
  borderColor,
  badgeBorderColor,
  badgeTextColor,
  bgColor,
  onClick,
}: {
  item: CandidateItem;
  borderColor: string;
  badgeBorderColor: string;
  badgeTextColor: string;
  bgColor: string;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 bg-background rounded-lg cursor-pointer hover:bg-muted/50 border shadow-sm transition-all"
      onClick={onClick}
    >
      <Avatar className={`h-10 w-10 border ${borderColor}`}>
        <AvatarImage src={item.candidate?.avatar_url || undefined} />
        <AvatarFallback className={`text-xs ${bgColor}`}>{getInitials(item.candidate)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{getCandidateName(item.candidate)}</p>
        <p className="text-xs text-muted-foreground">
          {item.created_at ? formatBRT(new Date(item.created_at), "dd/MM/yyyy") : ""}
        </p>
      </div>
      <Badge variant="outline" className={`${badgeBorderColor} ${badgeTextColor} shrink-0`}>{item.score ?? 0}%</Badge>
      <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

export function MatchingScoreSection({ title, items, onClickCandidate }: MatchingScoreSectionProps) {
  const low = items.filter(i => i.score < 50);
  const medium = items.filter(i => i.score >= 50 && i.score <= 80);
  const high = items.filter(i => i.score > 80);

  if (items.length === 0) return null;

  const renderColumn = (
    label: string,
    gradientFrom: string,
    gradientTo: string,
    list: CandidateItem[],
    borderColor: string,
    badgeBorderColor: string,
    badgeTextColor: string,
    bgColor: string,
  ) => (
    <div className="space-y-4">
      <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white text-center py-3 rounded-xl font-semibold text-sm shadow-sm`}>
        {label} ({list.length})
      </div>
      <div className="min-h-[120px] bg-muted/30 rounded-xl p-3 border-2 border-dashed border-muted space-y-2">
        {list.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum candidato</p>
        ) : list.map(item => (
          <CandidateCard
            key={item.id}
            item={item}
            borderColor={borderColor}
            badgeBorderColor={badgeBorderColor}
            badgeTextColor={badgeTextColor}
            bgColor={bgColor}
            onClick={() => onClickCandidate(item)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-background border rounded-lg p-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-4">{title} ({items.length} candidatos avaliados)</h2>
      <div className="grid grid-cols-3 gap-6">
        {renderColumn("BAIXA", "from-red-500", "to-red-600", low, "border-red-200", "border-red-500", "text-red-600", "bg-red-50")}
        {renderColumn("MÉDIA", "from-yellow-400", "to-yellow-500", medium, "border-yellow-200", "border-yellow-500", "text-yellow-600", "bg-yellow-50")}
        {renderColumn("ALTA", "from-green-500", "to-green-600", high, "border-green-200", "border-green-500", "text-green-600", "bg-green-50")}
      </div>
    </div>
  );
}
