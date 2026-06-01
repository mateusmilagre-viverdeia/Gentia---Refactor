import { useState } from "react";
import { 
  Dialog, 
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Camera } from "lucide-react";

interface PhotoGalleryProps {
  images: string[];
  primaryColor?: string;
  className?: string;
}

export function PhotoGallery({ 
  images, 
  primaryColor = "#000000",
  className = "" 
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  
  const goToPrevious = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
    }
  };
  
  const goToNext = () => {
    if (selectedIndex !== null) {
      setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
    }
  };

  // Determine grid layout based on number of images
  const getGridClass = () => {
    if (images.length === 1) return "grid-cols-1";
    if (images.length === 2) return "grid-cols-2";
    if (images.length === 3) return "grid-cols-3";
    if (images.length === 4) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Camera className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-2xl font-bold">Vida na Empresa</h2>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Confira um pouco do nosso dia a dia e cultura
          </p>
        </div>

        <div className={`grid ${getGridClass()} gap-4 max-w-5xl mx-auto`}>
          {images.slice(0, 8).map((image, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => openLightbox(index)}
            >
              <img
                src={image}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>

        {images.length > 8 && (
          <div className="text-center mt-4">
            <Button variant="outline" onClick={() => openLightbox(8)}>
              Ver mais {images.length - 8} fotos
            </Button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedIndex !== null} onOpenChange={closeLightbox}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-0">
          <div className="relative">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
              onClick={closeLightbox}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Image */}
            {selectedIndex !== null && (
              <div className="flex items-center justify-center min-h-[60vh] p-8">
                <img
                  src={images[selectedIndex]}
                  alt={`Foto ${selectedIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              </div>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {selectedIndex !== null && `${selectedIndex + 1} / ${images.length}`}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
