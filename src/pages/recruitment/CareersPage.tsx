import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, MapPin, Briefcase, ArrowRight, Globe, Loader2, Building2, Target } from "lucide-react";
import logoGentia from "@/assets/logo-gentia-black.png";
import { useCareersPage } from "@/hooks/useCareersPage";
import { useCultureCodeValues } from "@/hooks/useCultureCodeValues";
import { usePublicTestimonials } from "@/hooks/useTestimonials";
import { SellingContentSection } from "@/components/careers/SellingContentSection";
import { ValuesSection } from "@/components/careers/ValuesSection";
import { TestimonialsCarousel } from "@/components/careers/TestimonialsCarousel";
import { PhotoGallery } from "@/components/careers/PhotoGallery";
import { SocialLinks } from "@/components/careers/SocialLinks";
import { TalentPoolForm } from "@/components/careers/TalentPoolForm";
import { JobAlertForm } from "@/components/careers/JobAlertForm";
import { CareersVideoSection } from "@/components/careers/CareersVideoSection";

const employmentTypeLabels: Record<string, string> = {
  full_time: "Integral",
  part_time: "Meio Período",
  contract: "Contrato",
  internship: "Estágio",
  temporary: "Temporário",
  freelance: "Freelance",
  PJ: "PJ",
  CLT: "CLT",
};

