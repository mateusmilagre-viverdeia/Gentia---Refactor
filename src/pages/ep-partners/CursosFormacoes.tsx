import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CursosFormacoes = () => {
  const cursos = [
    {
      title: "Formação em Cultura Organizacional",
      duration: "40 horas",
      level: "Avançado",
      description: "Curso completo sobre construção e gestão de cultura organizacional.",
    },
    {
      title: "Liderança e Cultura",
      duration: "24 horas",
      level: "Intermediário",
      description: "Desenvolvimento de lideranças para gestão cultural.",
    },
    {
      title: "Workshop ROIP",
      duration: "8 horas",
      level: "Básico",
      description: "Introdução ao conceito de Return on Investment in People.",
    },
  ];

  return (
    <AppLayout title="Cursos / Formações" breadcrumb={[{ label: "Home", href: "/" }, { label: "EP Partners", href: "/ep-partners/sobre-nos" }, { label: "Cursos / Formações" }]}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Programas de Formação</h2>
          <p className="text-muted-foreground">
            Desenvolva competências em cultura organizacional através dos nossos programas de formação
          </p>
        </div>

        <div className="space-y-4">
          {cursos.map((curso) => (
            <Card key={curso.title}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{curso.title}</CardTitle>
                    <CardDescription className="mt-2">{curso.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{curso.level}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Duração: {curso.duration}
                  </p>
                  <Button variant="outline">Saiba Mais</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CursosFormacoes;
