import React, { createContext, useContext } from 'react';
import { useBillingStatus, BillingStatusType } from '@/hooks/useBillingStatus';

interface BillingContextType {
  status: BillingStatusType;
  canAccess: boolean;
  daysUntilBlocked: number | null;
  hasGrant: boolean;
  grantExpiresAt: Date | null;
  subscriptionEnd: Date | null;
  graceUntil: Date | null;
  trialEnd: Date | null;
  daysUntilTrialEnd: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const billingStatus = useBillingStatus();

  return (
    <BillingContext.Provider value={billingStatus}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
