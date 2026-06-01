import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, X } from 'lucide-react';
import { EVENT_PILLARS, EventFormat, EventItem } from '@/types/event.types';
import logoGentia from '@/assets/logo-gentia.png';

interface EventPDFPreviewProps {
  open: boolean;
  onClose: () => void;
  eventFormat: EventFormat | null;
  getItemsForPillar: (pillarNumber: number) => EventItem[];
}

type LayoutOption = 1 | 2 | 3;

const formatLabels: Record<EventFormat, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido'
};

export function EventPDFPreview({ open, onClose, eventFormat, getItemsForPillar }: EventPDFPreviewProps) {
  const [layout, setLayout] = useState<LayoutOption>(2);

  const layoutOptions: { value: LayoutOption; label: string }[] = [
    { value: 1, label: '1 por página' },
    { value: 2, label: '2 por página' },
    { value: 3, label: '3 por página' },
  ];

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
  };

  // Group pillars into pages
  const pages: typeof EVENT_PILLARS[] = [];
  for (let i = 0; i < EVENT_PILLARS.length; i += layout) {
    pages.push(EVENT_PILLARS.slice(i, i + layout));
  }

  const totalItems = EVENT_PILLARS.reduce((acc, p) => acc + getItemsForPillar(p.number).length, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>Preview de Exportação PDF</DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Layout Options */}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Layout:</span>
              {layoutOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={layout === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLayout(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </DialogHeader>

          {/* Preview Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-8">
              {pages.map((pagePillars, pageIndex) => (
                <div 
                  key={pageIndex}
                  className="border rounded-lg p-4 bg-muted/20"
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    Página {pageIndex + 1}
                  </div>
                  <div className={`grid ${gridClasses[layout]} gap-4`}>
                    {pagePillars.map((pillar) => {
                      const items = getItemsForPillar(pillar.number);
                      return (
                        <div 
                          key={pillar.number}
                          className="bg-card border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{pillar.icon}</span>
                            <div>
                              <h3 className="font-bold text-sm uppercase tracking-wide">
                                {pillar.number}. {pillar.title}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {pillar.description}
                              </p>
                            </div>
                          </div>
                          {items.length > 0 ? (
                            <ul className="space-y-1 text-sm">
                              {items.map((item) => (
                                <li key={item.id} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  <span>{item.item_text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Nenhum item planejado
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t flex-shrink-0 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {EVENT_PILLARS.length} pilares • {totalItems} itens • {pages.length} páginas
            </p>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only content */}
      <div className="hidden print:block pdf-print-area">
        {/* Header */}
        <div className="text-center mb-8 print:mb-4">
          <img src={logoGentia} alt="Gent.IA" className="h-24 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold uppercase tracking-wide">Evento de Cultura</h1>
          <p className="text-muted-foreground">
            Formato: {eventFormat ? formatLabels[eventFormat] : 'Não definido'} • {totalItems} itens planejados
          </p>
        </div>

        {pages.map((pagePillars, pageIndex) => (
          <div 
            key={pageIndex}
            className={`pdf-page ${pageIndex < pages.length - 1 ? 'pdf-page-break' : ''}`}
          >
            <div className={`grid ${gridClasses[layout]} gap-4 p-4`}>
              {pagePillars.map((pillar) => {
                const items = getItemsForPillar(pillar.number);
                return (
                  <div 
                    key={pillar.number}
                    className="border rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center gap-2 mb-3 border-b pb-2">
                      <span className="text-xl">{pillar.icon}</span>
                      <h3 className="font-bold uppercase tracking-wide text-sm">
                        {pillar.number}. {pillar.title}
                      </h3>
                    </div>
                    {items.length > 0 ? (
                      <ul className="space-y-1 text-sm">
                        {items.map((item) => (
                          <li key={item.id}>• {item.item_text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nenhum item</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer watermark */}
        <div className="fixed bottom-4 left-0 right-0 text-center text-xs text-gray-400 print:block hidden">
          Desenvolvido com Gent.IA • gentia.lovable.app
        </div>
      </div>
    </>
  );
}
