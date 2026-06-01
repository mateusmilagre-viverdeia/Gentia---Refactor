import { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Download,
  Maximize2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  className?: string;
}

export function PDFViewer({ fileUrl, fileName, className }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.5);
  const [loading, setLoading] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setLoading(false);
  }

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 2.5));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || "codigo-de-cultura.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fileUrl, "_blank");
    }
  };

  const openFullscreen = () => {
    containerRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={containerRef} className={cn("flex flex-col gap-4 [&:fullscreen]:bg-black [&:fullscreen]:p-4", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/50 p-3 rounded-lg">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[100px] text-center">
            Página {pageNumber} de {numPages || "..."}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 2.5}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openFullscreen}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Tela cheia
          </Button>
          <Button variant="default" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex justify-center overflow-auto bg-muted/30 rounded-lg p-4 flex-1">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-lg"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Page Thumbnails */}
      {numPages > 1 && (
        <div className="flex gap-2 overflow-x-auto p-2 bg-muted/30 rounded-lg">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setPageNumber(page)}
              className={cn(
                "flex-shrink-0 w-12 h-16 rounded border-2 flex items-center justify-center text-xs font-medium transition-colors",
                pageNumber === page
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
              )}
            >
              {page}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
