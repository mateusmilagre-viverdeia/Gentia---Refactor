import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { AccountMember } from "@/types/account.types";
import { createLogger } from '@/lib/logger';

const log = createLogger('ImpersonationContext');

interface ImpersonatedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ImpersonationContextType {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  impersonatedMembership: AccountMember | null;
  realUserId: string | null;
  startImpersonation: (userId: string, accountId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'impersonation_state';

interface StoredState {
  impersonatedUser: ImpersonatedUser;
  impersonatedMembership: AccountMember;
  logId: string;
}

export const ImpersonationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [impersonatedMembership, setImpersonatedMembership] = useState<AccountMember | null>(null);
  const [logId, setLogId] = useState<string | null>(null);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && user) {
      try {
        const state: StoredState = JSON.parse(stored);
        setImpersonatedUser(state.impersonatedUser);
        setImpersonatedMembership(state.impersonatedMembership);
        setLogId(state.logId);
      } catch (e) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [user]);

  const startImpersonation = useCallback(async (userId: string, accountId: string) => {
    if (!user) return;

    try {
      // Fetch impersonated user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch impersonated user's membership
      const { data: membership, error: membershipError } = await supabase
        .from('account_members')
        .select('*')
        .eq('user_id', userId)
        .eq('account_id', accountId)
        .single();

      if (membershipError) throw membershipError;

      // Log impersonation start
      const { data: logData, error: logError } = await supabase
        .from('impersonation_logs')
        .insert({
          account_id: accountId,
          owner_id: user.id,
          impersonated_user_id: userId,
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single();

      if (logError) throw logError;

      const impersonatedUserData: ImpersonatedUser = {
        id: profile.id,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        email: profile.email || '',
      };

      const impersonatedMembershipData = membership as AccountMember;

      setImpersonatedUser(impersonatedUserData);
      setImpersonatedMembership(impersonatedMembershipData);
      setLogId(logData.id);

      // Store in sessionStorage
      const state: StoredState = {
        impersonatedUser: impersonatedUserData,
        impersonatedMembership: impersonatedMembershipData,
        logId: logData.id,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      log.error('Error starting impersonation:', error);
      throw error;
    }
  }, [user]);

  const stopImpersonation = useCallback(async () => {
    if (logId) {
      try {
        await supabase
          .from('impersonation_logs')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', logId);
      } catch (error) {
        log.error('Error ending impersonation log:', error);
      }
    }

    setImpersonatedUser(null);
    setImpersonatedMembership(null);
    setLogId(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, [logId]);

  // Clear impersonation if user logs out
  useEffect(() => {
    if (!user && impersonatedUser) {
      setImpersonatedUser(null);
      setImpersonatedMembership(null);
      setLogId(null);
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [user, impersonatedUser]);

  return (
    <ImpersonationContext.Provider value={{
      isImpersonating: !!impersonatedUser,
      impersonatedUser,
      impersonatedMembership,
      realUserId: user?.id || null,
      startImpersonation,
      stopImpersonation,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
};
