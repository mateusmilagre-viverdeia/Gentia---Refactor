import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseContentBlocks, ContentBlock } from "@/lib/parseContentBlocks";

export interface ApprovedSellingContent {
  fullContent: string;
  blocks: ContentBlock[];
  hasApprovedContent: boolean;
  sessionId: string | null;
  approvedAt: string | null;
}

/**
 * Hook to fetch the approved "Vendendo a Empresa" content for an organization.
 * This content is used as the default for the careers page description.
 */
export function useApprovedSellingContent(accountId: string | undefined) {
  return useQuery({
    queryKey: ["approved-selling-content", accountId],
    queryFn: async (): Promise<ApprovedSellingContent> => {
      if (!accountId) {
        return {
          fullContent: "",
          blocks: [],
          hasApprovedContent: false,
          sessionId: null,
          approvedAt: null,
        };
      }

      // First, get the selling company session for this account
      const { data: session, error: sessionError } = await supabase
        .from("selling_company_sessions")
        .select("id, status")
        .eq("account_id", accountId)
        .maybeSingle();

      if (sessionError || !session) {
        return {
          fullContent: "",
          blocks: [],
          hasApprovedContent: false,
          sessionId: null,
          approvedAt: null,
        };
      }

      // Check if the session is approved
      if (session.status !== "approved") {
        return {
          fullContent: "",
          blocks: [],
          hasApprovedContent: false,
          sessionId: session.id,
          approvedAt: null,
        };
      }

      // Get the approved version
      const { data: version, error: versionError } = await supabase
        .from("selling_company_versions")
        .select("content, created_at")
        .eq("session_id", session.id)
        .eq("approved", true)
        .maybeSingle();

      if (versionError || !version || !version.content) {
        return {
          fullContent: "",
          blocks: [],
          hasApprovedContent: false,
          sessionId: session.id,
          approvedAt: null,
        };
      }

      // Parse the content into blocks
      const blocks = parseContentBlocks(version.content);

      return {
        fullContent: version.content,
        blocks,
        hasApprovedContent: true,
        sessionId: session.id,
        approvedAt: version.created_at,
      };
    },
    enabled: !!accountId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
