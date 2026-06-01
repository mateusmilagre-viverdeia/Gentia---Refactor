import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}

interface EnrollResponse {
  id: string;
  type: string;
  totp: {
    qr_code: string;
    secret: string;
    uri: string;
  };
}

export const useTwoFactor = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [backupCodesCount, setBackupCodesCount] = useState(0);

  // Check MFA status
  const getMfaStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;

      const verifiedFactors = data?.totp?.filter(f => f.status === "verified") || [];
      setFactors(verifiedFactors);
      setIsEnabled(verifiedFactors.length > 0);

      // Get backup codes count
      const { count } = await supabase
        .from("backup_codes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("used_at", null);

      setBackupCodesCount(count || 0);
    } catch (error) {
      console.error("Error checking MFA status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    getMfaStatus();
  }, [getMfaStatus]);

  // Enroll new TOTP factor
  const enrollFactor = async (): Promise<EnrollResponse | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;
      return data as EnrollResponse;
    } catch (error) {
      console.error("Error enrolling factor:", error);
      throw error;
    }
  };

  // Verify TOTP code and activate factor
  const verifyFactor = async (factorId: string, code: string): Promise<boolean> => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      await getMfaStatus();
      return true;
    } catch (error) {
      console.error("Error verifying factor:", error);
      throw error;
    }
  };

  // Verify TOTP code during login
  const verifyMfaLogin = async (code: string): Promise<boolean> => {
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.find(f => f.status === "verified");

      if (!totpFactor) throw new Error("No verified TOTP factor found");

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;
      return true;
    } catch (error) {
      console.error("Error verifying MFA login:", error);
      throw error;
    }
  };

  // Unenroll factor (disable 2FA)
  const unenrollFactor = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactor = data?.totp?.find(f => f.status === "verified");

      if (!totpFactor) return true;

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (error) throw error;

      // Delete all backup codes
      if (user) {
        await supabase
          .from("backup_codes")
          .delete()
          .eq("user_id", user.id);
      }

      await getMfaStatus();
      return true;
    } catch (error) {
      console.error("Error unenrolling factor:", error);
      throw error;
    }
  };

  // Generate backup codes (returns plain text codes)
  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      // Generate random 10-character code in format xxxxx-xxxxx
      const part1 = Math.random().toString(36).substring(2, 7).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 7).toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
  };

  // Simple hash function for backup codes (in production, use bcrypt via edge function)
  const hashCode = async (code: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code.replace("-", "").toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Save backup codes to database
  const saveBackupCodes = async (codes: string[]): Promise<boolean> => {
    if (!user) return false;

    try {
      // Delete existing codes
      await supabase
        .from("backup_codes")
        .delete()
        .eq("user_id", user.id);

      // Hash and save new codes
      const hashedCodes = await Promise.all(
        codes.map(async (code) => ({
          user_id: user.id,
          code_hash: await hashCode(code),
        }))
      );

      const { error } = await supabase
        .from("backup_codes")
        .insert(hashedCodes);

      if (error) throw error;

      setBackupCodesCount(codes.length);
      return true;
    } catch (error) {
      console.error("Error saving backup codes:", error);
      throw error;
    }
  };

  // Verify and use a backup code
  const verifyBackupCode = async (code: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const hashedCode = await hashCode(code);

      // Find unused code
      const { data, error } = await supabase
        .from("backup_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code_hash", hashedCode)
        .is("used_at", null)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      // Mark code as used
      const { error: updateError } = await supabase
        .from("backup_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", data.id);

      if (updateError) throw updateError;

      setBackupCodesCount(prev => prev - 1);
      return true;
    } catch (error) {
      console.error("Error verifying backup code:", error);
      throw error;
    }
  };

  // Check if user needs MFA verification after login
  const checkMfaRequired = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (!data) return false;
      
      // If nextLevel is aal2 but currentLevel is aal1, MFA is required
      return data.nextLevel === "aal2" && data.currentLevel === "aal1";
    } catch (error) {
      console.error("Error checking MFA requirement:", error);
      return false;
    }
  };

  return {
    isEnabled,
    isLoading,
    factors,
    backupCodesCount,
    getMfaStatus,
    enrollFactor,
    verifyFactor,
    verifyMfaLogin,
    unenrollFactor,
    generateBackupCodes,
    saveBackupCodes,
    verifyBackupCode,
    checkMfaRequired,
  };
};
