import { supabase } from '@/integrations/supabase/client';

// LinkedIn Profile Response Types
export interface LinkedInExperience {
  title: string;
  company: string;
  companyUrl?: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
}

export interface LinkedInEducation {
  school: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface LinkedInPost {
  text: string;
  date?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  type?: string;
}

export interface LinkedInProfile {
  fullName: string;
  headline?: string;
  location?: string;
  summary?: string;
  profileUrl: string;
  profilePicture?: string;
  skills: string[];
  experiences: LinkedInExperience[];
  education: LinkedInEducation[];
  certifications?: string[];
  languages?: string[];
  connectionsCount?: number;
  posts: LinkedInPost[];
}

// Instagram Profile Response Types - Extended
export interface InstagramPostExtended {
  id: string;
  shortCode: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
  hashtags?: string[];
}

export interface InstagramProfileExtended {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl?: string;
  recentPosts: InstagramPostExtended[];
  postCaptions: string[];
  hashtagsUsed: string[];
  postFrequency?: string;
}

// Social Analysis Types
export interface InferredDISC {
  d: number;
  i: number;
  s: number;
  c: number;
  primary: string;
  secondary: string | null;
}

export interface SocialAnalysisResult {
  inferred_disc: InferredDISC;
  disc_confidence: number;
  disc_evidence: Array<{
    dimension: string;
    score_contribution: number;
    evidence: string;
  }>;
  tech_fit?: {
    score: number;
    skills_matched: string[];
    skills_missing: string[];
  };
  hunting_priority: number;
  personality_insights: string[];
  communication_style: string;
}

// Legacy Instagram Profile Response Types (backward compatibility)
export interface InstagramProfile {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  externalUrl?: string;
  recentPosts?: InstagramPost[];
}

export interface InstagramPost {
  id: string;
  shortCode: string;
  caption?: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
}

// API Response Types
export interface ApifyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  isPrivate?: boolean;
  cached?: boolean;
}

export interface SocialAnalysisResponse {
  success: boolean;
  data?: SocialAnalysisResult;
  error?: string;
}

export const apifyApi = {
  /**
   * Scrape a LinkedIn profile by URL (includes posts for behavioral analysis)
   * @param url - LinkedIn profile URL (e.g., https://linkedin.com/in/username)
   * @param includePosts - Whether to include recent posts (default: true)
   */
  async scrapeLinkedIn(url: string, includePosts = true): Promise<ApifyResponse<LinkedInProfile>> {
    const { data, error } = await supabase.functions.invoke('apify-linkedin', {
      body: { url, includePosts },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * Scrape an Instagram profile by URL or username (includes posts for behavioral analysis)
   * @param urlOrUsername - Instagram profile URL or username
   * @param maxPosts - Maximum number of posts to retrieve (default: 15)
   */
  async scrapeInstagram(urlOrUsername: string, maxPosts = 15): Promise<ApifyResponse<InstagramProfileExtended>> {
    const { data, error } = await supabase.functions.invoke('apify-instagram', {
      body: { url: urlOrUsername, maxPosts },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * Analyze social profile for behavioral (DISC) and technical fit
   * @param profileData - Scraped profile data
   * @param posts - Array of post texts
   * @param icpProfile - Optional ICP profile for technical fit analysis
   */
  async analyzeSocialProfile(
    profileData: any,
    posts: string[],
    icpProfile?: any
  ): Promise<SocialAnalysisResponse> {
    const { data, error } = await supabase.functions.invoke('analyze-social-profile', {
      body: { 
        profileData, 
        posts, 
        icpProfile,
        analyzeDisc: true,
        analyzeTechFit: !!icpProfile
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  /**
   * Check if a URL is a LinkedIn URL
   */
  isLinkedInUrl(url: string): boolean {
    return url.includes('linkedin.com/in/') || url.includes('linkedin.com/pub/');
  },

  /**
   * Check if a URL is an Instagram URL
   */
  isInstagramUrl(url: string): boolean {
    return url.includes('instagram.com/') || url.includes('instagr.am/');
  },

  /**
   * Extract username from LinkedIn URL
   */
  extractLinkedInUsername(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    return match ? match[1] : null;
  },

  /**
   * Extract username from Instagram URL
   */
  extractInstagramUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([^\/\?]+)/);
    return match ? match[1] : null;
  },
};