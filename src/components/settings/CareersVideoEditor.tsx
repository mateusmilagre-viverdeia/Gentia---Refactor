import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video, Upload, Trash2, Loader2, Link as LinkIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseVideoUrl } from "@/lib/parseVideoUrl";
import { CareersVideoSection } from "@/components/careers/CareersVideoSection";

type Position = "top" | "after_selling" | "after_jobs" | "footer";

interface Props {
  accountId: string;
  videoUrl: string | null;
  videoTitle: string | null;
  enabled: boolean;
  position: Position;
  onChange: (patch: {
    careers_video_url?: string | null;
    careers_video_title?: string | null;
    show_careers_video_section?: boolean;
    careers_video_position?: Position;
  }) => void;
}

const MAX_BYTES = 50 * 1024 * 1024;

export function CareersVideoEditor({ accountId, videoUrl, videoTitle, enabled, position, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"url" | "upload">(
    videoUrl && parseVideoUrl(videoUrl).type === "upload" ? "upload" : "url"
  );

  async function handleUpload(file: File) {
    if (!file) return;
    if (!/^video\/(mp4|webm|quicktime|ogg)$/i.test(file.type) && !/\.(mp4|webm|mov|ogg)$/i.test(file.name)) {
      toast.error("Formato inválido. Use MP4, WebM ou MOV.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. Máximo 50 MB.");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
      const path = `${accountId}/videos/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("careers-assets")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("careers-assets").getPublicUrl(path);
      onChange({ careers_video_url: urlData.publicUrl });
      toast.success("Vídeo enviado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro no upload: ${e.message || e}`);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange({ careers_video_url: null });
  }

  const parsed = parseVideoUrl(videoUrl);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Vídeo da Página de Carreiras
        </CardTitle>
        <CardDescription>
          Adicione um vídeo institucional à página pública de carreiras. Cole um link do YouTube/Vimeo ou faça upload de um arquivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "url" | "upload")}>
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="url" className="gap-2"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-2 pt-4">
            <Label htmlFor="careers_video_url">URL do vídeo (YouTube ou Vimeo)</Label>
            <Input
              id="careers_video_url"
              value={videoUrl && parsed.type !== "upload" ? videoUrl : ""}
              onChange={(e) => onChange({ careers_video_url: e.target.value || null })}
              placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
            />
            {videoUrl && parsed.type === "unknown" && (
              <p className="text-xs text-destructive">URL não reconhecida. Use YouTube ou Vimeo.</p>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-2 pt-4">
            <Label htmlFor="careers_video_file">Enviar arquivo (.mp4, .webm, .mov — até 50 MB)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="careers_video_file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/ogg"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {videoUrl && parsed.type === "upload" && (
              <p className="text-xs text-muted-foreground break-all">Arquivo atual: {videoUrl}</p>
            )}
          </TabsContent>
        </Tabs>

        {videoUrl && (
          <>
            <div className="space-y-2">
              <Label htmlFor="careers_video_title">Título acima do vídeo (opcional)</Label>
              <Input
                id="careers_video_title"
                value={videoTitle || ""}
                onChange={(e) => onChange({ careers_video_title: e.target.value || null })}
                placeholder="Ex.: Conheça nossa empresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Posição na página</Label>
              <Select value={position} onValueChange={(v) => onChange({ careers_video_position: v as Position })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">No topo (logo no início)</SelectItem>
                  <SelectItem value="after_selling">Depois das seções "Vendendo a Empresa"</SelectItem>
                  <SelectItem value="after_jobs">Depois das vagas</SelectItem>
                  <SelectItem value="footer">No final (antes do rodapé)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label>Exibir vídeo na página pública</Label>
                <p className="text-xs text-muted-foreground">Desligue para ocultar sem remover o vídeo.</p>
              </div>
              <Switch checked={enabled} onCheckedChange={(c) => onChange({ show_careers_video_section: c })} />
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={handleRemove} className="gap-2">
                <Trash2 className="h-4 w-4" /> Remover vídeo
              </Button>
            </div>

            {parsed.embedUrl && (
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <CareersVideoSection url={videoUrl} title={videoTitle} />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
