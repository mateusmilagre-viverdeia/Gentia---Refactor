import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, FileText, AlertCircle, Building2, Loader2 } from "lucide-react";
import { PDFViewer } from "@/components/cultura/PDFViewer";
import { usePublicCultureCodeShare } from "@/hooks/useCultureCodeShare";
import { formatBRTRelative } from "@/lib/datetime";


function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function PublicCultureCodeViewer() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = usePublicCultureCodeShare(token || "");

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando código de cultura...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Link inválido ou expirado</h2>
            <p className="text-muted-foreground">
              Este link de compartilhamento não existe, expirou ou foi desativado.
              Solicite um novo link ao responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { file, fileUrl, companyName, share } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">Código de Cultura</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {companyName}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Link expira{" "}
            {formatBRTRelative(new Date(share.expires_at))}
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {file.file_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {formatFileSize(file.file_size)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <PDFViewer fileUrl={fileUrl} fileName={file.file_name} />
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Visualização compartilhada • Powered by Gentia
        </div>
      </footer>
    </div>
  );
}
