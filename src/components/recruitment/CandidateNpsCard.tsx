import { useNpsByCandidate } from "@/hooks/useNps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star } from "lucide-react";
import { formatBRT } from "@/lib/datetime";


interface Props {
  candidateId: string;
}

const categoryConfig = {
  promoter: { label: "Promotor", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", ring: "ring-green-500" },
  neutral: { label: "Neutro", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", ring: "ring-yellow-500" },
  detractor: { label: "Detrator", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", ring: "ring-red-500" },
};

export function CandidateNpsCard({ candidateId }: Props) {
  const { data: records = [] } = useNpsByCandidate(candidateId);
  const answered = records.filter((r: any) => r.answered_at && r.score !== null);
  if (answered.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Feedback NPS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {answered.map((r: any) => {
          const cat = categoryConfig[r.category as keyof typeof categoryConfig] || categoryConfig.neutral;
          return (
            <div key={r.id} className="flex gap-4 items-start">
              <div className={`shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ring-4 ${cat.ring} ring-offset-2 ring-offset-background bg-background`}>
                {r.score}
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={cat.className}>{cat.label}</Badge>
                  {r.recruitment_jobs?.title && (
                    <span className="text-xs text-muted-foreground truncate">
                      {r.recruitment_jobs.title}
                    </span>
                  )}
                </div>
                {r.feedback_text && (
                  <p className="text-sm italic text-muted-foreground">"{r.feedback_text}"</p>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {formatBRT(new Date(r.answered_at), "dd MMM yyyy")}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
