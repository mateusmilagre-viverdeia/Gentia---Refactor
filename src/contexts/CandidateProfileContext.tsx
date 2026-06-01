import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from '@/lib/logger';

const log = createLogger('CandidateProfileContext');

interface CandidateProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface CandidateProfileContextType {
  profile: CandidateProfile | null;
  loading: boolean;
  reloadProfile: () => Promise<void>;
}

const CandidateProfileContext = createContext<CandidateProfileContextType | undefined>(undefined);

export const CandidateProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Try to get candidate profile from database
      const { data: candidateProfile } = await supabase
        .from("candidate_profiles")
        .select("id, first_name, last_name, full_name, avatar_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (candidateProfile) {
        // Use first_name/last_name from candidate_profiles if available
        const firstName = (candidateProfile as any).first_name || candidateProfile.full_name?.split(" ")[0] || "";
        const lastName = (candidateProfile as any).last_name || candidateProfile.full_name?.split(" ").slice(1).join(" ") || "";
        
        setProfile({
          id: candidateProfile.id,
          firstName,
          lastName,
          email: session.user.email || "",
          avatarUrl: candidateProfile.avatar_url || undefined,
        });
      } else {
        // Fallback to user metadata
        setProfile({
          firstName: session.user.user_metadata?.first_name || "",
          lastName: session.user.user_metadata?.last_name || "",
          email: session.user.email || "",
        });
      }
    } catch (error) {
      log.error("Error loading candidate profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadProfile();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  return (
    <CandidateProfileContext.Provider value={{ profile, loading, reloadProfile: loadProfile }}>
      {children}
    </CandidateProfileContext.Provider>
  );
};

export const useCandidateProfile = () => {
  const context = useContext(CandidateProfileContext);
  if (context === undefined) {
    throw new Error("useCandidateProfile must be used within a CandidateProfileProvider");
  }
  return context;
};
