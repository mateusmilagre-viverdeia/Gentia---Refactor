import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Clock, User2, Building2 } from "lucide-react";
import { isPast } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBRT } from "@/lib/datetime";

interface PostHireChecklistCardProps {
  jobId: string;
  accountId: string;
}

interface ChecklistItem {
  id: string;
  item_key: string;
  title: string;
  description: string | null;
  responsible_type: string | null;
  status: string;
  due_at: string | null;
  completed_at: string | null;
}

interface ChecklistRow {
  id: string;
  hired_at: string | null;
  status: string;
  candidate_id: string;
  recruitment_candidates: { first_name: string | null; last_name: string | null } | null;
  post_hire_checklist_items: ChecklistItem[];
}

export const PostHireChecklistCard = ({ jobId, accountId }: PostHireChecklistCardProps) => {
  const queryClient = useQueryClient();

  const { data: checklists, isLoading } = useQuery({
    queryKey: ["post-hire-checklists", jobId, accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_hire_checklists")
        .select(`
          id, hired_at, status, candidate_id,
          recruitment_candidates:candidate_id ( first_name, last_name ),
          post_hire_checklist_items (
            id, item_key, title, description, responsible_type, status, due_at, completed_at
          )
        `)
        .eq("job_id", jobId)
        .eq("account_id", accountId)
        .order("hired_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ChecklistRow[];
    },
    enabled: !!jobId && !!accountId,
  });

  const toggleItem = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const isDone = item.status === "completed";
      const { error } = await supabase
        .from("post_hire_checklist_items")
        .update({
          status: isDone ? "pending" : "completed",
          completed_at: isDone ? null : new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-hire-checklists", jobId, accountId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível atualizar o item");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!checklists || checklists.length === 0) return null;

  return (
    <div className="space-y-4">
      {checklists.map((checklist) => {
        const items = checklist.post_hire_checklist_items || [];
        const completed = items.filter((i) => i.status === "completed").length;
        const total = items.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const candidateName = [
          checklist.recruitment_candidates?.first_name,
          checklist.recruitment_candidates?.last_name,
        ].filter(Boolean).join(" ") || "Contratado";

        return <ChecklistBlock
          key={checklist.id}
          candidateName={candidateName}
          hiredAt={checklist.hired_at}
          status={checklist.status}
          items={items}
          progress={progress}
          completed={completed}
          total={total}
          onToggle={(item) => toggleItem.mutate(item)}
          isPending={toggleItem.isPending}
        />;
      })}
    </div>
  );
};

interface ChecklistBlockProps {
  candidateName: string;
  hiredAt: string | null;
  status: string;
  items: ChecklistItem[];
  progress: number;
  completed: number;
  total: number;
  onToggle: (item: ChecklistItem) => void;
  isPending: boolean;
}

const ChecklistBlock = ({
  candidateName,
  hiredAt,
  status,
  items,
  progress,
  completed,
  total,
  onToggle,
  isPending,
}: ChecklistBlockProps) => {
  const sorted = useMemo(
    () => [...items].sort((a, b) => {
      if (a.status === b.status) {
        const da = a.due_at ? new Date(a.due_at).getTime() : 0;
        const db = b.due_at ? new Date(b.due_at).getTime() : 0;
        return da - db;
      }
      return a.status === "completed" ? 1 : -1;
    }),
    [items]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              Pós-contratação · {candidateName}
            </CardTitle>
            <CardDescription className="mt-1">
              {hiredAt
                ? `Contratado em ${formatBRT(new Date(hiredAt), "dd/MM/yyyy")}`
                : "Acompanhamento pós-contratação"}
            </CardDescription>
          </div>
          <Badge variant={status === "completed" ? "success" : "outline"}>
            {completed}/{total}
          </Badge>
        </div>
        <Progress value={progress} className="mt-2 h-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map((item) => {
          const isDone = item.status === "completed";
          const overdue = !isDone && item.due_at && isPast(new Date(item.due_at));
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-md border p-3 transition-colors",
                isDone && "bg-muted/40 opacity-70",
                overdue && "border-destructive/40"
              )}
            >
              <Checkbox
                checked={isDone}
                disabled={isPending}
                onCheckedChange={() => onToggle(item)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("text-sm font-medium", isDone && "line-through")}>
                    {item.title}
                  </p>
                  {item.responsible_type === "agency" ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <User2 className="h-3 w-3" /> Recrutador
                    </Badge>
                  ) : item.responsible_type === "employer" ? (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Building2 className="h-3 w-3" /> Cliente
                    </Badge>
                  ) : null}
                  {overdue && (
                    <Badge variant="destructive" className="text-[10px] gap-1">
                      <Clock className="h-3 w-3" /> Atrasado
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                )}
                {item.due_at && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Prazo: {formatBRT(new Date(item.due_at), "dd/MM/yyyy")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
