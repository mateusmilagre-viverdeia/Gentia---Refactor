import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequireCompany } from "@/components/layout/RequireCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FolderOpen,
  FileText,
  Download,
  Eye,
  Trash2,
  Upload,
} from "lucide-react";
import { useCultureCodeTemplates } from "@/hooks/useCultureCodeTemplates";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { PDFUploader } from "@/components/cultura/PDFUploader";
import { PDFViewer } from "@/components/cultura/PDFViewer";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRTRelative } from "@/lib/datetime";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function ModelosCultura() {
  const {
    templates,
    isLoading,
    uploading,
    getFileUrl,
    uploadTemplate,
    deleteTemplate,
  } = useCultureCodeTemplates();
  const { isSuperAdmin } = useSuperAdmin();

  const [viewingTemplate, setViewingTemplate] = useState<typeof templates[0] | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelected = (file: File) => {
    setPendingFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleSubmitUpload = () => {
    if (!pendingFile || !uploadTitle.trim()) return;
    uploadTemplate(
      { file: pendingFile, title: uploadTitle.trim(), description: uploadDescription.trim() || undefined },
      {
        onSuccess: () => {
          setPendingFile(null);
          setUploadTitle("");
          setUploadDescription("");
        },
      }
    );
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const url = getFileUrl(filePath);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <AppLayout
      title="Modelos de Código de Cultura"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Cultura", href: "/cultura" },
        { label: "Modelos" },
      ]}
    >
      <RequireCompany>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-lg bg-primary/10">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-semibold">Modelos de Código de Cultura</h1>
            </div>
            <p className="text-muted-foreground">
              Explore modelos de códigos de cultura de referência para benchmarking e inspiração
            </p>
          </div>

          {/* Super Admin Upload Area */}
          {isSuperAdmin && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Adicionar Novo Modelo
                </CardTitle>
                <CardDescription>
                  Faça upload de um PDF de código de cultura como modelo de referência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-title">Título *</Label>
                    <Input
                      id="template-title"
                      placeholder="Ex: Código de Cultura Netflix"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Descrição (opcional)</Label>
                    <Textarea
                      id="template-description"
                      placeholder="Breve descrição do modelo..."
                      value={uploadDescription}
                      onChange={(e) => setUploadDescription(e.target.value)}
                      rows={1}
                    />
                  </div>
                </div>

                {!pendingFile ? (
                  <PDFUploader onUpload={handleFileSelected} uploading={uploading} />
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{pendingFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(pendingFile.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setPendingFile(null);
                          setUploadTitle("");
                          setUploadDescription("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSubmitUpload}
                        disabled={!uploadTitle.trim() || uploading}
                      >
                        {uploading ? "Enviando..." : "Enviar Modelo"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Templates Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="py-12">
              <CardContent>
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <FolderOpen className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      Nenhum modelo disponível
                    </h2>
                    <p className="text-muted-foreground">
                      Os modelos de código de cultura serão adicionados em breve.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <CardTitle className="text-base truncate">
                          {template.title}
                        </CardTitle>
                      </div>
                      {isSuperAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O arquivo "{template.title}" será removido permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTemplate(template)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    {template.description && (
                      <CardDescription className="line-clamp-2">
                        {template.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatFileSize(template.file_size)}</span>
                        {template.created_at && (
                          <span>
                            {formatBRTRelative(new Date(template.created_at))}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => setViewingTemplate(template)}
                        >
                          <Eye className="h-4 w-4" />
                          Visualizar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleDownload(template.file_path, template.file_name)}
                        >
                          <Download className="h-4 w-4" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* PDF Viewer Modal */}
        <Dialog
          open={!!viewingTemplate}
          onOpenChange={(open) => !open && setViewingTemplate(null)}
        >
          <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {viewingTemplate?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden p-6 pt-3">
              {viewingTemplate && (
                <PDFViewer
                  fileUrl={getFileUrl(viewingTemplate.file_path)}
                  fileName={viewingTemplate.file_name}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </RequireCompany>
    </AppLayout>
  );
}
