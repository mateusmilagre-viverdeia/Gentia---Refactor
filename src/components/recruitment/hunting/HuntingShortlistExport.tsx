import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ShortlistCandidate {
  id: string;
  name: string;
  title?: string;
  company?: string;
  score?: number;
  skills?: string[];
  source?: string;
  notes?: string;
  tags?: string[];
}

interface HuntingShortlistExportProps {
  candidates: ShortlistCandidate[];
  jobTitle: string;
  companyName?: string;
}

export function HuntingShortlistExport({ candidates, jobTitle, companyName }: HuntingShortlistExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Shortlist de Candidatos', pageWidth / 2, y, { align: 'center' });
      y += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Vaga: ${jobTitle}`, pageWidth / 2, y, { align: 'center' });
      y += 7;

      if (companyName) {
        doc.text(`Empresa: ${companyName}`, pageWidth / 2, y, { align: 'center' });
        y += 7;
      }

      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} | ${candidates.length} candidatos`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0);
      y += 12;

      // Separator
      doc.setDrawColor(200);
      doc.line(15, y, pageWidth - 15, y);
      y += 8;

      // Candidates
      candidates.forEach((c, idx) => {
        // Check page overflow
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        // Candidate number + name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${c.name}`, 15, y);

        // Score badge
        if (c.score != null) {
          const scoreText = `${c.score}%`;
          doc.setFontSize(9);
          const scoreX = pageWidth - 25;
          doc.setFillColor(c.score >= 70 ? 34 : c.score >= 50 ? 200 : 220, c.score >= 70 ? 139 : c.score >= 50 ? 150 : 50, c.score >= 70 ? 34 : 0);
          doc.roundedRect(scoreX - 5, y - 4, 18, 6, 1, 1, 'F');
          doc.setTextColor(255);
          doc.text(scoreText, scoreX + 4, y, { align: 'center' });
          doc.setTextColor(0);
        }
        y += 6;

        // Title + Company
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        if (c.title || c.company) {
          const info = [c.title, c.company].filter(Boolean).join(' @ ');
          doc.setTextColor(80);
          doc.text(info, 20, y);
          doc.setTextColor(0);
          y += 5;
        }

        // Skills
        if (c.skills?.length) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          const skillsText = `Skills: ${c.skills.slice(0, 8).join(', ')}`;
          doc.text(skillsText, 20, y);
          doc.setTextColor(0);
          y += 5;
        }

        // Tags
        if (c.tags?.length) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Tags: ${c.tags.join(', ')}`, 20, y);
          doc.setTextColor(0);
          y += 5;
        }

        // Notes
        if (c.notes) {
          doc.setFontSize(9);
          doc.setTextColor(80);
          const noteLines = doc.splitTextToSize(`Notas: ${c.notes}`, pageWidth - 40);
          doc.text(noteLines, 20, y);
          y += noteLines.length * 4;
          doc.setTextColor(0);
        }

        y += 6;

        // Light separator
        if (idx < candidates.length - 1) {
          doc.setDrawColor(230);
          doc.line(20, y - 3, pageWidth - 20, y - 3);
        }
      });

      doc.save(`shortlist-${jobTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['#', 'Nome', 'Cargo', 'Empresa', 'Score', 'Skills', 'Tags', 'Notas', 'Fonte'];
      const rows = candidates.map((c, i) => [
        i + 1,
        c.name,
        c.title || '',
        c.company || '',
        c.score != null ? `${c.score}%` : '',
        (c.skills || []).join('; '),
        (c.tags || []).join('; '),
        c.notes || '',
        c.source || '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shortlist-${jobTitle.toLowerCase().replace(/\s+/g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('CSV exportado com sucesso!');
    } catch (err) {
      toast.error('Erro ao exportar CSV');
    } finally {
      setIsExporting(false);
    }
  };

  if (candidates.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar Shortlist
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF Profissional
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CSV / Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
