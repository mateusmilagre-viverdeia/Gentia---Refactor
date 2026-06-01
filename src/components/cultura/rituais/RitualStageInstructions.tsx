import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { STAGE_INSTRUCTIONS } from "@/types/ritual.types";

interface RitualStageInstructionsProps {
  stage: number;
}

export function RitualStageInstructions({ stage }: RitualStageInstructionsProps) {
  const instruction = STAGE_INSTRUCTIONS[stage];
  if (!instruction) return null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardContent className="flex items-start gap-3 py-4 px-5">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 shrink-0 mt-0.5">
          <span className="text-xl">{instruction.icon}</span>
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
            {instruction.title}
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            {instruction.description}
          </p>
        </div>
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-1" />
      </CardContent>
    </Card>
  );
}
