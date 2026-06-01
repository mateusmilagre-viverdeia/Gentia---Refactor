import { useRef } from 'react';
import { X, FileDown, Target, BarChart3, ClipboardList, CheckCircle, Star, Brain, Rocket, Gift, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { JobDescription, CustomField } from '@/types/job-description.types';
import { STATUS_CONFIG } from '@/types/job-description.types';

interface JobDescriptionPDFPreviewProps {
  open: boolean;
  onClose: () => void;
  jobDescription: JobDescription;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  items?: string[];
  content?: string;
}

function Section({ icon, title, items, content }: SectionProps) {
  if (!items?.length && !content) return null;
  
  return (
    <div className="mb-6 print:mb-4">
      <div className="flex items-center gap-2 mb-2 text-primary print:text-black">
        {icon}
        <h3 className="font-semibold text-base print:text-sm">{title}</h3>
      </div>
      <div className="border-b border-border mb-3 print:mb-2" />
      {content && (
        <p className="text-sm text-muted-foreground print:text-black leading-relaxed">
          {content}
        </p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-1.5 print:space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground print:text-black flex items-start gap-2">
              <span className="text-primary print:text-black">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomFieldSection({ field }: { field: CustomField }) {
  const items = Array.isArray(field.value) ? field.value : undefined;
  const content = typeof field.value === 'string' ? field.value : undefined;
  
  if (!items?.length && !content) return null;
  
  return (
    <Section
      icon={<FileText className="h-4 w-4" />}
      title={field.name}
      items={items}
      content={content}
    />
  );
}

export function JobDescriptionPDFPreview({ open, onClose, jobDescription }: JobDescriptionPDFPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0 print:hidden">
          <div className="flex items-center justify-between">
            <DialogTitle>Visualizar Job Description</DialogTitle>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportPDF} className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar PDF
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] print:max-h-none print:overflow-visible">
          <div 
            ref={printRef} 
            className="p-6 print:p-8 bg-background print:bg-white"
          >
            {/* Header */}
            <div className="text-center mb-8 print:mb-6 border-b border-border pb-6 print:pb-4">
              <p className="text-xs text-muted-foreground print:text-gray-500 mb-2 uppercase tracking-wider">
                Job Description
              </p>
              <h1 className="text-2xl print:text-xl font-bold mb-3">
                {jobDescription.title}
              </h1>
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground print:text-gray-600">
                {jobDescription.area && (
                  <span>Área: {jobDescription.area}</span>
                )}
                <Badge className={`${STATUS_CONFIG[jobDescription.status].color} print:bg-gray-100 print:text-gray-800`}>
                  {STATUS_CONFIG[jobDescription.status].label}
                </Badge>
              </div>
            </div>

            {/* Mission */}
            <Section
              icon={<Target className="h-4 w-4" />}
              title="Missão do Cargo"
              content={jobDescription.mission || undefined}
            />

            {/* Indicators */}
            <Section
              icon={<BarChart3 className="h-4 w-4" />}
              title="Indicadores de Responsabilidade"
              items={jobDescription.indicators}
            />

            {/* Responsibilities */}
            <Section
              icon={<ClipboardList className="h-4 w-4" />}
              title="Principais Responsabilidades"
              items={jobDescription.responsibilities}
            />

            {/* Required Skills */}
            <Section
              icon={<CheckCircle className="h-4 w-4" />}
              title="Competências Técnicas Obrigatórias"
              items={jobDescription.required_skills}
            />

            {/* Desired Skills */}
            <Section
              icon={<Star className="h-4 w-4" />}
              title="Competências Técnicas Desejáveis"
              items={jobDescription.desired_skills}
            />

            {/* Behavioral Competencies */}
            <Section
              icon={<Brain className="h-4 w-4" />}
              title="Competências Comportamentais"
              items={jobDescription.behavioral_competencies}
            />

            {/* Development */}
            <Section
              icon={<Rocket className="h-4 w-4" />}
              title="O Que Você Vai Desenvolver"
              items={jobDescription.development}
            />

            {/* Benefits */}
            <Section
              icon={<Gift className="h-4 w-4" />}
              title="Benefícios"
              items={jobDescription.benefits}
            />

            {/* Custom Fields */}
            {jobDescription.custom_fields && jobDescription.custom_fields.length > 0 && (
              <div className="mt-6 print:mt-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-4 print:mb-2">
                  Campos Personalizados
                </h3>
                {jobDescription.custom_fields.map((field) => (
                  <CustomFieldSection key={field.id} field={field} />
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground print:text-gray-400">
              <p>Desenvolvido com Gent.IA</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:bg-white,
          .print\\:bg-white * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </Dialog>
  );
}
