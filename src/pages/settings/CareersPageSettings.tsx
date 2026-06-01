import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useCareersPageSettings, CareersPageSettings as Settings } from "@/hooks/useCareersPage";
import { useApprovedSellingContent } from "@/hooks/useApprovedSellingContent";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  ExternalLink, 
  Loader2, 
  Save,
  Eye,
  Settings2,
  Search,
  Palette,
  Image as ImageIcon,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  MessageSquareQuote,
  Bell,
  Heart,
  Share2,
  FileText,
  Target,
  BookOpen,
  Star,
  Gift,
  TrendingUp,
  Linkedin,
  MessageCircle,
  Link2,
  Briefcase,
  Video,
  Palette as PaletteIcon
} from "lucide-react";
import { RecruitmentLayout } from "@/components/layout/RecruitmentLayout";
import { ImageUploadWithCrop } from "@/components/ui/ImageUploadWithCrop";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { CareersPagePreview } from "@/components/recruitment/CareersPagePreview";
import { JobPagePreview } from "@/components/recruitment/JobPagePreview";
import { TestimonialsManager } from "@/components/settings/TestimonialsManager";
import { GalleryManager } from "@/components/settings/GalleryManager";
import { SellingSectionsEditor } from "@/components/settings/SellingSectionsEditor";
import { CareersVideoEditor } from "@/components/settings/CareersVideoEditor";
import { getPublicOrgCareersUrl } from "@/lib/publicUrl";

interface FormData extends Omit<Settings, 'id' | 'account_id'> {
  use_selling_content: boolean;
  show_opening_section: boolean;
  show_about_section: boolean;
  show_moment_section: boolean;
  show_benefits_section: boolean;
  show_fit_section: boolean;
  show_challenges_section: boolean;
  show_offerings_section: boolean;
  show_cta_section: boolean;
  show_testimonials_section: boolean;
  show_values_section: boolean;
  show_gallery_section: boolean;
  show_social_links: boolean;
  talent_pool_enabled: boolean;
  job_alerts_enabled: boolean;
  gallery_images: string[];
  // Job details page settings
  job_show_company_section: boolean;
  job_show_mission: boolean;
  job_show_responsibilities: boolean;
  job_show_indicators: boolean;
  job_show_required_skills: boolean;
  job_show_desired_skills: boolean;
  job_show_competencies: boolean;
  job_show_benefits: boolean;
  job_show_development: boolean;
  job_show_related_jobs: boolean;
  job_show_share_buttons: boolean;
  job_show_gentia_branding: boolean;
  // New job page settings
  job_video_url: string | null;
  job_use_custom_color: boolean;
  job_primary_color: string;
  // Selling sections order
  selling_sections_order: string[];
  // Careers page video
  careers_video_url: string | null;
  careers_video_title: string | null;
  show_careers_video_section: boolean;
  careers_video_position: "top" | "after_selling" | "after_jobs" | "footer";
}

const defaultSettings: FormData = {
  headline: "Oportunidades de Carreira",
  description: "",
  logo_url: null,
  cover_image_url: null,
  primary_color: "#000000",
  show_company_name: true,
  show_department_filter: true,
  show_location_filter: true,
  custom_categories: ["Vendas", "Marketing", "Engenharia", "Design", "RH"],
  meta_title: null,
  meta_description: null,
  is_published: true,
  use_selling_content: true,
  show_opening_section: true,
  show_about_section: true,
  show_moment_section: true,
  show_benefits_section: true,
  show_fit_section: true,
  show_challenges_section: true,
  show_offerings_section: true,
  show_cta_section: true,
  show_testimonials_section: true,
  show_values_section: true,
  show_gallery_section: true,
  show_social_links: true,
  talent_pool_enabled: false,
  job_alerts_enabled: false,
  gallery_images: [],
  // Job details page defaults
  job_show_company_section: true,
  job_show_mission: true,
  job_show_responsibilities: true,
  job_show_indicators: true,
  job_show_required_skills: true,
  job_show_desired_skills: true,
  job_show_competencies: true,
  job_show_benefits: true,
  job_show_development: true,
  job_show_related_jobs: true,
  job_show_share_buttons: true,
  job_show_gentia_branding: true,
  // New job page defaults
  job_video_url: null,
  job_use_custom_color: false,
  job_primary_color: '#000000',
  // Selling sections order
  // Selling sections order
  selling_sections_order: ['opening', 'about', 'moment', 'dayToDay', 'fit', 'challenges', 'offerings', 'cta'],
  // Careers page video
  careers_video_url: null,
  careers_video_title: null,
  show_careers_video_section: false,
  careers_video_position: "after_selling",
};

