import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Users, BarChart3, BookOpen } from "lucide-react";

const NossasSolucoes = () => {
  const solucoes = [
    {
      icon: Lightbulb,
      title: "Diagnóstico de Cultura",
      description: "Avaliação completa da cultura organizacional atual com identificação de gaps e oportunidades.",
    },
    {
      icon: Users,
      title: "Construção de Cultura",
      description: "Metodologia estruturada em 8 pilares para desenvolver uma cultura forte e alinhada.",
    },
    {
      icon: BarChart3,
      title: "Assessment ROIP",
      description: "Mensuração do retorno sobre investimento em pessoas e cultura organizacional.",
    },
    {
      icon: BookOpen,
      title: "Programas de Formação",
      description: "Capacitação de lideranças e times para implementação e sustentação da cultura.",
    },
  ];

  return (
    <AppLayout title="Nossas Soluções" breadcrumb={[{ label: "Home", href: "/" }, { label: "EP Partners" }, { label: "Nossas Soluções" }]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Soluções em Cultura Organizacional</h2>
          <p className="text-muted-foreground">
            Conheça nossas soluções completas para desenvolvimento e gestão da cultura organizacional
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {solucoes.map((solucao) => (
            <Card key={solucao.title}>
              <CardHeader>
                <solucao.icon className="h-10 w-10 mb-4" />
                <CardTitle>{solucao.title}</CardTitle>
                <CardDescription>{solucao.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Metodologia EP Partners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Nossa metodologia é baseada em 8 pilares fundamentais que garantem uma cultura
              organizacional sólida e sustentável:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Missão - Propósito e razão de existir</li>
              <li>Visão - Onde queremos chegar</li>
              <li>Valores - Princípios que nos guiam</li>
              <li>Indicadores Estratégicos - Como medimos sucesso</li>
              <li>Projetos Estratégicos - Iniciativas prioritárias</li>
              <li>Energia - Como mantemos o time motivado</li>
              <li>Desenvolvimento - Como crescemos juntos</li>
              <li>Tomada de decisão - Como decidimos</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default NossasSolucoes;
