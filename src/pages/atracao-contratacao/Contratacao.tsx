import { Filter, MessageCircleQuestion, Network, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Job Description",
    description: "Crie descrições de vagas alinhadas com sua cultura, valores e competências",
    icon: FileText,
    url: "/atracao-contratacao/contratacao/job-description",
  },
  {
    title: "Funil de Contratação",
    description: "Estruture e gerencie seu processo seletivo alinhado com a cultura organizacional",
    icon: Filter,
    url: "/atracao-contratacao/contratacao/funil",
  },
  {
    title: "Perguntas baseada em Valores",
    description: "Crie roteiros de entrevistas focados nos valores da sua empresa",
    icon: MessageCircleQuestion,
    url: "/atracao-contratacao/contratacao/perguntas-valores",
  },
  {
    title: "Organograma",
    description: "Visualize e gerencie a estrutura hierárquica da sua organização",
    icon: Network,
    url: "/atracao-contratacao/contratacao/organograma",
  },
];

export default function Contratacao() {
  return (
    <AppLayout 
      title="Contratação" 
      breadcrumb={[{ label: "Home", href: "/" }, { label: "Atração e Contratação", href: "/atracao-contratacao" }, { label: "Contratação" }]}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contratação</h1>
          <p className="text-muted-foreground mt-2">
            Ferramentas para estruturar seu processo de contratação alinhado com a cultura organizacional.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <feature.icon className="h-10 w-10 mb-4" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={feature.url}>Acessar</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
