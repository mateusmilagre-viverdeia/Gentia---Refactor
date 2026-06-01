import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Linkedin, Mail, ArrowRight } from "lucide-react";
import type { CrossMatchSuggestion } from "@/hooks/useCrossMatchSuggestions";

interface Props {
  suggestion: CrossMatchSuggestion | null;
  mode: "forward" | "reject";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string) => Promise<void> | void;
  loading?: boolean;
}

export function ForwardCandidateDrawer({ suggestion, mode, open, onOpenChange, onConfirm, loading }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open, suggestion?.id]);

  if (!suggestion) return null;

  const c = suggestion.candidate;
  const fullName = c ? `${c.first_name} ${c.last_name}`.trim() : "Candidato";
  const initials = c ? `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`.toUpperCase() : "??";
  const isForward = mode === "forward";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              {isForward ? "Encaminhar candidato" : "Ignorar sugestão"}
            </DrawerTitle>
            <DrawerDescription>
              {isForward
                ? "Adicione uma nota para o recrutador responsável pela vaga destino."
                : "Opcional: registre o motivo para futuras decisões da IA."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-5 overflow-y-auto">
            {/* Candidate */}
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/20">
              <Avatar className="h-14 w-14">
                <AvatarImage src={c?.avatar_url || undefined} alt={fullName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{fullName}</p>
                {c?.email && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" />
                    {c.email}
                  </p>
                )}
                {c?.linkedin_url && (
                  <a
                    href={c.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1.5 mt-1"
                  >
                    <Linkedin className="h-3 w-3" />
                    Ver LinkedIn
                  </a>
                )}
              </div>
              <Badge variant="outline" className="shrink-0">
                Score {suggestion.match_score}%
              </Badge>
            </div>

            {/* Job flow */}
            <div className="flex items-center justify-center gap-3 text-sm">
              <div className="text-center px-3 py-2 rounded-md border bg-background">
                <p className="text-xs text-muted-foreground">Origem</p>
                <p className="font-medium truncate max-w-[180px]">
                  {suggestion.source_job?.title || "—"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-center px-3 py-2 rounded-md border-2 border-primary/40 bg-primary/5">
                <p className="text-xs text-primary">Destino</p>
                <p className="font-medium truncate max-w-[180px]">
                  {suggestion.suggested_job?.title || "—"}
                </p>
              </div>
            </div>

            {/* AI reasoning */}
            {suggestion.reasoning && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Motivo da IA
                </Label>
                <p className="text-sm p-3 rounded-md bg-muted/30 border italic">
                  {suggestion.reasoning}
                </p>
              </div>
            )}

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="cm-note">
                {isForward ? "Nota para o recrutador colega" : "Motivo (opcional)"}
              </Label>
              <Textarea
                id="cm-note"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  isForward
                    ? "Ex: Forte fit técnico, vale fast-track na primeira entrevista."
                    : "Ex: Localização incompatível, candidato já reprovado em vaga similar."
                }
                rows={4}
                maxLength={600}
              />
              <p className="text-[10px] text-muted-foreground text-right">{text.length}/600</p>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={() => onConfirm(text)}
              disabled={loading || (!isForward ? false : false)}
              variant={isForward ? "default" : "destructive"}
            >
              {isForward ? (
                <>
                  <Send className="h-4 w-4 mr-1.5" />
                  Encaminhar candidato
                </>
              ) : (
                "Confirmar ignorar"
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
