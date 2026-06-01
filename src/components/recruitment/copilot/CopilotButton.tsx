import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { CopilotSheet } from "./CopilotSheet";
import type { CopilotScope } from "./useCopilot";

interface Props {
  scope: CopilotScope;
  candidateId?: string;
  jobId?: string;
  contextLabel?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  label?: string;
}

export function CopilotButton({
  scope,
  candidateId,
  jobId,
  contextLabel,
  variant = "outline",
  size = "sm",
  label = "Perguntar à IA",
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        {size !== "icon" && <span>{label}</span>}
      </Button>
      <CopilotSheet
        open={open}
        onOpenChange={setOpen}
        scope={scope}
        candidateId={candidateId}
        jobId={jobId}
        contextLabel={contextLabel}
      />
    </>
  );
}
