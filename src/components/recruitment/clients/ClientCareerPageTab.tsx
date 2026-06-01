import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, Upload, Copy, ExternalLink, CheckCircle2, AlertCircle, Eye, Users, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useClientCareerPage,
  useEnsureClientCareerPage,
  useUpdateClientCareerPage,
  useUploadCareerAsset,
  useVerifyCareerDomain,
} from "@/hooks/useClientCareerPage";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface Props {
  client: { id: string; account_id: string; nome_fantasia: string | null; razao_social: string };
}

export function ClientCareerPageTab({ client }: Props) {
  const { data: page, isLoading } = useClientCareerPage(client.id);
  const ensure = useEnsureClientCareerPage();
  const update = useUpdateClientCareerPage();
  const upload = useUploadCareerAsset();
  const verifyDomain = useVerifyCareerDomain();

  const [form, setForm] = useState({
    slug: "",
    is_active: false,
    logo_url: "",
    cover_image_url: "",
    primary_color: "#0F172A",
    secondary_color: "#3B82F6",
    company_description: "",
    custom_domain: "",
    meta_title: "",
    meta_description: "",
  });

  useEffect(() => {
    if (page) {
      setForm({
        slug: page.slug,
        is_active: page.is_active,
        logo_url: page.logo_url || "",
        cover_image_url: page.cover_image_url || "",
        primary_color: page.primary_color || "#0F172A",
        secondary_color: page.secondary_color || "#3B82F6",
        company_description: page.company_description || "",
        custom_domain: page.custom_domain || "",
        meta_title: page.meta_title || "",
        meta_description: page.meta_description || "",
      });
    }
  }, [page?.id]);

  if (isLoading) {
    return <div className="py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  // Página não existe ainda
  if (!page) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" /> Página de Carreiras White-label
          </CardTitle>
          <CardDescription>
            Crie uma página de carreiras personalizada com a identidade visual do cliente.
            Vagas abertas serão exibidas automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => ensure.mutate({
              clientId: client.id,
              accountId: client.account_id,
              clientName: client.nome_fantasia || client.razao_social,
            })}
            disabled={ensure.isPending}
          >
            {ensure.isPending ? "Criando..." : "Criar Página de Carreiras"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const publicUrl = page.custom_domain && page.custom_domain_verified
    ? `https://${page.custom_domain}`
    : `${window.location.origin}/c/${page.slug}`;

  const handleUpload = async (file: File, kind: "logo" | "cover") => {
    const url = await upload.mutateAsync({ accountId: client.account_id, file, kind });
    setForm((f) => ({ ...f, [kind === "logo" ? "logo_url" : "cover_image_url"]: url }));
  };

  const handleSave = () => {
    update.mutate({ id: page.id, updates: form });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copiado!");
  };

  return (
    <div className="space-y-6">
      {/* Header com toggle + métricas */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${page.is_active ? "bg-green-100 dark:bg-green-900/30" : "bg-muted"}`}>
                <Globe className={`h-5 w-5 ${page.is_active ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">Página de Carreiras</p>
                <p className="text-xs text-muted-foreground">
                  {page.is_active ? "Publicada e acessível" : "Rascunho — não publicada"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1.5">
                <Eye className="h-3 w-3" /> {page.total_views} views
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3 w-3" /> {page.total_applications} candidaturas
              </Badge>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => {
                    setForm((f) => ({ ...f, is_active: v }));
                    update.mutate({ id: page.id, updates: { is_active: v } });
                  }}
                />
                <Label className="text-sm">Ativa</Label>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-md border bg-muted/40 p-2.5">
            <code className="flex-1 text-xs truncate">{publicUrl}</code>
            <Button size="sm" variant="ghost" onClick={copyLink}><Copy className="h-3.5 w-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(publicUrl, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Identidade Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AssetUpload
              label="Logo"
              value={form.logo_url}
              onUpload={(f) => handleUpload(f, "logo")}
              uploading={upload.isPending}
            />
            <AssetUpload
              label="Imagem de capa"
              value={form.cover_image_url}
              onUpload={(f) => handleUpload(f, "cover")}
              uploading={upload.isPending}
              wide
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Cor primária</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="h-10 w-16 p-1" />
                <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor secundária</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input type="color" value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} className="h-10 w-16 p-1" />
                <Input value={form.secondary_color} onChange={(e) => setForm({ ...form, secondary_color: e.target.value })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdo da Página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Descrição da empresa</Label>
            <RichTextEditor
              value={form.company_description}
              onChange={(html) => setForm({ ...form, company_description: html })}
              placeholder="Conte sobre a empresa, missão, cultura..."
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Slug (URL)</Label>
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
              placeholder="nome-do-cliente"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Letras minúsculas, números e hífens.</p>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Meta título</Label>
            <Input
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              placeholder={`Carreiras — ${client.nome_fantasia || client.razao_social}`}
              maxLength={60}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.meta_title.length}/60</p>
          </div>
          <div>
            <Label className="text-xs">Meta descrição</Label>
            <Textarea
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              rows={2}
              maxLength={160}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{form.meta_description.length}/160</p>
          </div>
        </CardContent>
      </Card>

      {/* Domínio personalizado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Domínio personalizado
            {page.custom_domain_verified && <Badge className="bg-green-600">Verificado</Badge>}
          </CardTitle>
          <CardDescription>
            Configure um CNAME apontando para <code className="text-xs bg-muted px-1.5 py-0.5 rounded">careers.gentia.tech</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={form.custom_domain}
              onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              placeholder="carreiras.empresa.com.br"
            />
            <Button
              variant="outline"
              onClick={() => verifyDomain.mutate({ pageId: page.id, customDomain: form.custom_domain })}
              disabled={!form.custom_domain || verifyDomain.isPending}
            >
              {verifyDomain.isPending ? "Verificando..." : "Verificar DNS"}
            </Button>
          </div>
          {page.custom_domain_cname && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {page.custom_domain_verified ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />
              )}
              CNAME atual: <code className="bg-muted px-1.5 rounded">{page.custom_domain_cname}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}

function AssetUpload({ label, value, onUpload, uploading, wide }: {
  label: string;
  value: string;
  onUpload: (f: File) => void;
  uploading: boolean;
  wide?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className={`mt-1 relative border-2 border-dashed rounded-lg overflow-hidden bg-muted/20 ${wide ? "aspect-[3/1]" : "aspect-square max-w-[160px]"}`}>
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={uploading}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
        <Upload className="h-3 w-3" /> Clique para alterar
      </p>
    </div>
  );
}
