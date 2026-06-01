import { AppLayout } from "@/components/layout/AppLayout";
import { RequireCompany } from "@/components/layout/RequireCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  FileText, 
  Calendar, 
  Trash2, 
  CheckCircle2,
  Upload,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCultureCodeFile } from "@/hooks/useCultureCodeFile";
import { PDFUploader } from "@/components/cultura/PDFUploader";
import { PDFViewer } from "@/components/cultura/PDFViewer";
import { ShareCultureCodeDialog } from "@/components/cultura/ShareCultureCodeDialog";

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

export default function BibliotecaCultura() {
  const navigate = useNavigate();
  const {
    activeFile,
    fileHistory,
    isLoading,
    uploading,
    getFileUrl,
    uploadFile,
    setActiveFile,
    deleteFile,
  } = useCultureCodeFile();

  const handleUpload = (file: File) => {
    uploadFile(file);
  };

  return (
    <AppLayout
      title="Biblioteca de Cultura"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Cultura", href: "/cultura" },
        { label: "Biblioteca" },
      ]}
    >
      <RequireCompany>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl font-semibold">Biblioteca de Cultura</h1>
              </div>
              <p className="text-muted-foreground">
                Visualize e gerencie o PDF do código de cultura da sua empresa
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full" />
            </div>
          ) : activeFile ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* PDF Viewer - Main Area */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {activeFile.file_name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatFileSize(activeFile.file_size)} • Enviado{" "}
                          {activeFile.uploaded_at &&
                            formatBRTRelative(new Date(activeFile.uploaded_at))}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => navigate('/cultura/criacao?autoImport=library')}
                        >
                          <ArrowRight className="h-4 w-4" />
                          Importar para Pilares
                        </Button>
                        <ShareCultureCodeDialog
                          fileId={activeFile.id}
                          fileName={activeFile.file_name}
                        />
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PDFViewer
                      fileUrl={getFileUrl(activeFile.file_path)}
                      fileName={activeFile.file_name}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar - Upload & History */}
              <div className="space-y-6">
                {/* Upload New */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Trocar PDF
                    </CardTitle>
                    <CardDescription>
                      Envie uma nova versão do código de cultura
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PDFUploader onUpload={handleUpload} uploading={uploading} />
                  </CardContent>
                </Card>

                {/* File History */}
                {fileHistory && fileHistory.length > 1 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Histórico
                      </CardTitle>
                      <CardDescription>
                        Versões anteriores do código de cultura
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {fileHistory
                          .filter((f) => f.id !== activeFile.id)
                          .slice(0, 5)
                          .map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {file.file_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {file.uploaded_at &&
                                    formatBRTRelative(new Date(file.uploaded_at))}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActiveFile(file.id)}
                                >
                                  Ativar
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Excluir PDF?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. O
                                        arquivo será removido permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteFile(file)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            /* Empty State - No PDF yet */
            <Card className="py-12">
              <CardContent>
                <div className="max-w-md mx-auto text-center space-y-6">
                  <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                    <BookOpen className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold mb-2">
                      Nenhum código de cultura cadastrado
                    </h2>
                    <p className="text-muted-foreground">
                      Faça upload do PDF do código de cultura da sua empresa
                      para visualizá-lo aqui.
                    </p>
                  </div>
                  <PDFUploader
                    onUpload={handleUpload}
                    uploading={uploading}
                    className="max-w-sm mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </RequireCompany>
    </AppLayout>
  );
}
