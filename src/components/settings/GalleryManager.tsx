import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Image as ImageIcon, GripVertical, Upload } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface GalleryManagerProps {
  accountId: string;
  images: string[];
  onChange: (images: string[]) => void;
}

export function GalleryManager({ accountId, images, onChange }: GalleryManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máx 5MB)`);
          continue;
        }

        const sanitized = file.name
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '-')
          .replace(/-+/g, '-');
        const fileName = `${accountId}/gallery/${Date.now()}-${sanitized}`;
        
        const { data, error } = await supabase.storage
          .from('careers-assets')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Erro ao enviar ${file.name}: ${error.message}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('careers-assets')
          .getPublicUrl(data.path);

        newImages.push(urlData.publicUrl);
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast.success(`${newImages.length} imagem(s) adicionada(s)`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Erro ao enviar imagens');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
    toast.success('Imagem removida');
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {images.length} imagem(s) na galeria
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="gallery-upload"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? "Enviando..." : "Adicionar Imagens"}
          </Button>
        </div>
      </div>

      {/* Gallery Grid */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <Card key={`${imageUrl}-${index}`} className="overflow-hidden group relative">
              <CardContent className="p-0">
                <div className="aspect-video relative">
                  <img
                    src={imageUrl}
                    alt={`Galeria ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* Move buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveImage(index, index - 1)}
                        disabled={index === 0}
                      >
                        ←
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleMoveImage(index, index + 1)}
                        disabled={index === images.length - 1}
                      >
                        →
                      </Button>
                    </div>

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Imagem</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover esta imagem da galeria?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveImage(index)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {/* Image number indicator */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-3" />
            <h3 className="font-medium">Nenhuma imagem na galeria</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Adicione fotos da empresa, escritório, eventos e equipe para mostrar na página de carreiras.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Imagem
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help text */}
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          💡 Passe o mouse sobre as imagens para mover ou remover. Formatos aceitos: JPG, PNG, WebP (máx 5MB cada).
        </p>
      )}
    </div>
  );
}
