import { Compass } from "lucide-react";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useSalesDemo } from "./SalesDemoProvider";
import { SalesDemoBottomBar } from "./SalesDemoBottomBar";
import { SalesDemoArrow } from "./SalesDemoArrow";
import { BLOCKS } from "./salesDemoConfig";

export function SalesDemoPanel() {
  const { isDemoActive } = useDemoMode();
  const demo = useSalesDemo();

  if (!isDemoActive || !demo.open) return null;
  if (demo.minimized) return <MinimizedTab />;

  const block = BLOCKS.find((b) => b.id === demo.currentBlock) ?? BLOCKS[0];
  return (
    <>
      <SalesDemoArrow anchorKey={block.anchor} />
      <SalesDemoBottomBar />
    </>
  );
}

function MinimizedTab() {
  const demo = useSalesDemo();
  return (
    <button
      onClick={() => demo.setMinimized(false)}
      className="fixed right-0 top-1/2 z-[9999] flex h-32 w-12 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-l-lg border border-r-0 bg-background shadow-lg hover:bg-muted"
      title="Reabrir Demo Guiada"
    >
      <Compass className="h-5 w-5 text-amber-600" />
      <span className="text-xs font-semibold">B{demo.currentBlock}</span>
    </button>
  );
}