export default function CareersPageSettings() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const { data: existingSettings, isLoading } = useCareersPageSettings(currentOrganization?.id);
  const { data: sellingContent, isLoading: isLoadingSellingContent } = useApprovedSellingContent(currentOrganization?.id);
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultSettings);
  const [activeTab, setActiveTab] = useState("content");

  const orgSlug = currentOrganization?.slug || currentOrganization?.id;
  const careersPagePath = `/careers/${orgSlug}`;

  // URL compartilhável: sempre aponta para o domínio canônico (gentia.tech),
  // não para o host do Lovable em que o admin está editando.
  const getShareableUrl = () => getPublicOrgCareersUrl(orgSlug || "");


  useEffect(() => {
    if (existingSettings) {
      setFormData({
        headline: existingSettings.headline || defaultSettings.headline,
        description: existingSettings.description || "",
        logo_url: existingSettings.logo_url,
        cover_image_url: existingSettings.cover_image_url,
        primary_color: existingSettings.primary_color || defaultSettings.primary_color,
        show_company_name: existingSettings.show_company_name ?? true,
        show_department_filter: existingSettings.show_department_filter ?? true,
        show_location_filter: existingSettings.show_location_filter ?? true,
        custom_categories: existingSettings.custom_categories || defaultSettings.custom_categories,
        meta_title: existingSettings.meta_title,
        meta_description: existingSettings.meta_description,
        is_published: existingSettings.is_published ?? true,
        use_selling_content: existingSettings.use_selling_content ?? true,
        show_opening_section: existingSettings.show_opening_section ?? true,
        show_about_section: existingSettings.show_about_section ?? true,
        show_moment_section: existingSettings.show_moment_section ?? true,
        show_benefits_section: existingSettings.show_benefits_section ?? true,
        show_fit_section: existingSettings.show_fit_section ?? true,
        show_challenges_section: existingSettings.show_challenges_section ?? true,
        show_offerings_section: existingSettings.show_offerings_section ?? true,
        show_cta_section: existingSettings.show_cta_section ?? true,
        show_testimonials_section: existingSettings.show_testimonials_section ?? true,
        show_values_section: existingSettings.show_values_section ?? true,
        show_gallery_section: existingSettings.show_gallery_section ?? true,
        show_social_links: existingSettings.show_social_links ?? true,
        talent_pool_enabled: existingSettings.talent_pool_enabled ?? false,
        job_alerts_enabled: existingSettings.job_alerts_enabled ?? false,
        gallery_images: existingSettings.gallery_images || [],
        // Job details page settings
        job_show_company_section: (existingSettings as any).job_show_company_section ?? true,
        job_show_mission: (existingSettings as any).job_show_mission ?? true,
        job_show_responsibilities: (existingSettings as any).job_show_responsibilities ?? true,
        job_show_indicators: (existingSettings as any).job_show_indicators ?? true,
        job_show_required_skills: (existingSettings as any).job_show_required_skills ?? true,
        job_show_desired_skills: (existingSettings as any).job_show_desired_skills ?? true,
        job_show_competencies: (existingSettings as any).job_show_competencies ?? true,
        job_show_benefits: (existingSettings as any).job_show_benefits ?? true,
        job_show_development: (existingSettings as any).job_show_development ?? true,
        job_show_related_jobs: (existingSettings as any).job_show_related_jobs ?? true,
        job_show_share_buttons: (existingSettings as any).job_show_share_buttons ?? true,
        job_show_gentia_branding: (existingSettings as any).job_show_gentia_branding ?? true,
        // New job page settings
        job_video_url: (existingSettings as any).job_video_url ?? null,
        job_use_custom_color: (existingSettings as any).job_use_custom_color ?? false,
        job_primary_color: (existingSettings as any).job_primary_color ?? '#000000',
        // Selling sections order
        // Selling sections order
        selling_sections_order: (existingSettings as any).selling_sections_order ?? defaultSettings.selling_sections_order,
        // Careers page video
        careers_video_url: (existingSettings as any).careers_video_url ?? null,
        careers_video_title: (existingSettings as any).careers_video_title ?? null,
        show_careers_video_section: (existingSettings as any).show_careers_video_section ?? false,
        careers_video_position: (existingSettings as any).careers_video_position ?? "after_selling",
      });
    } else if (currentOrganization) {
      // Set default description with company name
      setFormData({
        ...defaultSettings,
        description: `Descubra oportunidades de carreira na ${currentOrganization.name}. Junte-se à nossa equipe e encontre a vaga perfeita para você.`,
      });
    }
  }, [existingSettings, currentOrganization]);

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setIsSaving(true);
    try {
      const payload = {
        account_id: currentOrganization.id,
        ...formData,
      };

      let saved: any = null;
      if (existingSettings?.id) {
        const { data, error } = await supabase
          .from("careers_page_settings")
          .update(payload)
          .eq("id", existingSettings.id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("careers_page_settings")
          .insert(payload)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        saved = data;
      }

      if (!saved) {
        toast.error(
          "Salvamento bloqueado: você não tem permissão para editar esta página de carreiras (verifique se a organização ativa é a correta)."
        );
        return;
      }

      // Confirm video URL persisted
      if (
        formData.careers_video_url &&
        saved.careers_video_url !== formData.careers_video_url
      ) {
        toast.error("O vídeo não foi salvo corretamente. Tente novamente.");
        console.error("Video URL mismatch", { sent: formData.careers_video_url, saved: saved.careers_video_url });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["careers-page-settings"] });
      queryClient.invalidateQueries({ queryKey: ["careers-page"] });
      queryClient.invalidateQueries({ queryKey: ["careers-page", orgSlug] });
      toast.success(`Configurações salvas para ${currentOrganization.name}!`);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      const msg = error?.message || error?.error_description || "erro desconhecido";
      toast.error(`Erro ao salvar: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Nenhuma organização selecionada</p>
      </div>
    );
  }

  return (
    <RecruitmentLayout>
      <div className="container py-8 px-6">
        {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/atracao-contratacao/recrutamento")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Página de Carreiras</h1>
                <p className="text-muted-foreground">
                  Configure a aparência e conteúdo da sua página pública de carreiras
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <a href={careersPagePath} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir Página
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm">
              Editando a página de carreiras de{" "}
              <strong>{currentOrganization.name}</strong>. Para editar outra empresa,
              troque a organização ativa no menu superior.
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-8">
              {/* Settings Form */}
              <div className="flex-1 max-w-2xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="content" className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      Conteúdo
                    </TabsTrigger>
                    <TabsTrigger value="institutional" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      Vendendo a Empresa
                    </TabsTrigger>
                    <TabsTrigger value="testimonials" className="gap-2">
                      <MessageSquareQuote className="h-4 w-4" />
                      Depoimentos
                    </TabsTrigger>
                    <TabsTrigger value="images" className="gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Imagens
                    </TabsTrigger>
                    <TabsTrigger value="engagement" className="gap-2">
                      <Heart className="h-4 w-4" />
                      Engajamento
                    </TabsTrigger>
                    <TabsTrigger value="appearance" className="gap-2">
                      <Palette className="h-4 w-4" />
                      Aparência
                    </TabsTrigger>
                    <TabsTrigger value="filters" className="gap-2">
                      <Search className="h-4 w-4" />
                      Filtros
                    </TabsTrigger>
                    <TabsTrigger value="job_details" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Página da Vaga
                    </TabsTrigger>
                  </TabsList>

                  {/* Content Tab */}
                  <TabsContent value="content" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Cabeçalho</CardTitle>
                        <CardDescription>
                          Configure o título e descrição exibidos no topo da página
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="headline">Título Principal</Label>
                          <Input
                            id="headline"
                            value={formData.headline}
                            onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                            placeholder="Oportunidades de Carreira"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            value={formData.description || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Descreva sua empresa e o que torna trabalhar nela especial..."
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>SEO</CardTitle>
                        <CardDescription>
                          Configure as meta tags para buscadores
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="meta_title">Título da Página (SEO)</Label>
                          <Input
                            id="meta_title"
                            value={formData.meta_title || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value || null }))}
                            placeholder={`Carreiras na ${currentOrganization.name}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            Recomendado: até 60 caracteres
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="meta_description">Meta Descrição</Label>
                          <Textarea
                            id="meta_description"
                            value={formData.meta_description || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value || null }))}
                            placeholder="Descrição para buscadores e redes sociais..."
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground">
                            Recomendado: até 160 caracteres
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <CareersVideoEditor
                      accountId={currentOrganization.id}
                      videoUrl={formData.careers_video_url}
                      videoTitle={formData.careers_video_title}
                      enabled={formData.show_careers_video_section}
                      position={formData.careers_video_position}
                      onChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))}
                    />
                  </TabsContent>

                  {/* Institutional Tab - Selling Company Integration */}
                  <TabsContent value="institutional" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Vendendo a Empresa
                        </CardTitle>
                        <CardDescription>
                          Use o conteúdo do "Vendendo a Empresa" para enriquecer sua página de carreiras
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Status do Conteúdo */}
                        {isLoadingSellingContent ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Verificando conteúdo...</span>
                          </div>
                        ) : sellingContent?.hasApprovedContent ? (
                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                Conteúdo aprovado disponível!
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400">
                                O conteúdo do "Vendendo a Empresa" será exibido automaticamente na página de carreiras.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                Nenhum conteúdo aprovado encontrado
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400">
                                Complete o processo "Vendendo a Empresa" para enriquecer sua página de carreiras.
                              </p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to="/atracao-contratacao/atracao">
                                Ir para Vendendo a Empresa
                              </Link>
                            </Button>
                          </div>
                        )}

                        {/* Toggle principal */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="space-y-0.5">
                            <Label>Usar Conteúdo Institucional</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibir seções do "Vendendo a Empresa" na página de carreiras
                            </p>
                          </div>
                          <Switch
                            checked={formData.use_selling_content}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_selling_content: checked }))}
                            disabled={!sellingContent?.hasApprovedContent}
                          />
                        </div>

                        {/* Editor de seções com drag-and-drop */}
                        {formData.use_selling_content && sellingContent?.hasApprovedContent && (
                          <div className="space-y-4 pt-4 border-t">
                            <Label className="text-sm font-medium">Ordenar e Gerenciar Seções</Label>
                            <SellingSectionsEditor
                              order={formData.selling_sections_order}
                              hiddenSections={{
                                show_opening_section: formData.show_opening_section,
                                show_about_section: formData.show_about_section,
                                show_moment_section: formData.show_moment_section,
                                show_benefits_section: formData.show_benefits_section,
                                show_fit_section: formData.show_fit_section,
                                show_challenges_section: formData.show_challenges_section,
                                show_offerings_section: formData.show_offerings_section,
                                show_cta_section: formData.show_cta_section,
                              }}
                              onOrderChange={(newOrder) => setFormData(prev => ({ ...prev, selling_sections_order: newOrder }))}
                              onVisibilityChange={(key, visible) => setFormData(prev => ({ ...prev, [key]: visible }))}
                            />

                            {/* Valores da Empresa - Controle separado */}
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">💎</span>
                                <span className="text-sm">Valores da Empresa</span>
                                <span className="text-xs text-muted-foreground">(do módulo Cultura)</span>
                              </div>
                              <Switch
                                checked={formData.show_values_section}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_values_section: checked }))}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Preview do conteúdo */}
                    {sellingContent?.hasApprovedContent && sellingContent.blocks.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Preview do Conteúdo</CardTitle>
                          <CardDescription>
                            Prévia das seções que serão exibidas
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                            {sellingContent.blocks.map((block) => (
                              <div key={block.id} className="border rounded-lg p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{block.emoji}</span>
                                  <span className="text-sm font-medium">{block.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {block.content.slice(0, 150)}...
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <Button variant="outline" size="sm" asChild className="w-full">
                              <Link to="/atracao-contratacao/atracao">
                                Editar Conteúdo Institucional
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Testimonials Tab */}
                  <TabsContent value="testimonials" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquareQuote className="h-5 w-5" />
                          Depoimentos de Funcionários
                        </CardTitle>
                        <CardDescription>
                          Adicione depoimentos de funcionários para mostrar na página de carreiras
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Toggle para mostrar seção */}
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div className="space-y-0.5">
                            <Label>Mostrar Seção de Depoimentos</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibir depoimentos na página de carreiras
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_testimonials_section}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_testimonials_section: checked }))}
                          />
                        </div>

                        {/* Gerenciador de depoimentos */}
                        {formData.show_testimonials_section && (
                          <TestimonialsManager accountId={currentOrganization.id} />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Images Tab */}
                  <TabsContent value="images" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Logo</CardTitle>
                        <CardDescription>
                          Logo da empresa exibido no cabeçalho da página
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ImageUploadWithCrop
                          value={formData.logo_url}
                          onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                          aspectRatio={1}
                          bucket="careers-assets"
                          folder={currentOrganization.id}
                          label="Logo da Empresa"
                          description="Recomendado: 200x200px, formato quadrado"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Imagem de Capa</CardTitle>
                        <CardDescription>
                          Imagem de fundo exibida no topo da página de carreiras
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ImageUploadWithCrop
                          value={formData.cover_image_url}
                          onChange={(url) => setFormData(prev => ({ ...prev, cover_image_url: url }))}
                          aspectRatio={16/9}
                          bucket="careers-assets"
                          folder={currentOrganization.id}
                          label="Imagem de Capa"
                          description="Recomendado: 1920x1080px, formato paisagem (16:9)"
                        />
                      </CardContent>
                    </Card>

                    {/* Gallery Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          Galeria de Fotos
                        </CardTitle>
                        <CardDescription>
                          Adicione fotos da empresa, escritório, eventos e equipe
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Toggle para mostrar galeria */}
                        <div className="flex items-center justify-between pb-4 border-b">
                          <div className="space-y-0.5">
                            <Label>Mostrar Galeria de Fotos</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibir galeria de fotos na página de carreiras
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_gallery_section}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_gallery_section: checked }))}
                          />
                        </div>

                        {/* Gerenciador de galeria */}
                        {formData.show_gallery_section && (
                          <GalleryManager
                            accountId={currentOrganization.id}
                            images={formData.gallery_images || []}
                            onChange={(images) => setFormData(prev => ({ ...prev, gallery_images: images }))}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Engagement Tab */}
                  <TabsContent value="engagement" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Banco de Talentos
                        </CardTitle>
                        <CardDescription>
                          Permita que candidatos se inscrevam no banco de talentos mesmo sem vaga aberta
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Habilitar Banco de Talentos</Label>
                            <p className="text-sm text-muted-foreground">
                              Candidatos podem se cadastrar para futuras oportunidades
                            </p>
                          </div>
                          <Switch
                            checked={formData.talent_pool_enabled}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, talent_pool_enabled: checked }))}
                          />
                        </div>
                        {formData.talent_pool_enabled && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              ✅ O formulário de Banco de Talentos será exibido na página de carreiras.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Alertas de Vagas
                        </CardTitle>
                        <CardDescription>
                          Permita que interessados recebam notificações sobre novas vagas
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Habilitar Alertas de Vagas</Label>
                            <p className="text-sm text-muted-foreground">
                              Visitantes podem se inscrever para receber alertas de novas oportunidades
                            </p>
                          </div>
                          <Switch
                            checked={formData.job_alerts_enabled}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_alerts_enabled: checked }))}
                          />
                        </div>
                        {formData.job_alerts_enabled && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              ✅ O formulário de Alertas de Vagas será exibido na página de carreiras.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Share2 className="h-5 w-5" />
                          Links Sociais
                        </CardTitle>
                        <CardDescription>
                          Exiba links para as redes sociais da empresa
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Mostrar Links Sociais</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibir ícones de redes sociais no rodapé da página
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_social_links}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_social_links: checked }))}
                          />
                        </div>
                        {formData.show_social_links && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              💡 Configure os links sociais da empresa nas{" "}
                              <Link to="/settings/company" className="text-primary underline">
                                Configurações da Organização
                              </Link>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Appearance Tab */}
                  <TabsContent value="appearance" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Cor Primária</CardTitle>
                        <CardDescription>
                          Cor principal usada em botões, links e destaques
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ColorPicker
                          value={formData.primary_color || "#000000"}
                          onChange={(color) => setFormData(prev => ({ ...prev, primary_color: color }))}
                          label="Selecione a cor"
                          description="Escolha uma cor que represente sua marca"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Publicação</CardTitle>
                        <CardDescription>
                          Controle se a página está visível publicamente
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Página Publicada</Label>
                            <p className="text-sm text-muted-foreground">
                              Quando desativado, a página não será acessível publicamente
                            </p>
                          </div>
                          <Switch
                            checked={formData.is_published}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>URL da Página</CardTitle>
                        <CardDescription>
                          Endereço público da sua página de carreiras
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <code className="text-sm flex-1 truncate">
                            {getShareableUrl()}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(getShareableUrl());
                              toast.success("URL copiada!");
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                        {!currentOrganization.slug && (
                          <p className="text-xs text-muted-foreground mt-2">
                            💡 Configure um slug personalizado nas configurações da organização para ter uma URL mais amigável.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Filters Tab */}
                  <TabsContent value="filters" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Exibição de Filtros</CardTitle>
                        <CardDescription>
                          Escolha quais filtros mostrar na página de carreiras
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Mostrar Nome da Empresa</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibe o nome da empresa no cabeçalho
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_company_name}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_company_name: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Filtro por Departamento</Label>
                            <p className="text-sm text-muted-foreground">
                              Permite filtrar vagas por departamento/área
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_department_filter}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_department_filter: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Filtro por Localização</Label>
                            <p className="text-sm text-muted-foreground">
                              Permite filtrar vagas por localização
                            </p>
                          </div>
                          <Switch
                            checked={formData.show_location_filter}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_location_filter: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Job Details Page Tab */}
                  <TabsContent value="job_details" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Seções da Página de Vaga
                        </CardTitle>
                        <CardDescription>
                          Escolha quais seções exibir na página de detalhes de cada vaga
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Company Section */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Sobre a Empresa</Label>
                              <p className="text-xs text-muted-foreground">Seção com informações da empresa</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_company_section}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_company_section: checked }))}
                          />
                        </div>

                        {/* Mission */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Missão do Cargo</Label>
                              <p className="text-xs text-muted-foreground">Objetivo principal da posição</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_mission}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_mission: checked }))}
                          />
                        </div>

                        {/* Responsibilities */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Responsabilidades</Label>
                              <p className="text-xs text-muted-foreground">Lista de responsabilidades da vaga</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_responsibilities}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_responsibilities: checked }))}
                          />
                        </div>

                        {/* Indicators */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Indicadores de Sucesso</Label>
                              <p className="text-xs text-muted-foreground">Métricas de performance esperadas</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_indicators}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_indicators: checked }))}
                          />
                        </div>

                        {/* Required Skills */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Requisitos Obrigatórios</Label>
                              <p className="text-xs text-muted-foreground">Habilidades e conhecimentos essenciais</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_required_skills}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_required_skills: checked }))}
                          />
                        </div>

                        {/* Desired Skills */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Diferenciais</Label>
                              <p className="text-xs text-muted-foreground">Habilidades desejáveis que somam pontos</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_desired_skills}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_desired_skills: checked }))}
                          />
                        </div>

                        {/* Competencies */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Competências Comportamentais</Label>
                              <p className="text-xs text-muted-foreground">Soft skills esperadas para a vaga</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_competencies}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_competencies: checked }))}
                          />
                        </div>

                        {/* Benefits */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Benefícios</Label>
                              <p className="text-xs text-muted-foreground">Pacote de benefícios oferecido</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_benefits}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_benefits: checked }))}
                          />
                        </div>

                        {/* Development */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Oportunidades de Desenvolvimento</Label>
                              <p className="text-xs text-muted-foreground">Crescimento e aprendizado oferecidos</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_development}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_development: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Share2 className="h-5 w-5" />
                          Navegação e Compartilhamento
                        </CardTitle>
                        <CardDescription>
                          Configure botões de navegação e compartilhamento social
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Share Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              <Linkedin className="h-4 w-4 text-muted-foreground" />
                              <MessageCircle className="h-4 w-4 text-muted-foreground ml-1" />
                              <Link2 className="h-4 w-4 text-muted-foreground ml-1" />
                            </div>
                            <div>
                              <Label>Botões de Compartilhamento</Label>
                              <p className="text-xs text-muted-foreground">LinkedIn, WhatsApp e Copiar Link</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_share_buttons}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_share_buttons: checked }))}
                          />
                        </div>

                        {/* Related Jobs */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <Label>Outras Vagas da Empresa</Label>
                              <p className="text-xs text-muted-foreground">Exibir vagas relacionadas no final da página</p>
                            </div>
                          </div>
                          <Switch
                            checked={formData.job_show_related_jobs}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_related_jobs: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Video Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Video className="h-5 w-5" />
                          Vídeo de Apresentação
                        </CardTitle>
                        <CardDescription>
                          Adicione um vídeo do YouTube ou Vimeo para apresentar a empresa ou a vaga
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="job_video_url">URL do Vídeo</Label>
                          <Input
                            id="job_video_url"
                            value={formData.job_video_url || ""}
                            onChange={(e) => setFormData(prev => ({ ...prev, job_video_url: e.target.value || null }))}
                            placeholder="https://www.youtube.com/watch?v=... ou https://vimeo.com/..."
                          />
                          <p className="text-xs text-muted-foreground">
                            Cole o link do YouTube ou Vimeo. O vídeo será exibido na página de detalhes da vaga.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Colors Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PaletteIcon className="h-5 w-5" />
                          Cores da Página de Vaga
                        </CardTitle>
                        <CardDescription>
                          Personalize as cores da página de detalhes das vagas
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Usar Cor Específica para Vagas</Label>
                            <p className="text-sm text-muted-foreground">
                              Usar uma cor diferente da cor primária da empresa
                            </p>
                          </div>
                          <Switch
                            checked={formData.job_use_custom_color}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_use_custom_color: checked }))}
                          />
                        </div>

                        {formData.job_use_custom_color && (
                          <div className="pt-2 border-t">
                            <ColorPicker
                              value={formData.job_primary_color}
                              onChange={(color) => setFormData(prev => ({ ...prev, job_primary_color: color }))}
                              label="Cor Primária das Vagas"
                              description="Esta cor será usada nos botões, ícones e destaques da página de vaga"
                            />
                          </div>
                        )}

                        {!formData.job_use_custom_color && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: formData.primary_color }}
                            />
                            <span>Usando a cor primária da empresa: {formData.primary_color}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Branding
                        </CardTitle>
                        <CardDescription>
                          Configure a identidade visual da página
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* GENTIA Branding */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Powered by GENTIA</Label>
                            <p className="text-sm text-muted-foreground">
                              Exibir o selo "Powered by GENTIA" no rodapé da página de vaga
                            </p>
                          </div>
                          <Switch
                            checked={formData.job_show_gentia_branding}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, job_show_gentia_branding: checked }))}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Live Preview */}
              <div className="w-[400px] shrink-0 sticky top-8 self-start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">
                      {activeTab === "job_details" ? "Preview da Vaga" : "Preview ao Vivo"}
                    </h3>
                    <span className="text-xs text-muted-foreground">Escala 60%</span>
                  </div>
                  
                  {activeTab === "job_details" ? (
                    <JobPagePreview
                      companyName={currentOrganization.name}
                      logoUrl={formData.logo_url}
                      companyDescription={formData.description || ""}
                      primaryColor={formData.primary_color || "#000000"}
                      jobPrimaryColor={formData.job_primary_color || "#000000"}
                      useJobCustomColor={formData.job_use_custom_color}
                      videoUrl={formData.job_video_url}
                      settings={{
                        job_show_company_section: formData.job_show_company_section,
                        job_show_mission: formData.job_show_mission,
                        job_show_responsibilities: formData.job_show_responsibilities,
                        job_show_indicators: formData.job_show_indicators,
                        job_show_required_skills: formData.job_show_required_skills,
                        job_show_desired_skills: formData.job_show_desired_skills,
                        job_show_competencies: formData.job_show_competencies,
                        job_show_benefits: formData.job_show_benefits,
                        job_show_development: formData.job_show_development,
                        job_show_related_jobs: formData.job_show_related_jobs,
                        job_show_share_buttons: formData.job_show_share_buttons,
                        job_show_gentia_branding: formData.job_show_gentia_branding,
                      }}
                      className="h-[600px] overflow-hidden"
                    />
                  ) : (
                    <CareersPagePreview
                      companyName={currentOrganization.name}
                      headline={formData.headline}
                      description={formData.description || ""}
                      logoUrl={formData.logo_url}
                      coverImageUrl={formData.cover_image_url}
                      primaryColor={formData.primary_color || "#000000"}
                      showCompanyName={formData.show_company_name}
                      showDepartmentFilter={formData.show_department_filter}
                      showLocationFilter={formData.show_location_filter}
                      sellingContent={sellingContent ? {
                        blocks: sellingContent.blocks || [],
                        hasApprovedContent: sellingContent.hasApprovedContent
                      } : undefined}
                      useSellingContent={formData.use_selling_content}
                      className="h-[600px] overflow-hidden"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </RecruitmentLayout>
  );
}
