import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, X } from 'lucide-react';
import { PDFSlideCard } from './PDFSlideCard';
import type { CultureCodeSlide } from '@/types/culture-code.types';

interface PDFPreviewProps {
  slides: CultureCodeSlide[];
  open: boolean;
  onClose: () => void;
}

type LayoutOption = 1 | 2 | 4 | 6;

export function PDFPreview({ slides, open, onClose }: PDFPreviewProps) {
  const [layout, setLayout] = useState<LayoutOption>(2);
  const printRef = useRef<HTMLDivElement>(null);

  const layoutOptions: { value: LayoutOption; label: string }[] = [
    { value: 1, label: '1 por página' },
    { value: 2, label: '2 por página' },
    { value: 4, label: '4 por página' },
    { value: 6, label: '6 por página' },
  ];

  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    4: 'grid-cols-2',
    6: 'grid-cols-2 md:grid-cols-3',
  };

  const slideSize = {
    1: 'large' as const,
    2: 'medium' as const,
    4: 'small' as const,
    6: 'small' as const,
  };

  // Group slides into pages
  const pages: CultureCodeSlide[][] = [];
  for (let i = 0; i < slides.length; i += layout) {
    pages.push(slides.slice(i, i + layout));
  }

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
              {pages.map((pageSlides, pageIndex) => (
                <div 
                  key={pageIndex}
                  className="border rounded-lg p-4 bg-muted/20"
                >
                  <div className="text-xs text-muted-foreground mb-2">
                    Página {pageIndex + 1}
                  </div>
                  <div className={`grid ${gridClasses[layout]} gap-4`}>
                    {pageSlides.map((slide) => (
                      <PDFSlideCard 
                        key={slide.id} 
                        slide={slide} 
                        size={slideSize[layout]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t flex-shrink-0 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {slides.length} slides • {pages.length} páginas
            </p>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print-only content */}
      <div ref={printRef} className="hidden print:block pdf-print-area">
        {pages.map((pageSlides, pageIndex) => (
          <div 
            key={pageIndex}
            className={`pdf-page ${pageIndex < pages.length - 1 ? 'pdf-page-break' : ''}`}
          >
            <div className={`grid ${gridClasses[layout]} gap-4 p-8`}>
              {pageSlides.map((slide) => (
                <div key={slide.id} className="pdf-slide-print">
                  <div className="bg-black text-white rounded-lg p-6 flex flex-col justify-center items-center text-center aspect-video">
                    <h3 className="text-lg font-bold mb-2 uppercase tracking-wide">
                      {slide.title}
                    </h3>
                    {slide.type === 'value' && slide.valueData ? (
                      <div className="space-y-2 w-full">
                        {slide.valueData.mantra && (
                          <p className="italic opacity-90">"{slide.valueData.mantra}"</p>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-left mt-2 text-sm">
                          {slide.valueData.dos && slide.valueData.dos.length > 0 && (
                            <div>
                              <p className="font-semibold text-xs opacity-70 mb-1">Como Vivemos</p>
                              {slide.valueData.dos.map((item, i) => (
                                <p key={i} className="opacity-80">• {item}</p>
                              ))}
                            </div>
                          )}
                          {slide.valueData.donts && slide.valueData.donts.length > 0 && (
                            <div>
                              <p className="font-semibold text-xs opacity-70 mb-1">Como NÃO Vivemos</p>
                              {slide.valueData.donts.map((item, i) => (
                                <p key={i} className="opacity-80">• {item}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {slide.body.map((line, i) => (
                          <p key={i} className="opacity-90">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
