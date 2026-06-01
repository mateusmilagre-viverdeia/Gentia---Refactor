import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Eye,
  Heart,
  BarChart3,
  FolderKanban,
  Zap,
  TrendingUp,
  Scale,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface ExtractedCultureCode {
  missao: {
    statement: string;
  };
  visao: {
    statement: string;
    horizon?: string;
  };
  valores: {
    values: Array<{
      label: string;
      mantra?: string;
      dos: string[];
      donts: string[];
    }>;
  };
  indicadores: {
    financeira: string[];
    clientes: string[];
    processos: string[];
    aprendizado: string[];
  };
  projetos: Array<{
    name: string;
    perspective: string;
    importance?: string;
  }>;
  energia: {
    items: string[];
  };
  desenvolvimento: {
    items: string[];
  };
  decisao: {
    guidelines: string[];
    summary?: string;
  };
}

interface CultureImportPreviewProps {
  data: ExtractedCultureCode;
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CultureImportPreview({
  data,
  accountName,
  onConfirm,
  onCancel,
}: CultureImportPreviewProps) {
  const pillars = [
    {
      id: "missao",
      title: "Missão",
      icon: Target,
      hasData: !!data.missao?.statement,
      content: data.missao?.statement,
    },
    {
      id: "visao",
      title: "Visão",
      icon: Eye,
      hasData: !!data.visao?.statement,
      content: data.visao?.statement,
      extra: data.visao?.horizon ? `Horizonte: ${data.visao.horizon}` : undefined,
    },
    {
      id: "valores",
      title: "Valores",
      icon: Heart,
      hasData: data.valores?.values?.length > 0,
      content: data.valores?.values?.map((v) => v.label).join(", "),
      count: data.valores?.values?.length || 0,
    },
    {
      id: "indicadores",
      title: "Indicadores",
      icon: BarChart3,
      hasData:
        (data.indicadores?.financeira?.length || 0) +
          (data.indicadores?.clientes?.length || 0) +
          (data.indicadores?.processos?.length || 0) +
          (data.indicadores?.aprendizado?.length || 0) >
        0,
      count:
        (data.indicadores?.financeira?.length || 0) +
        (data.indicadores?.clientes?.length || 0) +
        (data.indicadores?.processos?.length || 0) +
        (data.indicadores?.aprendizado?.length || 0),
    },
    {
      id: "projetos",
      title: "Projetos",
      icon: FolderKanban,
      hasData: data.projetos?.length > 0,
      content: data.projetos?.map((p) => p.name).join(", "),
      count: data.projetos?.length || 0,
    },
    {
      id: "energia",
      title: "Energia",
      icon: Zap,
      hasData: data.energia?.items?.length > 0,
      content: data.energia?.items?.slice(0, 3).join(", "),
      count: data.energia?.items?.length || 0,
    },
    {
      id: "desenvolvimento",
      title: "Desenvolvimento",
      icon: TrendingUp,
      hasData: data.desenvolvimento?.items?.length > 0,
      content: data.desenvolvimento?.items?.slice(0, 3).join(", "),
      count: data.desenvolvimento?.items?.length || 0,
    },
    {
      id: "decisao",
      title: "Decisão",
      icon: Scale,
      hasData: data.decisao?.guidelines?.length > 0,
      content: data.decisao?.guidelines?.slice(0, 2).join("; "),
      count: data.decisao?.guidelines?.length || 0,
    },
  ];

  const pillarsWithData = pillars.filter((p) => p.hasData).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Importando para: <strong>{accountName}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            {pillarsWithData} de 8 pilares encontrados no documento
          </p>
        </div>
        <Badge variant={pillarsWithData >= 6 ? "default" : "secondary"}>
          {Math.round((pillarsWithData / 8) * 100)}% completo
        </Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="grid gap-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card
                key={pillar.id}
                className={`transition-colors ${
                  pillar.hasData
                    ? "border-green-200 bg-green-50/50"
                    : "border-muted bg-muted/20 opacity-60"
                }`}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        pillar.hasData ? "bg-green-100" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          pillar.hasData ? "text-green-600" : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {pillar.title}
                        {pillar.count !== undefined && pillar.count > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {pillar.count} {pillar.count === 1 ? "item" : "itens"}
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    {pillar.hasData ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {pillar.hasData && (pillar.content || pillar.extra) && (
                  <CardContent className="py-2 px-4 pt-0">
                    {pillar.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pillar.content}
                      </p>
                    )}
                    {pillar.extra && (
                      <p className="text-xs text-muted-foreground mt-1">{pillar.extra}</p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Values Detail */}
      {data.valores?.values?.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Valores Detalhados</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4 pt-0">
            <div className="grid gap-2">
              {data.valores.values.map((value, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">{value.label}</div>
                  {value.mantra && (
                    <div className="text-xs text-muted-foreground italic">
                      "{value.mantra}"
                    </div>
                  )}
                  <div className="flex gap-4 mt-1 text-xs">
                    {value.dos?.length > 0 && (
                      <span className="text-green-600">
                        ✓ {value.dos.length} comportamentos
                      </span>
                    )}
                    {value.donts?.length > 0 && (
                      <span className="text-red-600">
                        ✗ {value.donts.length} anti-comportamentos
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Voltar
        </Button>
        <Button onClick={onConfirm} className="flex-1">
          Confirmar Importação
        </Button>
      </div>
    </div>
  );
}
