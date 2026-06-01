import type { CultureCodeSlide } from '@/types/culture-code.types';

interface PDFSlideCardProps {
  slide: CultureCodeSlide;
  size?: 'small' | 'medium' | 'large';
}

export function PDFSlideCard({ slide, size = 'medium' }: PDFSlideCardProps) {
  const sizeClasses = {
    small: 'h-32 text-[8px]',
    medium: 'h-48 text-xs',
    large: 'h-72 text-sm',
  };

  const titleSizes = {
    small: 'text-xs',
    medium: 'text-base',
    large: 'text-xl',
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]}
        bg-foreground text-background 
        rounded-lg p-4 flex flex-col justify-center items-center text-center
        aspect-video
        pdf-slide
      `}
    >
      {/* Slide number */}
      <div className="absolute top-2 right-2 text-muted-foreground/50 text-[10px]">
        {slide.slideNumber}
      </div>

      {/* Title */}
      <h3 className={`${titleSizes[size]} font-bold mb-2 uppercase tracking-wide`}>
        {slide.title}
      </h3>

      {/* Content */}
      {slide.type === 'value' && slide.valueData ? (
        <div className="space-y-2 w-full">
          {slide.valueData.mantra && (
            <p className="italic opacity-90">"{slide.valueData.mantra}"</p>
          )}
          
          {size !== 'small' && (
            <div className="grid grid-cols-2 gap-2 text-left mt-2">
              {slide.valueData.dos && slide.valueData.dos.length > 0 && (
                <div>
                  <p className="font-semibold text-[10px] opacity-70 mb-1">Como Vivemos</p>
                  {slide.valueData.dos.slice(0, 3).map((item, i) => (
                    <p key={i} className="truncate opacity-80">• {item}</p>
                  ))}
                </div>
              )}
              {slide.valueData.donts && slide.valueData.donts.length > 0 && (
                <div>
                  <p className="font-semibold text-[10px] opacity-70 mb-1">Como NÃO Vivemos</p>
                  {slide.valueData.donts.slice(0, 3).map((item, i) => (
                    <p key={i} className="truncate opacity-80">• {item}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {slide.body.map((line, i) => (
            <p key={i} className="opacity-90">{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
