import { GraduationCap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TopbarEducacaoButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith("/educacao");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/educacao")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            isActive
              ? "bg-rose-500/20 ring-1 ring-rose-500/30"
              : "bg-rose-500/10 hover:bg-rose-500/20"
          }`}
        >
          <GraduationCap className="h-4 w-4 text-rose-500" />
          <span className="text-sm font-medium text-foreground hidden sm:inline">Educação</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Educação</p>
      </TooltipContent>
    </Tooltip>
  );
}
