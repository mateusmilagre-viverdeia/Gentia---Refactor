import { Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";

interface ComingSoonProps {
  pageName: string;
}

const ComingSoon = ({ pageName }: ComingSoonProps) => {
  const navigate = useNavigate();

  return (
    <AppLayout title={pageName}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Rocket className="h-16 w-16 text-muted-foreground mb-6" />
        
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Em breve!
        </h1>
        
        <p className="text-muted-foreground mb-2">
          A página <span className="font-medium text-foreground">"{pageName}"</span> está em desenvolvimento.
        </p>
        
        <p className="text-sm text-muted-foreground mb-8 max-w-md">
          Estamos trabalhando para trazer essa funcionalidade em breve!
        </p>
        
        <Button variant="outline" onClick={() => navigate("/")}>
          ← Voltar para Home
        </Button>
      </div>
    </AppLayout>
  );
};

export default ComingSoon;
