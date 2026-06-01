import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CultureValue {
  id: string;
  title: string;
  mantra: string;
  dos: string[];
  donts: string[];
}

interface SlideValueData {
  mantra?: string;
  dos?: string[];
  donts?: string[];
}

interface Slide {
  id: string;
  type: string;
  title?: string;
  valueData?: SlideValueData;
}

interface CultureCodeStructure {
  valores?: {
    items?: Array<{ id: string; label: string }>;
  };
}

/**
 * Hook to fetch Culture Code values for an organization.
 * Extracts values from culture_code_sessions structure and slides.
 */
export function useCultureCodeValues(accountId: string | undefined) {
  return useQuery({
    queryKey: ["culture-code-values", accountId],
    queryFn: async (): Promise<{ values: CultureValue[]; hasValues: boolean }> => {
      if (!accountId) {
        return { values: [], hasValues: false };
      }

      // Fetch culture code session
      const { data: session, error } = await supabase
        .from("culture_code_sessions")
        .select("id, structure, slides")
        .eq("account_id", accountId)
        .maybeSingle();

      if (error || !session) {
        return { values: [], hasValues: false };
      }

      const values: CultureValue[] = [];
      
      // Parse structure to get value labels
      const structure = session.structure as CultureCodeStructure | null;
      const slides = (Array.isArray(session.slides) ? session.slides : []) as unknown as Slide[];
      
      if (!slides || slides.length === 0) {
        return { values: [], hasValues: false };
      }

      // Find value slides
      const valueSlides = slides.filter(slide => slide.type === 'value' && slide.valueData);

      for (const slide of valueSlides) {
        if (slide.valueData) {
          values.push({
            id: slide.id,
            title: slide.title || 'Valor',
            mantra: slide.valueData.mantra || '',
            dos: slide.valueData.dos || [],
            donts: slide.valueData.donts || [],
          });
        }
      }

      // If no value slides found, try to get from structure
      if (values.length === 0 && structure?.valores?.items) {
        for (const item of structure.valores.items) {
          values.push({
            id: item.id,
            title: item.label,
            mantra: '',
            dos: [],
            donts: [],
          });
        }
      }

      return {
        values,
        hasValues: values.length > 0,
      };
    },
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
