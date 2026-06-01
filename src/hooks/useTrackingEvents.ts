import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { Json } from "@/integrations/supabase/types";

export type TrackingEventType =
  | "viewed_job"
  | "started_application"
  | "submitted_application"
  | "entered_whatsapp"
  | "whatsapp_replied"
  | "completed_disc"
  | "completed_interview"
  | "qualified"
  | "hired"
  | "rejected"
  | "dropped"
  | "status_changed";

export interface TrackingEventParams {
  candidateId: string;
  jobId?: string;
  applicationId?: string;
  eventType: TrackingEventType;
  source?: string;
  medium?: string;
  campaign?: string;
  metadata?: Json;
}

export interface CandidateTouchData {
  source: string;
  medium: string;
  campaign?: string | null;
}

/**
 * Hook for registering tracking events and managing first/last touch attribution
 */
export function useTrackingEvents() {
  const { currentAccount } = useOrganization();
  const queryClient = useQueryClient();

  /**
   * Register a tracking event and update touch attribution
   */
  const registerEventMutation = useMutation({
    mutationFn: async (params: TrackingEventParams) => {
      if (!currentAccount?.id) {
        throw new Error("No account context");
      }

      const { candidateId, jobId, applicationId, eventType, source, medium, campaign, metadata } = params;

      // 1. Insert tracking event
      const { error: eventError } = await supabase
        .from("candidate_tracking_events")
        .insert([{
          account_id: currentAccount.id,
          candidate_id: candidateId,
          job_id: jobId || null,
          application_id: applicationId || null,
          event_type: eventType,
          source: source || null,
          medium: medium || null,
          campaign: campaign || null,
          metadata: (metadata || {}) as Json,
        }]);

      if (eventError) {
        console.error("[TrackingEvents] Error inserting event:", eventError);
        throw eventError;
      }

      // 2. Update candidate touch attribution
      if (source) {
        // Check if candidate has first_touch_source set
        const { data: candidate } = await supabase
          .from("recruitment_candidates")
          .select("id, first_touch_source")
          .eq("id", candidateId)
          .single();

        const now = new Date().toISOString();
        const updateFields: Record<string, unknown> = {
          last_touch_source: source,
          last_touch_medium: medium || null,
          last_touch_campaign: campaign || null,
          last_touch_at: now,
        };

        // Set first touch only if not already set
        if (candidate && !candidate.first_touch_source) {
          updateFields.first_touch_source = source;
          updateFields.first_touch_medium = medium || null;
          updateFields.first_touch_campaign = campaign || null;
          updateFields.first_touch_at = now;
        }

        const { error: updateError } = await supabase
          .from("recruitment_candidates")
          .update(updateFields)
          .eq("id", candidateId);

        if (updateError) {
          console.error("[TrackingEvents] Error updating candidate touch:", updateError);
        }
      }

      console.log(`[TrackingEvents] Registered: ${eventType} for candidate ${candidateId}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate analytics queries
      queryClient.invalidateQueries({ queryKey: ["funnel-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["source-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["tracking-events"] });
    },
  });

  const registerEvent = useCallback(
    async (params: TrackingEventParams) => {
      return registerEventMutation.mutateAsync(params);
    },
    [registerEventMutation]
  );

  /**
   * Update first touch attribution for a candidate (only if not already set)
   */
  const setFirstTouch = useCallback(
    async (candidateId: string, touchData: CandidateTouchData) => {
      const { data: candidate } = await supabase
        .from("recruitment_candidates")
        .select("id, first_touch_source")
        .eq("id", candidateId)
        .single();

      // Only set if not already set
      if (candidate && !candidate.first_touch_source) {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("recruitment_candidates")
          .update({
            first_touch_source: touchData.source,
            first_touch_medium: touchData.medium,
            first_touch_campaign: touchData.campaign || null,
            first_touch_at: now,
            last_touch_source: touchData.source,
            last_touch_medium: touchData.medium,
            last_touch_campaign: touchData.campaign || null,
            last_touch_at: now,
          })
          .eq("id", candidateId);

        if (error) {
          console.error("[TrackingEvents] Error setting first touch:", error);
          throw error;
        }

        console.log(`[TrackingEvents] Set first touch for candidate ${candidateId}: ${touchData.source}`);
      }
    },
    []
  );

  /**
   * Update last touch attribution for a candidate
   */
  const setLastTouch = useCallback(
    async (candidateId: string, touchData: CandidateTouchData) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("recruitment_candidates")
        .update({
          last_touch_source: touchData.source,
          last_touch_medium: touchData.medium,
          last_touch_campaign: touchData.campaign || null,
          last_touch_at: now,
        })
        .eq("id", candidateId);

      if (error) {
        console.error("[TrackingEvents] Error setting last touch:", error);
        throw error;
      }

      console.log(`[TrackingEvents] Set last touch for candidate ${candidateId}: ${touchData.source}`);
    },
    []
  );

  return {
    registerEvent,
    setFirstTouch,
    setLastTouch,
    isLoading: registerEventMutation.isPending,
  };
}

/**
 * Standalone function to register events from edge functions or non-hook contexts
 * Use this in edge functions or server-side code
 */
export async function registerTrackingEvent(
  supabaseClient: typeof supabase,
  params: TrackingEventParams & { accountId: string }
) {
  const { accountId, candidateId, jobId, applicationId, eventType, source, medium, campaign, metadata } = params;

  // Insert event
  const { error: eventError } = await supabaseClient
    .from("candidate_tracking_events")
    .insert([{
      account_id: accountId,
      candidate_id: candidateId,
      job_id: jobId || null,
      application_id: applicationId || null,
      event_type: eventType,
      source: source || null,
      medium: medium || null,
      campaign: campaign || null,
      metadata: (metadata || {}) as Json,
    }]);

  if (eventError) {
    console.error("[registerTrackingEvent] Error:", eventError);
    throw eventError;
  }

  // Update candidate touch if source provided
  if (source) {
    const { data: candidate } = await supabaseClient
      .from("recruitment_candidates")
      .select("id, first_touch_source")
      .eq("id", candidateId)
      .single();

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      last_touch_source: source,
      last_touch_medium: medium || null,
      last_touch_campaign: campaign || null,
      last_touch_at: now,
    };

    if (candidate && !candidate.first_touch_source) {
      updateFields.first_touch_source = source;
      updateFields.first_touch_medium = medium || null;
      updateFields.first_touch_campaign = campaign || null;
      updateFields.first_touch_at = now;
    }

    await supabaseClient
      .from("recruitment_candidates")
      .update(updateFields)
      .eq("id", candidateId);
  }

  return { success: true };
}
