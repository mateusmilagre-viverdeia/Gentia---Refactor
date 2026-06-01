import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CultureCodeSlide } from '@/types/culture-code.types';

interface SlidePreviewProps {
  slide: CultureCodeSlide;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function SlidePreview({ slide, totalSlides, onPrevious, onNext }: SlidePreviewProps) {
  const hasPrevious = slide.slideNumber > 1;
  const hasNext = slide.slideNumber < totalSlides;

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">PREVIEW</h3>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onPrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {slide.slideNumber} / {totalSlides}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={onNext}
            disabled={!hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 flex items-center justify-center bg-muted/20">
        <div className="w-full max-w-2xl aspect-[16/9] bg-zinc-900 rounded-lg shadow-xl flex flex-col items-center justify-center p-8 text-white">
          {slide.type === 'value' && slide.valueData ? (
            <div className="w-full h-full flex flex-col">
              <h2 className="text-3xl font-bold text-center mb-2 tracking-wide">
                {slide.title}
              </h2>
              
              {slide.valueData.mantra && (
                <p className="text-xl text-center text-zinc-300 italic mb-6">
                  "{slide.valueData.mantra}"
                </p>
              )}

              <div className="flex-1 grid grid-cols-2 gap-6 text-sm">
                {slide.valueData.dos && slide.valueData.dos.length > 0 && (
                  <div>
                    <h3 className="text-green-400 font-semibold mb-2 text-xs uppercase tracking-wider">
                      Como Vivemos
                    </h3>
                    <ul className="space-y-1">
                      {slide.valueData.dos.map((item, i) => (
                        <li key={i} className="text-zinc-300 flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {slide.valueData.donts && slide.valueData.donts.length > 0 && (
                  <div>
                    <h3 className="text-red-400 font-semibold mb-2 text-xs uppercase tracking-wider">
                      Como NÃO Vivemos
                    </h3>
                    <ul className="space-y-1">
                      {slide.valueData.donts.map((item, i) => (
                        <li key={i} className="text-zinc-300 flex items-start gap-2">
                          <span className="text-red-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-bold mb-6 tracking-wide leading-tight">
                {slide.title}
              </h2>
              
              <div className="space-y-3">
                {slide.body.map((line, i) => (
                  <p key={i} className="text-xl text-zinc-300 leading-relaxed">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
