import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PDFUploaderProps {
  onUpload: (file: File) => void;
  uploading: boolean;
  className?: string;
}

export function PDFUploader({ onUpload, uploading, className }: PDFUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === "application/pdf") {
      onUpload(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        !isDragActive && !isDragReject && "border-muted-foreground/25 hover:border-primary/50",
        uploading && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        {uploading ? (
          <>
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <div>
              <p className="text-lg font-medium">Enviando PDF...</p>
              <p className="text-sm text-muted-foreground">
                Por favor, aguarde
              </p>
            </div>
          </>
        ) : isDragActive ? (
          <>
            <FileText className="h-12 w-12 text-primary" />
            <p className="text-lg font-medium">Solte o arquivo aqui</p>
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">
                Arraste e solte seu PDF aqui
              </p>
              <p className="text-sm text-muted-foreground">
                ou clique para selecionar um arquivo
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Apenas arquivos PDF são aceitos
            </p>
          </>
        )}
      </div>
    </div>
  );
}
