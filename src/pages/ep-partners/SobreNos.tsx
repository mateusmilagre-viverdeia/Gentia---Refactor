import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Target, Award } from "lucide-react";

const SobreNos = () => {
  return (
    <AppLayout title="Sobre Nós" breadcrumb={[{ label: "Home", href: "/" }, { label: "EP Partners" }, { label: "Sobre Nós" }]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quem Somos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              A EP Partners é especializada em cultura organizacional e desenvolvimento de pessoas.
              Nossa missão é ajudar empresas a construírem culturas fortes e sustentáveis que
              impulsionem resultados extraordinários.
            </p>
            <p className="text-muted-foreground">
              Com anos de experiência no mercado, desenvolvemos uma metodologia própria baseada
              em 8 pilares fundamentais para a construção de uma cultura organizacional de alto desempenho.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Users className="h-10 w-10 mb-2" />
              <CardTitle>Nossa Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Profissionais especializados em cultura organizacional, psicologia e gestão de pessoas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Target className="h-10 w-10 mb-2" />
              <CardTitle>Nossa Missão</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Transformar organizações através de culturas fortes e alinhadas aos seus propósitos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Award className="h-10 w-10 mb-2" />
              <CardTitle>Nossos Valores</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Excelência, inovação, ética e compromisso com os resultados de nossos clientes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default SobreNos;
