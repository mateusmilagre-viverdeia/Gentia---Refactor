import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Edit, Download, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import type { SellingCompanyVersion } from "@/types/selling-company.types";
import { parseContentBlocks } from "@/lib/parseContentBlocks";
import { ContentBlockCard } from "./ContentBlockCard";

interface SellingSummaryProps {
  approvedVersion: SellingCompanyVersion;
  companyName: string;
  onBack: () => void;
  onEdit: () => void;
}

export function SellingSummary({
  approvedVersion,
  companyName,
  onBack,
  onEdit,
}: SellingSummaryProps) {
  const [copied, setCopied] = useState(false);
  const blocks = parseContentBlocks(approvedVersion.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(approvedVersion.content);
      setCopied(true);
      toast.success('Texto copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const handleExportPDF = () => {
    // Simple print-to-PDF approach
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup bloqueado. Permita popups para exportar.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vendendo a Empresa - ${companyName}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3 { color: #111; margin-top: 1.5em; }
            h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { font-size: 22px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
            p { margin: 12px 0; }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              padding-bottom: 20px;
              border-bottom: 1px solid #ddd;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Vendendo a Empresa</h1>
            <p>${companyName}</p>
          </div>
          ${approvedVersion.content
            .replace(/^# /gm, '<h1>')
            .replace(/^## /gm, '<h2>')
            .replace(/^### /gm, '<h3>')
            .replace(/\n- /g, '\n<li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          }
          <div class="footer">
            Gerado em ${new Date().toLocaleDateString('pt-BR')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*Vendendo a Empresa - ${companyName}*\n\n${approvedVersion.content.substring(0, 1000)}...\n\n[Texto completo disponível na plataforma]`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Versão Aprovada</h2>
          <p className="text-muted-foreground text-sm">
            Aprovada em {new Date(approvedVersion.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-4 pr-4">
          {blocks.map((block) => (
            <ContentBlockCard
              key={block.id}
              block={block}
              onRefine={() => {}}
              disabled={true}
              showRefineButton={false}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Revisar texto
          </Button>

          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>

          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>

          <Button variant="outline" onClick={handleShareWhatsApp}>
            <Share2 className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
