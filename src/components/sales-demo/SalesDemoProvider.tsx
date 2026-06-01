import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/hooks/useAccount";
import { BLOCKS, FIRST_BLOCK_ID, LAST_BLOCK_ID, type PainKey } from "./salesDemoConfig";

interface SalesDemoState {
  open: boolean;
  minimized: boolean;
  currentBlock: number;
  startedAt: number | null;
  // Preenchidos no modal de fechamento
  prospectName: string;
  prospectCompany: string;
  selectedPain: PainKey | null;
  notes: string;
  nextStep: string;
}

interface SalesDemoContextValue extends SalesDemoState {
  openPanel: () => void;
  closePanel: () => void;
  setMinimized: (v: boolean) => void;
  goTo: (block: number) => void;
  next: () => void;
  prev: () => void;
  setSelectedPain: (p: PainKey | null) => void;
  setProspectName: (s: string) => void;
  setProspectCompany: (s: string) => void;
  setNotes: (s: string) => void;
  setNextStep: (s: string) => void;
  reset: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const Ctx = createContext<SalesDemoContextValue | null>(null);

const initial: SalesDemoState = {
  open: false,
  minimized: false,
  currentBlock: FIRST_BLOCK_ID,
  startedAt: null,
  prospectName: "",
  prospectCompany: "",
  selectedPain: null,
  notes: "",
  nextStep: "",
};

const storageKey = (accountId?: string) => `gentia.salesDemo.v2.${accountId ?? "anon"}`;

function clampBlock(id: number) {
  return Math.max(FIRST_BLOCK_ID, Math.min(LAST_BLOCK_ID, id));
}

export function SalesDemoProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAccount();
  const accountId = account?.id;
  const [state, setState] = useState<SalesDemoState>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    try {
      const raw = localStorage.getItem(storageKey(accountId));
      if (raw) setState({ ...initial, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, [accountId]);

  useEffect(() => {
    if (!hydrated || !accountId) return;
    try {
      localStorage.setItem(storageKey(accountId), JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state, hydrated, accountId]);

  const update = useCallback((patch: Partial<SalesDemoState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const value = useMemo<SalesDemoContextValue>(
    () => ({
      ...state,
      isFirst: state.currentBlock === FIRST_BLOCK_ID,
      isLast: state.currentBlock === LAST_BLOCK_ID,
      openPanel: () =>
        setState((s) => ({
          ...s,
          open: true,
          minimized: false,
          startedAt: s.startedAt ?? Date.now(),
          currentBlock: s.currentBlock || FIRST_BLOCK_ID,
        })),
      closePanel: () => update({ open: false }),
      setMinimized: (v) => update({ minimized: v }),
      goTo: (block) => update({ currentBlock: clampBlock(block) }),
      next: () =>
        setState((s) => ({ ...s, currentBlock: clampBlock(s.currentBlock + 1) })),
      prev: () =>
        setState((s) => ({ ...s, currentBlock: clampBlock(s.currentBlock - 1) })),
      setSelectedPain: (p) => update({ selectedPain: p }),
      setProspectName: (v) => update({ prospectName: v }),
      setProspectCompany: (v) => update({ prospectCompany: v }),
      setNotes: (v) => update({ notes: v }),
      setNextStep: (v) => update({ nextStep: v }),
      reset: () => {
        setState(initial);
        if (accountId) localStorage.removeItem(storageKey(accountId));
      },
    }),
    [state, update, accountId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSalesDemo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSalesDemo must be used inside <SalesDemoProvider>");
  return ctx;
}

export { BLOCKS };
