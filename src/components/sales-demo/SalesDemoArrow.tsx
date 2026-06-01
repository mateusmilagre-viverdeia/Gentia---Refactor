import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  anchorKey?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Renderiza uma seta animada apontando para o elemento que tem
 * `data-demo-anchor="<anchorKey>"`. Se o elemento não existir,
 * não renderiza nada (degradação silenciosa).
 */
export function SalesDemoArrow({ anchorKey }: Props) {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!anchorKey) {
      setRect(null);
      return;
    }

    let raf = 0;
    const update = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-demo-anchor="${anchorKey}"]`,
      );
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    // Aguarda o elemento aparecer (mudanças de rota / lazy)
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    // Tenta novamente algumas vezes em caso de mount tardio
    const retries = [200, 600, 1200, 2400].map((ms) =>
      window.setTimeout(update, ms),
    );

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      retries.forEach((id) => clearTimeout(id));
    };
  }, [anchorKey]);

  if (!rect) return null;

  // Posiciona a seta acima do elemento, centralizada horizontalmente.
  // Reserva ~96px abaixo da barra inferior (80px) para não colidir.
  const arrowSize = 64;
  const targetCenterX = rect.left + rect.width / 2;
  const targetTopY = rect.top;

  // Se elemento estiver muito perto do topo, mostra abaixo
  const showBelow = targetTopY < arrowSize + 16;
  const arrowTop = showBelow
    ? rect.top + rect.height + 8
    : Math.max(8, targetTopY - arrowSize - 8);
  const arrowLeft = Math.max(
    8,
    Math.min(window.innerWidth - arrowSize - 8, targetCenterX - arrowSize / 2),
  );

  return (
    <>
      {/* Outline pulsante no elemento alvo */}
      <motion.div
        className="pointer-events-none fixed z-[9997] rounded-lg ring-2"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          // @ts-expect-error CSS var inline
          "--tw-ring-color": "#D97706",
        }}
        animate={{ opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Seta */}
      <motion.svg
        className="pointer-events-none fixed z-[9998] drop-shadow-lg"
        style={{ top: arrowTop, left: arrowLeft }}
        width={arrowSize}
        height={arrowSize}
        viewBox="0 0 64 64"
        animate={{ y: showBelow ? [0, 6, 0] : [0, -6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="demoArrowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
        {showBelow ? (
          <path
            d="M32 4 L32 44 M32 44 L18 30 M32 44 L46 30"
            stroke="url(#demoArrowGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            transform="rotate(180 32 32)"
          />
        ) : (
          <path
            d="M32 4 L32 56 M32 56 L18 42 M32 56 L46 42"
            stroke="url(#demoArrowGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </motion.svg>
    </>
  );
}
