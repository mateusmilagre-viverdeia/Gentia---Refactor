import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, KeyRound, User, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoGentia from "@/assets/logo-gentia-black.png";

// Optional context import - will be used when available
let useCandidateProfileContext: (() => { profile: { firstName: string; lastName: string; email: string } | null }) | null = null;

try {
  // Dynamic import to avoid circular dependencies
  const context = require("@/contexts/CandidateProfileContext");
  useCandidateProfileContext = context.useCandidateProfile;
} catch {
  // Context not available
}

interface CandidateNavbarProps {
  user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export function CandidateNavbar({ user: propUser }: CandidateNavbarProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Try to get profile from context if no props provided
  let contextProfile: { firstName: string; lastName: string; email: string } | null = null;
  try {
    if (useCandidateProfileContext && !propUser) {
      const { profile } = useCandidateProfileContext();
      contextProfile = profile;
    }
  } catch {
    // Context not available or not in provider
  }
  
  // Use props if provided, otherwise use context
  const user = propUser || contextProfile;

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Candidato";
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "C";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta com sucesso.",
    });
    navigate("/");
  };

  const handleChangePassword = () => {
    navigate("/candidate/alterar-senha");
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/candidate" className="flex items-center">
          <img src={logoGentia} alt="GENTIA" style={{ width: '160px' }} className="h-auto object-contain" />
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Minhas Candidaturas link */}
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground gap-2"
            onClick={() => navigate("/candidate")}
          >
            <Briefcase className="h-4 w-4" />
            Minhas Candidaturas
          </Button>

          {/* Minha biografia link */}
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/candidato/biografia")}
          >
            Minha biografia
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuItem onClick={() => navigate("/candidato/biografia")} className="gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Minha Biografia
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleChangePassword} className="gap-2">
                <KeyRound className="h-4 w-4" />
                Alterar Senha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
