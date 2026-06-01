import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Download, Database, CheckCircle2, Loader2, Shield } from "lucide-react";
import { useBackupExport } from "@/hooks/useBackupExport";
import { toast } from "sonner";

interface BackupResult {
  exportDate: string;
  summary: {
    companies: number;
    profiles: number;
    totalRecords: number;
  };
  data: Record<string, unknown[]>;
}

export default function BackupExport() {
  const { isExporting, progress, currentTable, exportBackup, downloadBackup, tablesToExport } = useBackupExport();
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);

  const handleExport = async () => {
    toast.info("Iniciando exportação de backup...");
    
    const backup = await exportBackup();
    
    if (backup) {
      setLastBackup(backup);
      downloadBackup(backup);
      toast.success(`Backup exportado com sucesso! ${backup.summary.totalRecords} registros.`);
    } else {
      toast.error("Erro ao exportar backup. Verifique o console.");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Backup de Dados
        </h1>
        <p className="text-muted-foreground mt-2">
          Exporte todos os dados críticos do sistema para um arquivo JSON local.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Card Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Exportar Backup Completo
            </CardTitle>
            <CardDescription>
              Gera um arquivo JSON contendo todos os dados de empresas, projetos, sessões e configurações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExporting ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando: {currentTable}
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% concluído</p>
              </div>
            ) : (
              <Button onClick={handleExport} size="lg" className="w-full">
                <Download className="h-5 w-5 mr-2" />
                Exportar Backup Completo
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Resultado do Último Backup */}
        {lastBackup && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Backup Exportado com Sucesso
              </CardTitle>
              <CardDescription>
                {new Date(lastBackup.exportDate).toLocaleString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold">{lastBackup.summary.companies}</div>
                  <div className="text-xs text-muted-foreground">Empresas</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold">{lastBackup.summary.profiles}</div>
                  <div className="text-xs text-muted-foreground">Perfis</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg">
                  <div className="text-2xl font-bold">{lastBackup.summary.totalRecords}</div>
                  <div className="text-xs text-muted-foreground">Total Registros</div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Tabelas exportadas:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(lastBackup.data).map(([table, records]) => (
                    <Badge key={table} variant="secondary" className="text-xs">
                      {table}: {(records as unknown[]).length}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Tabelas */}
        <Card>
          <CardHeader>
            <CardTitle>Tabelas Incluídas no Backup</CardTitle>
            <CardDescription>
              {tablesToExport.length} tabelas serão exportadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {tablesToExport.map((table) => (
                <Badge key={table} variant="outline" className="text-xs">
                  {table}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
