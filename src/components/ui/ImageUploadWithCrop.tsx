import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadWithCropProps {
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: number;
  bucket: string;
  folder: string;
  label: string;
  description?: string;
  className?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  fileName: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Fill with white background before drawing to prevent transparent areas
  // from becoming black when converting to JPEG
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}

export function ImageUploadWithCrop({
  value,
  onChange,
  aspectRatio = 1,
  bucket,
  folder,
  label,
  description,
  className,
}: ImageUploadWithCropProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isUploading, setIsUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImgSrc(reader.result?.toString() || "");
        setIsOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    },
    [aspectRatio]
  );

  const handleUpload = async () => {
    if (!imgRef.current || !completedCrop) {
      toast.error("Por favor, selecione uma área da imagem");
      return;
    }

    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(
        imgRef.current,
        completedCrop,
        "cropped.jpg"
      );

      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, croppedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onChange(publicUrl);
      setIsOpen(false);
      setImgSrc("");
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        // Extract file path from URL
        const urlParts = value.split(`${bucket}/`);
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from(bucket).remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing file:", error);
      }
    }
    onChange(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border bg-muted">
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Trocar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-sm font-medium">Clique para fazer upload</span>
            <span className="text-xs">ou arraste e solte</span>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajustar Imagem</DialogTitle>
            <DialogDescription>
              Arraste para posicionar e redimensionar a área visível da imagem
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            {imgSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                className="max-h-[400px]"
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Crop"
                  onLoad={onImageLoad}
                  className="max-h-[400px]"
                />
              </ReactCrop>
            )}

            {completedCrop && imgRef.current && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Proporção: {aspectRatio === 1 ? "1:1 (quadrado)" : aspectRatio === 16/9 ? "16:9 (paisagem)" : `${aspectRatio}:1`}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={isUploading || !completedCrop}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Aplicar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
