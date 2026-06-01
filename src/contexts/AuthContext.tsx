import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { createLogger } from "@/lib/logger";
import { PASSWORD_RECOVERY_PATH, hasPasswordRecoveryUrlParams, isPasswordRecoverySession, markPasswordRecoverySession } from "@/lib/passwordRecovery";

const log = createLogger('AuthContext');

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check and accept pending invites
const checkAndAcceptPendingInvite = async (userId: string, email: string | undefined) => {
  if (!email) return;
  
  try {
    // Check if user already has an account
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', userId)
      .single();
    
    // If user already has an account, no need to check for invites
    if (profile?.account_id) return;
    
    // Call edge function to auto-accept pending invite
    const { data, error } = await supabase.functions.invoke('auto-accept-pending-invite', {
      body: { userId, email: email.toLowerCase().trim() }
    });
    
    if (error) {
      log.error('Error auto-accepting invite:', error);
      return;
    }
    
    if (data?.accepted) {
      log.info(`Auto-accepted invite for ${data.companyName}`);
    }
  } catch (error) {
    log.error('Error checking pending invite:', error);
  }
};

// Helper function to verify and fix profile/membership consistency
const verifyProfileConsistency = async (userId: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-profile-consistency', {
      body: { userId }
    });
    
    if (error) {
      log.error('Error verifying profile consistency:', error);
      return;
    }
    
    if (data?.corrected) {
      log.info(`Profile consistency corrected: ${data.correction_type} (old: ${data.old_account_id}, new: ${data.new_account_id})`);
    }
  } catch (error) {
    log.error('Error in verifyProfileConsistency:', error);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inviteCheckDone = useRef<Set<string>>(new Set());
  const consistencyCheckDone = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' || hasPasswordRecoveryUrlParams()) {
          markPasswordRecoverySession();
          if (window.location.pathname !== PASSWORD_RECOVERY_PATH) {
            setTimeout(() => navigate(PASSWORD_RECOVERY_PATH, { replace: true }), 0);
          }
        }

        setSession(session);
        
        // Stabilize user reference - only update if user ID changes
        // This prevents unnecessary re-renders during TOKEN_REFRESHED events
        setUser(prevUser => {
          if (prevUser?.id === session?.user?.id) {
            return prevUser; // Keep same reference
          }
          return session?.user ?? null;
        });
        
        setLoading(false);
        
        // Check for pending invites and profile consistency on sign in or token refresh
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const inviteKey = `${session.user.id}-invite-${event}`;
          const consistencyKey = `${session.user.id}-consistency-${event}`;
          
          // Use setTimeout to avoid Supabase deadlock
          if (!inviteCheckDone.current.has(inviteKey)) {
            inviteCheckDone.current.add(inviteKey);
            setTimeout(() => {
              checkAndAcceptPendingInvite(session.user.id, session.user.email);
            }, 0);
          }
          
          // Verify and fix profile/membership consistency
          if (!consistencyCheckDone.current.has(consistencyKey)) {
            consistencyCheckDone.current.add(consistencyKey);
            setTimeout(() => {
              verifyProfileConsistency(session.user.id);
            }, 50); // Slight delay to run after invite check
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && isPasswordRecoverySession() && window.location.pathname !== PASSWORD_RECOVERY_PATH) {
        navigate(PASSWORD_RECOVERY_PATH, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