const CareersPage = () => {
  const { orgSlug } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedLocation, setSelectedLocation] = useState("Todas as Localizações");

  const { data, isLoading, error } = useCareersPage(orgSlug || "");
  
  // Fetch culture code values for this company
  const { data: cultureData } = useCultureCodeValues(data?.company?.id);
  
  // Fetch testimonials for this company
  const { data: testimonials } = usePublicTestimonials(data?.company?.id);

  // Set dynamic page title and meta description
  useEffect(() => {
    if (data?.company && data?.settings) {
      const title = data.settings.meta_title || `Carreiras na ${data.company.name}`;
      const description = data.settings.meta_description || data.settings.description || `Descubra oportunidades de carreira na ${data.company.name}`;
      
      document.title = title;
      
      // Update or create meta description
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', description);

      // Open Graph tags
      const setOGTag = (property: string, content: string) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      };

      setOGTag('og:title', title);
      setOGTag('og:description', description);
      setOGTag('og:type', 'website');
      if (data.settings.cover_image_url) {
        setOGTag('og:image', data.settings.cover_image_url);
      }
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <p className="text-muted-foreground">
            A página de carreiras que você está procurando não existe ou não está publicada.
          </p>
        </div>
      </div>
    );
  }

  const { company, settings, jobs, departments, locations, sellingContent, hasSellingContent } = data;

  // Use settings or defaults
  const headline = settings?.headline || "Oportunidades de Carreira";
  const description = settings?.description || 
    `Descubra oportunidades de carreira na ${company.name}. Junte-se à nossa equipe e encontre a vaga perfeita para você.`;
  const showDepartmentFilter = settings?.show_department_filter ?? true;
  const showLocationFilter = settings?.show_location_filter ?? true;
  const primaryColor = settings?.primary_color || "#000000";

  // Section visibility settings - 8 selling content sections
  const showOpeningSection = settings?.show_opening_section !== false;
  const showAboutSection = settings?.show_about_section !== false;
  const showMomentSection = settings?.show_moment_section !== false;
  const showBenefitsSection = settings?.show_benefits_section !== false;
  const showFitSection = settings?.show_fit_section !== false;
  const showChallengesSection = settings?.show_challenges_section !== false;
  const showOfferingsSection = settings?.show_offerings_section !== false;
  const showCtaSection = settings?.show_cta_section !== false;
  // Other section visibility
  const showValuesSection = settings?.show_values_section !== false;
  const showTestimonialsSection = settings?.show_testimonials_section !== false;
  const showGallerySection = settings?.show_gallery_section === true;
  const showSocialLinks = settings?.show_social_links !== false;
  const talentPoolEnabled = settings?.talent_pool_enabled === true;
  const jobAlertsEnabled = settings?.job_alerts_enabled === true;

  // Careers video
  const showCareersVideo = settings?.show_careers_video_section === true && !!settings?.careers_video_url;
  const videoPosition = settings?.careers_video_position || "after_selling";
  const renderVideo = (pos: typeof videoPosition) =>
    showCareersVideo && videoPosition === pos ? (
      <CareersVideoSection
        url={settings?.careers_video_url}
        title={settings?.careers_video_title}
        primaryColor={primaryColor}
        className="border-b border-border"
      />
    ) : null;

  // Build category list from departments
  const categories = ["Todos", ...departments];
  const locationOptions = ["Todas as Localizações", ...locations];

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = activeCategory === "Todos" || job.department === activeCategory;
    const matchesLocation = selectedLocation === "Todas as Localizações" || job.location === selectedLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Image */}
      {settings?.cover_image_url && (
        <div className="relative h-64 md:h-80 bg-muted">
          <img
            src={settings.cover_image_url}
            alt={`${company.name} - Trabalhe Conosco`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      )}

      {renderVideo("top")}

      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img 
                  src={settings.logo_url} 
                  alt={company.name} 
                  className="w-10 h-10 rounded-lg object-contain"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-bold text-lg">
                    {company.name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="font-semibold text-lg">{company.name}</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Social Links */}
              {showSocialLinks && (
                <SocialLinks
                  instagram={company.instagram}
                  linkedin={company.linkedin}
                  facebook={company.facebook}
                  youtube={company.youtube}
                  twitter={company.twitter}
                  website={company.website}
                  primaryColor={primaryColor}
                />
              )}
              
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Select defaultValue="pt-BR">
                  <SelectTrigger className="w-[180px] border-0 bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt-BR">Português Brasil</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{headline}</h1>
          <p className="text-muted-foreground max-w-3xl text-lg">
            {description}
          </p>
        </div>
      </header>

      {/* Selling Company Content Sections (Vendendo a Empresa) - Dynamic order */}
      {hasSellingContent && sellingContent && (
        <div className="border-b border-border bg-muted/30">
          {(() => {
            // Get section order from settings or use default
            const sectionOrder = settings?.selling_sections_order || 
              ['opening', 'about', 'moment', 'dayToDay', 'fit', 'challenges', 'offerings', 'cta'];

            // Map section keys to their content and visibility
            const sectionMap: Record<string, { content: typeof sellingContent.opening; visible: boolean }> = {
              opening: { content: sellingContent.opening, visible: showOpeningSection },
              about: { content: sellingContent.about, visible: showAboutSection },
              moment: { content: sellingContent.moment, visible: showMomentSection },
              dayToDay: { content: sellingContent.dayToDay, visible: showBenefitsSection },
              fit: { content: sellingContent.fit, visible: showFitSection },
              challenges: { content: sellingContent.challenges, visible: showChallengesSection },
              offerings: { content: sellingContent.offerings, visible: showOfferingsSection },
              cta: { content: sellingContent.cta, visible: showCtaSection },
            };

            // Filter and render sections in order
            const visibleSections = sectionOrder.filter(
              (key) => sectionMap[key]?.visible && sectionMap[key]?.content
            );

            return visibleSections.map((key, index) => {
              const section = sectionMap[key];
              const isLast = index === visibleSections.length - 1;

              return (
                <SellingContentSection
                  key={key}
                  block={section.content!}
                  primaryColor={primaryColor}
                  className={!isLast ? "border-b border-border/50" : undefined}
                />
              );
            });
          })()}
        </div>
      )}

      {/* Fallback: Company Info without Selling Content */}
      {!hasSellingContent && (company.current_mission || company.current_vision || company.sector) && (
        <section className="py-8 border-b border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              {company.current_mission && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5" style={{ color: primaryColor }} />
                    <h3 className="text-lg font-semibold">Nossa Missão</h3>
                  </div>
                  <p className="text-muted-foreground">{company.current_mission}</p>
                </div>
              )}
              {company.current_vision && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" style={{ color: primaryColor }} />
                    <h3 className="text-lg font-semibold">Nossa Visão</h3>
                  </div>
                  <p className="text-muted-foreground">{company.current_vision}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {renderVideo("after_selling")}

      {/* Values Section (from Culture Code) */}
      {showValuesSection && cultureData?.hasValues && cultureData.values.length > 0 && (
        <ValuesSection 
          values={cultureData.values} 
          primaryColor={primaryColor}
          className="border-b border-border"
        />
      )}

      {/* Photo Gallery */}
      {showGallerySection && settings?.gallery_images && settings.gallery_images.length > 0 && (
        <PhotoGallery 
          images={settings.gallery_images} 
          primaryColor={primaryColor}
          className="border-b border-border"
        />
      )}

      {/* Testimonials */}
      {showTestimonialsSection && testimonials && testimonials.length > 0 && (
        <TestimonialsCarousel 
          testimonials={testimonials} 
          primaryColor={primaryColor}
          className="border-b border-border"
        />
      )}

      {/* Jobs Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-6">Vagas Abertas ({jobs.length})</h2>
          
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {showDepartmentFilter && categories.length > 1 && (
              <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <TabsList className="flex-wrap h-auto">
                  {categories.map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            
            <div className="flex items-center gap-3">
              {showLocationFilter && locationOptions.length > 1 && (
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vagas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="divide-y divide-border border rounded-lg bg-card">
          {filteredJobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {jobs.length === 0 
                  ? "Não há vagas abertas no momento. Volte em breve!"
                  : "Nenhuma vaga encontrada com os filtros selecionados."}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <Link 
                key={job.id} 
                to={`/vagas/${job.id}`}
                className="block p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{job.title}</span>
                      {job.department && (
                        <Badge variant="secondary" className="text-xs">
                          {job.department}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                      )}
                      {job.employment_type && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {employmentTypeLabels[job.employment_type] || job.employment_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" style={{ color: primaryColor }}>
                    {settings?.apply_button_text || "Ver detalhes"}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>


      {renderVideo("after_jobs")}

      {/* Talent Pool Section */}
      {talentPoolEnabled && company.id && (
        <TalentPoolForm 
          accountId={company.id}
          departments={departments}
          primaryColor={primaryColor}
          className="border-t border-border"
        />
      )}

      {/* Job Alerts Section */}
      {jobAlertsEnabled && company.id && (
        <JobAlertForm 
          accountId={company.id}
          primaryColor={primaryColor}
        />
      )}

      {renderVideo("footer")}

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Social Links in Footer */}
            {showSocialLinks && (
              <SocialLinks
                instagram={company.instagram}
                linkedin={company.linkedin}
                facebook={company.facebook}
                youtube={company.youtube}
                twitter={company.twitter}
                website={company.website}
                primaryColor={primaryColor}
              />
            )}
            
            <p className="text-sm text-muted-foreground text-center md:text-right">
              {settings?.footer_text || `© ${new Date().getFullYear()} ${company.name}. Todos os direitos reservados.`}
            </p>
          </div>
          
          {/* GENTIA Branding */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground">Powered by</span>
            <a 
              href="https://gentia.lovable.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img 
                src={logoGentia} 
                alt="GENT.IA" 
                className="h-5 w-auto"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CareersPage;
