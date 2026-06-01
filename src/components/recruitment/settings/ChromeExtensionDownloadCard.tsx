import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Chrome, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';

export function ChromeExtensionDownloadCard() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch('/gentia-extension.zip');
      if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gentia-extension.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success('Download iniciado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao baixar extensão');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Chrome className="h-4 w-4" />
          Extensão Chrome — Captura LinkedIn
        </CardTitle>
        <CardDescription>
          Capture perfis do LinkedIn diretamente para o GENTIA com um clique. Compatível com Chrome, Edge, Brave, Arc e Opera.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Baixar extensão (.zip)
          </Button>
          <Button variant="outline" asChild>
            <Link to="/atracao-contratacao/recrutamento/canais-externos?tab=extension">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver capturas
            </Link>
          </Button>
        </div>

        <div className="rounded-md border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-medium">Como instalar</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Descompacte o arquivo <code className="bg-background px-1 py-0.5 rounded">gentia-extension.zip</code>.</li>
            <li>Abra <code className="bg-background px-1 py-0.5 rounded">chrome://extensions</code> no seu navegador.</li>
            <li>Ative o <strong>Modo desenvolvedor</strong> no canto superior direito.</li>
            <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta descompactada.</li>
            <li>Clique no ícone do GENTIA na barra do navegador e faça login com seu <strong>e-mail e senha do GENTIA</strong> (os mesmos do app).</li>
            <li>Visite qualquer perfil em <code className="bg-background px-1 py-0.5 rounded">linkedin.com/in/...</code> e clique no ícone para capturar.</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
