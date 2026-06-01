import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompareFinalistsSheet } from "./CompareFinalistsSheet";

interface FinalistInput {
  candidateId: string;
  name: string;
  cultureScore: number | null;
  discScore: number | null;
  techScore: number | null;
  compositeScore: number | null;
}

interface Props {
  jobId: string;
  finalists: FinalistInput[];
}

export function CompareFinalistsButton({ jobId, finalists }: Props) {
  const [open, setOpen] = useState(false);
  const disabled = finalists.length < 2;

  const btn = (
    <Button
      size="sm"
      variant="default"
      className="h-7 text-xs gap-1"
      onClick={() => setOpen(true)}
      disabled={disabled}
    >
      <Sparkles className="h-3.5 w-3.5" />
      Comparar com IA
    </Button>
  );

  return (
    <>
      {disabled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{btn}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Necessário 2 ou mais aprovados</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        btn
      )}
      <CompareFinalistsSheet
        open={open}
        onOpenChange={setOpen}
        jobId={jobId}
        finalists={finalists}
      />
    </>
  );
}
