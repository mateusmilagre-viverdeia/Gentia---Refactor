import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Testimonial } from "@/hooks/useTestimonials";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Quote, MessageSquare } from "lucide-react";

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  primaryColor?: string;
  className?: string;
}

export function TestimonialsCarousel({ 
  testimonials, 
  primaryColor = "#000000",
  className = "" 
}: TestimonialsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: "start",
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (testimonials.length === 0) return null;

  return (
    <section className={`py-12 bg-muted/30 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <MessageSquare className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold">O Que Dizem Sobre Nós</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Depoimentos de pessoas que fazem parte do nosso time
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 rounded-full bg-background shadow-lg hidden md:flex"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 rounded-full bg-background shadow-lg hidden md:flex"
            onClick={scrollNext}
            disabled={!canScrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Carousel */}
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex gap-6">
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.id} 
                  className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0"
                >
                  <Card className="h-full">
                    <CardContent className="p-6">
                      <Quote 
                        className="h-8 w-8 mb-4 opacity-20" 
                        style={{ color: primaryColor }}
                      />
                      <p className="text-sm leading-relaxed mb-6 text-muted-foreground">
                        "{testimonial.testimonial_text}"
                      </p>
                      <div className="flex items-center gap-3 pt-4 border-t">
                        <Avatar className="h-10 w-10">
                          {testimonial.employee_photo_url ? (
                            <AvatarImage 
                              src={testimonial.employee_photo_url} 
                              alt={testimonial.employee_name} 
                            />
                          ) : null}
                          <AvatarFallback style={{ backgroundColor: primaryColor, color: 'white' }}>
                            {testimonial.employee_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{testimonial.employee_name}</p>
                          {testimonial.employee_role && (
                            <p className="text-xs text-muted-foreground">{testimonial.employee_role}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Navigation Dots */}
          <div className="flex justify-center gap-2 mt-6 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollNext}
              disabled={!canScrollNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
