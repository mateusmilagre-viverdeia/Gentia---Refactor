import { useEffect, useCallback } from "react";

const TRACKING_STORAGE_KEY = "gentia_tracking_first_touch";

export interface TrackingData {
  source: string;
  medium: string;
  campaign: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referrerUrl: string | null;
  landingPage: string;
  capturedAt: string;
}

// Source detection based on referrer domain
function detectSourceFromReferrer(referrer: string): string {
  if (!referrer) return "direct";
  
  try {
    const domain = new URL(referrer).hostname.toLowerCase();
    
    if (domain.includes("linkedin")) return "linkedin";
    if (domain.includes("indeed")) return "indeed";
    if (domain.includes("google")) return "google";
    if (domain.includes("facebook") || domain.includes("instagram")) return "facebook";
    if (domain.includes("whatsapp") || domain.includes("wa.me")) return "whatsapp";
    if (domain.includes("jooble")) return "jooble";
    if (domain.includes("jora")) return "jora";
    if (domain.includes("catho")) return "catho";
    if (domain.includes("vagas.com")) return "vagas_com";
    if (domain.includes("infojobs")) return "infojobs";
    if (domain.includes("twitter") || domain.includes("x.com")) return "twitter";
    if (domain.includes("youtube")) return "youtube";
    if (domain.includes("bing")) return "bing";
    if (domain.includes("glassdoor")) return "glassdoor";
    
    return "other";
  } catch {
    return "other";
  }
}

// Medium detection based on source or UTM
function detectMedium(source: string, utmMedium: string | null): string {
  // If UTM medium is provided, use it
  if (utmMedium) return utmMedium;
  
  // Default medium mapping based on source
  const mediumMap: Record<string, string> = {
    linkedin: "social",
    indeed: "job_board",
    google: "organic",
    facebook: "social",
    whatsapp: "social",
    jooble: "job_board",
    jora: "job_board",
    catho: "job_board",
    vagas_com: "job_board",
    infojobs: "job_board",
    glassdoor: "job_board",
    twitter: "social",
    youtube: "social",
    bing: "organic",
    direct: "direct",
    careers_page: "direct",
    hunting: "outbound",
    referral: "referral",
    other: "other",
  };
  
  return mediumMap[source] || "other";
}

// Parse UTM parameters from URL
function parseUTMParams(search: string): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
} {
  const params = new URLSearchParams(search);
  
  return {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
  };
}

// Build tracking data from current page state
function buildTrackingData(): TrackingData {
  const referrer = document.referrer || "";
  const search = window.location.search;
  const landingPage = window.location.pathname;
  
  const utmParams = parseUTMParams(search);
  
  // Determine source: UTM source takes priority, then referrer detection
  let source = utmParams.utmSource || detectSourceFromReferrer(referrer);
  
  // If no referrer and no UTM, it's a direct access or careers page
  if (!referrer && !utmParams.utmSource) {
    source = landingPage.includes("/vagas/") ? "careers_page" : "direct";
  }
  
  const medium = detectMedium(source, utmParams.utmMedium);
  
  return {
    source,
    medium,
    campaign: utmParams.utmCampaign,
    utmSource: utmParams.utmSource,
    utmMedium: utmParams.utmMedium,
    utmCampaign: utmParams.utmCampaign,
    utmTerm: utmParams.utmTerm,
    utmContent: utmParams.utmContent,
    referrerUrl: referrer || null,
    landingPage,
    capturedAt: new Date().toISOString(),
  };
}

// Get stored tracking data (first-touch)
export function getStoredTrackingData(): TrackingData | null {
  try {
    const stored = sessionStorage.getItem(TRACKING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch {
    return null;
  }
}

// Get tracking data - returns stored or builds new one
export function getTrackingData(): TrackingData {
  const stored = getStoredTrackingData();
  if (stored) return stored;
  return buildTrackingData();
}

// Clear stored tracking data (after application submitted)
export function clearTrackingData(): void {
  try {
    sessionStorage.removeItem(TRACKING_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

// Hook to capture tracking data on mount (first-touch attribution)
export function useTrackingCapture(): void {
  useEffect(() => {
    // Only capture if not already stored (first-touch)
    const existing = getStoredTrackingData();
    if (existing) return;
    
    const trackingData = buildTrackingData();
    
    try {
      sessionStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(trackingData));
      console.log("[Tracking] First-touch captured:", trackingData);
    } catch (error) {
      console.error("[Tracking] Failed to store tracking data:", error);
    }
  }, []);
}

// Hook that returns a function to get tracking data for submission
export function useGetTrackingData() {
  return useCallback(() => getTrackingData(), []);
}

// Convert TrackingData to database format
export function trackingDataToDbFormat(data: TrackingData): {
  source: string;
  medium: string;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer_url: string | null;
  landing_page: string;
} {
  return {
    source: data.source,
    medium: data.medium,
    campaign: data.campaign,
    utm_source: data.utmSource,
    utm_medium: data.utmMedium,
    utm_campaign: data.utmCampaign,
    utm_term: data.utmTerm,
    utm_content: data.utmContent,
    referrer_url: data.referrerUrl,
    landing_page: data.landingPage,
  };
}
