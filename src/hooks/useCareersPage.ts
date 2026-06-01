import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseContentBlocks, ContentBlock } from "@/lib/parseContentBlocks";

export interface CareersPageSettings {
  id: string;
  account_id: string;
  headline: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  primary_color: string;
  show_company_name: boolean;
  show_department_filter: boolean;
  show_location_filter: boolean;
  custom_categories: string[];
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  // Selling content integration - 8 sections
  use_selling_content?: boolean;
  show_opening_section?: boolean;
  show_about_section?: boolean;
  show_moment_section?: boolean;
  show_benefits_section?: boolean;
  show_fit_section?: boolean;
  show_challenges_section?: boolean;
  show_offerings_section?: boolean;
  show_cta_section?: boolean;
  // Section order
  selling_sections_order?: string[];
  // New fields for enhanced careers page
  gallery_images?: string[];
  show_social_links?: boolean;
  show_gallery_section?: boolean;
  show_testimonials_section?: boolean;
  show_values_section?: boolean;
  talent_pool_enabled?: boolean;
  job_alerts_enabled?: boolean;
  apply_button_text?: string;
  footer_text?: string;
  // Careers page video
  careers_video_url?: string | null;
  careers_video_title?: string | null;
  show_careers_video_section?: boolean;
  careers_video_position?: "top" | "after_selling" | "after_jobs" | "footer";
}

export interface PublicJob {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  description: string | null;
}

// Updated to support 8 sections
export interface SellingContentBlocks {
  opening: ContentBlock | null;     // ✨ Abertura Inicial
  about: ContentBlock | null;       // 🌟 Quem Somos
  moment: ContentBlock | null;      // 🚀 Onde Estamos
  dayToDay: ContentBlock | null;    // 🎬 O Que É Trabalhar
  fit: ContentBlock | null;         // 🤝 Santo Vai Bater
  challenges: ContentBlock | null;  // ⚠️ Lado Difícil
  offerings: ContentBlock | null;   // 🎁 O Que Encontra
  cta: ContentBlock | null;         // 🎯 CTA
}

export interface CareersPageData {
  company: {
    id: string;
    name: string;
    slug: string | null;
    sector: string | null;
    website: string | null;
    instagram: string | null;
    linkedin: string | null;
    facebook: string | null;
    youtube: string | null;
    twitter: string | null;
    current_mission: string | null;
    current_vision: string | null;
  } | null;
  settings: CareersPageSettings | null;
  jobs: PublicJob[];
  departments: string[];
  locations: string[];
  sellingContent: SellingContentBlocks | null;
  hasSellingContent: boolean;
}

export function useCareersPage(orgSlug: string) {
  return useQuery({
    queryKey: ["careers-page", orgSlug],
    queryFn: async (): Promise<CareersPageData> => {
      // companies.id is uuid — filtering by id with a non-UUID string causes
      // PostgREST to throw "invalid input syntax for type uuid", which broke
      // every careers page accessed via slug (e.g. /careers/ep-partners).
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const companyQuery = supabase
        .from("companies")
        .select("id, name, slug, sector, website, instagram, linkedin, facebook, youtube, twitter, current_mission, current_vision");

      const { data: company, error: companyError } = UUID_RE.test(orgSlug)
        ? await companyQuery.eq("id", orgSlug).maybeSingle()
        : await companyQuery.eq("slug", orgSlug).maybeSingle();

      if (companyError) {
        console.error("Error fetching company:", companyError);
        throw companyError;
      }

      if (!company) {
        return {
          company: null,
          settings: null,
          jobs: [],
          departments: [],
          locations: [],
          sellingContent: null,
          hasSellingContent: false,
        };
      }

      // Fetch careers page settings
      const { data: settings } = await supabase
        .from("careers_page_settings")
        .select("*")
        .eq("account_id", company.id)
        .maybeSingle();

      // Fetch active and public jobs
      const { data: jobs, error: jobsError } = await supabase
        .from("recruitment_jobs")
        .select("id, title, department, location, employment_type, description")
        .eq("account_id", company.id)
        .eq("status", "active")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (jobsError) {
        console.error("Error fetching jobs:", jobsError);
        throw jobsError;
      }

      // Fetch approved selling company content
      let sellingContent: SellingContentBlocks | null = null;
      let hasSellingContent = false;

      // Check if we should use selling content (default true)
      const useSellingContent = settings?.use_selling_content !== false;

      if (useSellingContent) {
        // Get the selling company session
        const { data: sellingSession } = await supabase
          .from("selling_company_sessions")
          .select("id, status")
          .eq("account_id", company.id)
          .eq("status", "approved")
          .maybeSingle();

        if (sellingSession?.id) {
          // Get the approved version
          const { data: sellingVersion } = await supabase
            .from("selling_company_versions")
            .select("content")
            .eq("session_id", sellingSession.id)
            .eq("approved", true)
            .maybeSingle();

          if (sellingVersion?.content) {
            hasSellingContent = true;
            const blocks = parseContentBlocks(sellingVersion.content);

            // Map blocks to structured content - 8 sections
            sellingContent = {
              opening: blocks.find(b => b.id === "abertura") || null,
              about: blocks.find(b => b.id === "quem-somos") || null,
              moment: blocks.find(b => b.id === "onde-estamos") || null,
              dayToDay: blocks.find(b => b.id === "o-que-e-trabalhar") || null,
              fit: blocks.find(b => b.id === "santo-vai-bater") || null,
              challenges: blocks.find(b => b.id === "lado-dificil") || null,
              offerings: blocks.find(b => b.id === "o-que-encontra") || null,
              cta: blocks.find(b => b.id === "cta") || null,
            };
          }
        }
      }

      // Extract unique departments and locations from jobs
      const departments = [...new Set(jobs?.map(j => j.department).filter(Boolean) as string[])];
      const locations = [...new Set(jobs?.map(j => j.location).filter(Boolean) as string[])];

      return {
        company,
        settings: settings as CareersPageSettings | null,
        jobs: jobs || [],
        departments,
        locations,
        sellingContent,
        hasSellingContent,
      };
    },
    enabled: !!orgSlug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for internal use - managing settings
export function useCareersPageSettings(accountId: string | undefined) {
  return useQuery({
    queryKey: ["careers-page-settings", accountId],
    queryFn: async () => {
      if (!accountId) return null;
      
      const { data, error } = await supabase
        .from("careers_page_settings")
        .select("*")
        .eq("account_id", accountId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching careers settings:", error);
        throw error;
      }

      return data as CareersPageSettings | null;
    },
    enabled: !!accountId,
  });
}
