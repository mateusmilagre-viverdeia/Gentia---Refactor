import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { AudienceProvider, useAudience } from "./AudienceContext";
import { CTA_URL, WHATSAPP_URL, EXTERNAL_LINK_PROPS } from "@/lib/lpLinks";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Mic,
  MicOff,
  MessageCircle,
  Calendar,
  ShieldCheck,
  Users,
  Phone,
  PhoneOff,
  Volume2,
  User,
  FileText,
  Brain,
  Building2,
  Radar,
  Bot,
  CalendarCheck,
} from "lucide-react";

export default function LandingPage() {
  return (
    <AudienceProvider>
      <LandingPageContent />
    </AudienceProvider>
  );
}

function LandingPageContent() {
  const { mode } = useAudience();

  const title = mode === "consultoria" 
    ? "Gent.IA — Recrutamento autônomo para consultorias de R&S"
    : "Gent.IA — Recrutamento autônomo para áreas de pessoas B2B";

  const description = mode === "consultoria"
    ? "Sua consultoria entrega 3× mais vagas com o mesmo time. Sourcing ativo, entrevistas por voz com IA, score composto (cultural + DISC + técnico) e shortlist auditável."
    : "Seu RH contrata 3× mais rápido sem aumentar headcount. Sourcing ativo, entrevistas por voz com IA, fit cultural + DISC + técnico e shortlist auditável.";

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href="https://gentia.tech/" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content="https://gentia.tech/" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Gent.IA",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: description,
          })}
        </script>
      </Helmet>

      <Hero />
      <LivePipeline />
      <TwoPillars />
      <ComoOpera />
      <Diferenciais />
      <Principles />
      <FinalCta />

    </>
  );
}


/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden lp-noise">
      <div className="absolute inset-0 lp-grid-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-[1240px] mx-auto px-6 lg:px-10 pt-20 lg:pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="lp-chip lp-chip-dot mb-8">
            ✦ Recrutamento 100% autônomo por IA
          </div>

          <div className="grid lg:grid-cols-[1.3fr,1fr] gap-12 lg:gap-20 items-start">
            <h1 className="lp-display lp-h1">
              O candidato certo já está empregado.
              <br />
              <span className="lp-serif-italic text-[var(--lp-fg)]">
                A GENTIA vai buscá-lo.
              </span>
            </h1>

            <div className="lg:pt-6">
              <p className="text-[17px] leading-[1.55] text-[var(--lp-fg)]/85 max-w-md">
                Da identificação ao candidato qualificado — hunting ativo, abordagem
                personalizada e triagem completa por IA, sem intervenção manual.
              </p>
              <div className="flex flex-wrap gap-2.5 mt-7">
                <span className="lp-metric-pill">80% −TRABALHO MANUAL EM RH</span>
                <span className="lp-metric-pill">58% −TEMPO DE CONTRATAÇÃO</span>
                <span className="lp-metric-pill">53% −ERROS DE CONTRATAÇÃO</span>
              </div>
              <p className="lp-mono mt-3">Médias observadas em operações reais · 2026</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-12">
            <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-primary">
              Agendar demonstração
            </a>
            <a href="#como-funciona" className="lp-btn-ghost">
              Ver como funciona <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


/* ---------- LIVE PIPELINE ---------- */
const PIPELINE_STEPS = [
  { id: 1, label: "Abertura de Vaga", tab: "Abertura de Vaga", time: "09:08", color: "var(--lp-blue)" },
  { id: 2, label: "Pipeline", tab: "Pipeline", time: "09:12", color: "var(--lp-green)" },
  { id: 3, label: "Hunting", tab: "Hunting", time: "09:14", color: "var(--lp-blue)" },
  { id: 4, label: "Triagem", tab: "Triagem", time: "09:46", color: "var(--lp-blue)" },
  { id: 5, label: "Fit Cultural", tab: "Fit Cultural", time: "10:05", color: "var(--lp-blue)" },
  { id: 6, label: "DISC", tab: "DISC", time: "10:15", color: "var(--lp-blue)" },
  { id: 7, label: "Score", tab: "Score", time: "11:20", color: "var(--lp-blue)" },
  { id: 8, label: "Shortlist", tab: "Shortlist", time: "11:28", color: "var(--lp-blue)" },
  { id: 9, label: "Aprovação Final", tab: "Aprovação Final", time: "11:32", color: "var(--lp-amber)" },
];

const MINI_CARDS: Array<{ id: number; label: string; value: React.ReactNode; accent?: string }> = [
  { id: 1, label: "Abertura de vaga · 09:08", value: "Analista Financeiro Pleno · São Paulo · Híbrido" },
  { id: 2, label: "Pipeline · vaga 219", value: "247 → 132 → 52 → 5" },
  { id: 3, label: "Hunting · Apollo + LinkedIn", value: "Mapeei 247 candidatos. Disparo abordagem?" },
  { id: 4, label: "Triagem · 09:46", value: "02:14 · 18 ativos atendidos" },
  { id: 5, label: "Fit Cultural · 10:05", value: "Avaliação cultural por voz · em construção" },
  { id: 6, label: "DISC · 10:15", value: <DiscMini /> },
  { id: 7, label: "Score composto · 11:20", value: "50% Cult · 25% DISC · 25% Téc → 88" },
  { id: 8, label: "Shortlist · 11:28", value: "Carlos 88 · Ana 92" },
  { id: 9, label: "Aprovação Final · 11:32", value: "Consultor valida shortlist e libera entrevista técnica", accent: "var(--lp-amber)" },
];

function LivePipeline() {
  const [active, setActive] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      setActive((a) => (a >= PIPELINE_STEPS.length ? 1 : a + 1));
    }, 3500);
    return () => clearInterval(t);
  }, [autoPlay]);

  const select = useCallback((id: number) => {
    setActive(id);
    setAutoPlay(false);
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => setAutoPlay(true), 8000);
  }, []);

  const activeStep = PIPELINE_STEPS[active - 1] ?? PIPELINE_STEPS[0];
  const progressPct = ((active - 1) / (PIPELINE_STEPS.length - 1)) * 100;

  return (
    <section className="relative -mt-4 pb-24">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <div className="lp-card overflow-hidden">
          {/* Top tabs */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--lp-border)] flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap" role="tablist">
              {PIPELINE_STEPS.map((s) => {
                const isActive = s.id === active;
                return (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => select(s.id)}
                    className="text-[11px] tracking-wider uppercase font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all"
                    style={{
                      borderColor: isActive ? s.color : "var(--lp-border)",
                      background: isActive ? "var(--lp-surface-2)" : "transparent",
                      color: isActive ? "var(--lp-fg)" : "var(--lp-muted)",
                      boxShadow: isActive ? `0 0 0 1px ${s.color}33` : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.tab}
                  </button>
                );
              })}
            </div>
            <span className="lp-pulse-live">ao vivo</span>
          </div>

          {/* Timeline */}
          <div className="px-6 py-8 overflow-x-auto">
            <div className="min-w-[820px] relative">
              <div
                className="absolute left-0 right-0 top-[14px] h-px"
                style={{ background: "var(--lp-border-strong)" }}
              />
              <motion.div
                className="absolute left-0 top-[14px] h-px"
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  background:
                    "linear-gradient(90deg, var(--lp-green), var(--lp-blue) 50%, var(--lp-amber) 85%, var(--lp-green))",
                }}
              />
              <div className="grid grid-cols-9 gap-2">
                {PIPELINE_STEPS.map((s) => {
                  const isActive = s.id === active;
                  const isPast = s.id < active;
                  return (
                    <button
                      key={s.id}
                      onClick={() => select(s.id)}
                      className="flex flex-col items-center text-center group"
                    >
                      <motion.div
                        animate={{ scale: isActive ? 1.18 : 1 }}
                        transition={{ duration: 0.25 }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-mono relative z-10 cursor-pointer"
                        style={{
                          background: isActive || isPast ? s.color : "var(--lp-surface-2)",
                          color: isActive || isPast ? "#0a1020" : "var(--lp-fg)",
                          border: `1px solid ${s.color}`,
                          boxShadow: isActive ? `0 0 18px ${s.color}` : undefined,
                        }}
                      >
                        {s.id}
                      </motion.div>
                      <div
                        className="lp-mono mt-3 transition-colors"
                        style={{ color: isActive ? "var(--lp-fg)" : undefined }}
                      >
                        {s.label}
                      </div>
                      <div className="text-[11px] text-[var(--lp-muted-2)] mt-1 font-mono">
                        {s.time}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Focal panel */}
          <div className="px-6 pb-4">
            <div
              className="lp-card-2 p-6 min-h-[340px] flex items-center justify-center relative overflow-hidden"
              style={{ borderLeft: `2px solid ${activeStep.color}` }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="w-full"
                >
                  <FocalContent stepId={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Mini-cards strip */}
          <div className="px-6 pb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-2">
            {MINI_CARDS.map((c) => {
              const isActive = c.id === active;
              return (
                <button
                  key={c.id}
                  onClick={() => select(c.id)}
                  className="lp-card-2 p-2.5 text-left transition-all"
                  style={{
                    borderLeft: c.accent ? `2px solid ${c.accent}` : undefined,
                    opacity: isActive ? 1 : 0.45,
                    transform: isActive ? "translateY(-2px)" : "none",
                  }}
                >
                  <div className="lp-mono text-[9px] mb-1 truncate">{c.label}</div>
                  <div className="text-[11px] text-[var(--lp-fg)]/85 leading-snug line-clamp-2">
                    {c.value}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer line */}
          <div className="border-t border-[var(--lp-border)] px-6 py-3 lp-mono">
            LGPD · GDPR · EU AI Act · NYC LL144
          </div>
        </div>
      </div>
    </section>
  );
}

function FocalContent({ stepId }: { stepId: number }) {
  switch (stepId) {
    case 1:
      return <JobOpeningMock />;
    case 2:
      return <PipelineKanbanMock />;
    case 3:
      return <HuntingResultsMock />;
    case 4:
      return <VoiceInterviewMock />;
    case 5:
      return <CulturalFitMock />;
    case 6:
      return <DiscProfileMock />;
    case 7:
      return <ScoreCompositeMock />;
    case 8:
      return <ShortlistRankingMock />;
    case 9:
      return <HumanLoopMock />;
    default:
      return null;
  }
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span className="font-mono text-[44px] tabular-nums" style={{ color: "var(--lp-green)" }}>
      {n}
    </span>
  );
}

const VOICE_TURNS: Array<{ speaker: "ai" | "candidate"; text: string }> = [
  { speaker: "ai", text: "Olá Carlos, vou conduzir sua entrevista. Pode começar?" },
  { speaker: "candidate", text: "Claro, pode começar." },
  { speaker: "ai", text: "Conte sobre uma decisão difícil no seu último trabalho." },
];

function Typewriter({ text, speed = 28 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);
  return <span>{shown}</span>;
}

function VoiceInterviewMock() {
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTurn((t) => (t + 1) % VOICE_TURNS.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  const current = VOICE_TURNS[turn];
  const aiActive = current.speaker === "ai";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <div className="lp-mono">Entrevista por voz · 02:14</div>
        <div className="lp-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--lp-green)" }} />
          ao vivo
        </div>
      </div>

      {/* Avatars */}
      <div className="flex items-center justify-center gap-10 mb-4">
        {/* AI orb */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate={aiActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "radial-gradient(circle at 35% 30%, rgba(96,165,250,0.9), rgba(37,99,235,0.6) 55%, rgba(15,23,42,0.9) 100%)",
              boxShadow: aiActive
                ? "0 0 0 4px rgba(59,130,246,0.18), 0 0 40px rgba(59,130,246,0.45)"
                : "0 0 0 2px rgba(255,255,255,0.06)",
            }}
          >
            <Sparkles className="w-7 h-7 text-white/90" />
          </motion.div>
          <div className="text-[11px] text-[var(--lp-fg)]/80">Gent.IA</div>
        </div>

        {/* Waveform */}
        <div className="flex items-end gap-1 h-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scaleY: [0.25, 1, 0.45, 0.85, 0.3] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: (i * 0.05) % 1.1,
                ease: "easeInOut",
              }}
              className="w-1 rounded-full origin-bottom"
              style={{
                height: `${16 + (i % 5) * 6}px`,
                background: aiActive ? "var(--lp-blue)" : "var(--lp-green)",
                opacity: 0.85,
              }}
            />
          ))}
        </div>

        {/* Candidate */}
        <div className="flex flex-col items-center gap-2">
          <motion.div
            animate={!aiActive ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-20 h-20 rounded-full flex items-center justify-center bg-[var(--lp-surface-3)]"
            style={{
              boxShadow: !aiActive
                ? "0 0 0 4px rgba(34,197,94,0.18), 0 0 40px rgba(34,197,94,0.35)"
                : "0 0 0 2px rgba(255,255,255,0.06)",
            }}
          >
            <User className="w-8 h-8 text-[var(--lp-fg)]/80" />
          </motion.div>
          <div className="text-[11px] text-[var(--lp-fg)]/80">Carlos</div>
        </div>
      </div>

      {/* Transcript */}
      <AnimatePresence mode="wait">
        <motion.div
          key={turn}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-md text-center min-h-[44px]"
        >
          <div className="lp-mono text-[10px] mb-1" style={{ color: aiActive ? "var(--lp-blue)" : "var(--lp-green)" }}>
            {aiActive ? "AGENTE" : "CANDIDATO"}
          </div>
          <div className="text-[13px] text-[var(--lp-fg)]/90 leading-snug">
            <Typewriter text={current.text} />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 mt-5">
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--lp-surface-3)] text-[var(--lp-fg)]/80"
          aria-label="microfone"
        >
          {aiActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" style={{ color: "var(--lp-green)" }} />}
        </button>
        <button
          className="w-12 h-12 rounded-full flex items-center justify-center text-white"
          style={{ background: "#ef4444" }}
          aria-label="encerrar"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--lp-surface-3)] text-[var(--lp-fg)]/80"
          aria-label="volume"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AnimatedNumber({ to, duration = 900, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n}{suffix}</>;
}

function DiscProfileMock() {
  const dims = [
    { l: "Dominância", v: 78, t: 70, color: "#ef4444" },
    { l: "Influência", v: 91, t: 70, color: "#f59e0b" },
    { l: "Estabilidade", v: 72, t: 40, color: "#22c55e" },
    { l: "Conformidade", v: 78, t: 50, color: "#3b82f6" },
  ];

  const cx = 90;
  const cy = 90;
  const r = 64;
  const axes = [
    { key: "D", x: cx, y: cy - r, label: "Dominância", lx: cx, ly: cy - r - 6, anchor: "middle" as const },
    { key: "I", x: cx + r, y: cy, label: "Influência", lx: cx + r + 4, ly: cy + 3, anchor: "start" as const },
    { key: "S", x: cx, y: cy + r, label: "Estabilidade", lx: cx, ly: cy + r + 12, anchor: "middle" as const },
    { key: "C", x: cx - r, y: cy, label: "Conformidade", lx: cx - r - 4, ly: cy + 3, anchor: "end" as const },
  ];
  const pt = (axisIdx: number, pct: number) => {
    const a = axes[axisIdx];
    const dx = a.x - cx;
    const dy = a.y - cy;
    return `${cx + dx * pct},${cy + dy * pct}`;
  };
  const target = [0.7, 0.7, 0.4, 0.5].map((p, i) => pt(i, p)).join(" ");
  const candidate = [0.78, 0.91, 0.72, 0.78].map((p, i) => pt(i, p)).join(" ");

  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="lp-mono flex items-center gap-2">
          <Brain className="w-3.5 h-3.5" style={{ color: "var(--lp-blue)" }} />
          PERFIL COMPORTAMENTAL (DISC)
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { t: "INFLUÊNCIA", primary: true },
            { t: "DOMINÂNCIA", primary: false },
            { t: "ALTA", primary: false },
          ].map((chip, i) => (
            <motion.span
              key={chip.t}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.08 }}
              className="text-[9px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                color: chip.primary ? "#fbbf24" : "var(--lp-fg)",
                borderColor: chip.primary ? "rgba(251,191,36,0.45)" : "var(--lp-border)",
                background: chip.primary ? "rgba(251,191,36,0.08)" : "transparent",
              }}
            >
              {chip.t}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="rounded-lg px-3 py-2.5 mb-3" style={{ background: "var(--lp-surface-3)" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[12px] flex items-center gap-1.5 text-[var(--lp-fg)]/90">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--lp-green)" }} />
            Match Score
          </div>
          <div className="lp-mono flex items-center gap-1" style={{ color: "var(--lp-green)" }}>
            <AnimatedNumber to={80} suffix="%" />
            <Check className="w-3 h-3" />
          </div>
        </div>
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "80%" }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: "linear-gradient(90deg, var(--lp-blue), var(--lp-green))" }}
          />
          <div className="absolute inset-y-0" style={{ left: "70%", width: 1, background: "rgba(255,255,255,0.4)" }} />
        </div>
        <div className="lp-mono text-[9px] mt-1 text-[var(--lp-muted-2)]">Nota de corte: 70%</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg p-3" style={{ background: "var(--lp-surface-2)" }}>
          <div className="lp-mono text-[10px] mb-1">Perfil DISC</div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="w-[170px] h-[170px]">
              {[0.33, 0.66, 1].map((p) => (
                <polygon
                  key={p}
                  points={axes.map((_, i) => pt(i, p)).join(" ")}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                />
              ))}
              {axes.map((a) => (
                <line key={a.key} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
              <motion.polygon
                points={target}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={1.2}
                strokeDasharray="4 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              />
              <motion.polygon
                points={candidate}
                fill="var(--lp-blue)"
                stroke="var(--lp-blue)"
                strokeWidth={1.5}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 0.45, scale: 1 }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
                transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
              />
              {axes.map((a) => (
                <text
                  key={a.key}
                  x={a.lx}
                  y={a.ly}
                  textAnchor={a.anchor}
                  fontSize={8}
                  fill="rgba(255,255,255,0.55)"
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                >
                  {a.label}
                </text>
              ))}
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 mt-1 text-[9px] font-mono text-[var(--lp-muted-2)]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: "var(--lp-blue)" }} /> Candidato</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-[2px]" style={{ background: "#f59e0b" }} /> Alvo</span>
          </div>
        </div>

        <div className="rounded-lg p-3" style={{ background: "var(--lp-surface-2)" }}>
          <div className="lp-mono text-[10px] mb-2">Scores por Dimensão</div>
          <div className="space-y-2.5">
            {dims.map((d, i) => (
              <div key={d.l}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1.5 text-[var(--lp-fg)]/90">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                    {d.l}
                  </span>
                  <span className="font-mono">
                    <span className="text-[var(--lp-fg)]"><AnimatedNumber to={d.v} suffix="%" /></span>
                    <span className="text-[var(--lp-muted-2)] text-[9px] ml-1">(alvo: {d.t}%)</span>
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.v}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.12, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: "var(--lp-blue)" }}
                  />
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: 0.6 + i * 0.12 }}
                    className="absolute inset-y-0"
                    style={{ left: `${d.t}%`, width: 1.5, background: "rgba(255,255,255,0.55)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}






function DiscMini() {
  const bars = [
    { l: "D", v: 70 },
    { l: "I", v: 85 },
    { l: "S", v: 45 },
    { l: "C", v: 60 },
  ];
  return (
    <div className="flex items-end gap-1.5 h-10">
      {bars.map((b) => (
        <div key={b.l} className="flex flex-col items-center gap-1">
          <div
            className="w-3 rounded-sm"
            style={{
              height: `${b.v / 2.5}px`,
              background: "var(--lp-blue)",
            }}
          />
          <span className="text-[9px] font-mono text-[var(--lp-muted)]">{b.l}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- TWO PILLARS ---------- */
function TwoPillars() {
  return (
    <section id="como-funciona" className="lp-section py-24">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <Eyebrow>Produto</Eyebrow>
        <h2 className="lp-display lp-h2 mt-4 max-w-4xl">
          Dois pilares.{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            Um ciclo completo.
          </span>
        </h2>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-[var(--lp-muted)]">
          Do candidato passivo ao aprovado — a GENTIA opera de ponta a ponta, sem
          depender de candidatos que “estão procurando”.
        </p>

        <div className="grid lg:grid-cols-2 gap-4 mt-14">
          <PillarCard
            n="Fase 2"
            title="Hunting por IA"
            description="Gente boa está empregada e não aplica para vagas. Nossa IA vai atrás delas — mapeando, qualificando e abordando candidatos passivos com precisão cirúrgica."
            bullets={[
              "Mapeamento automático de candidatos no LinkedIn e bases abertas",
              
              "Abordagem personalizada por IA com fit cultural e técnico",
              "Follow-up automatizado em múltiplos canais",
              "Inscrição simplificada via WhatsApp",
            ]}
            miniStats={[
              { big: "3×", small: "mais candidatos alcançados" },
              { big: "0h", small: "de prospecção manual" },
            ]}
            icon={<Users className="w-5 h-5" />}
          />
          <PillarCard
            n="Fase 3"
            title="Motor de Qualificação"
            description="Três robôs especializados conduzem a triagem completa — cultural, comportamental e técnico — em ciclo contínuo, com devolutiva automática em tempo real."
            bullets={[
              "Robô de fit cultural: perguntas estruturadas baseadas em valores",
              "Robô comportamental: análise de perfil e soft skills",
              "Robô técnico: entrevista adaptativa por nível de senioridade",
              "Devolutiva automática de 0 a 100 para cada candidato",
              "Sensação de etapa única e fluida para o candidato",
            ]}
            miniStats={[
              { big: "100%", small: "IA na triagem" },
              { big: "−53%", small: "erros de contratação" },
            ]}
            icon={<Mic className="w-5 h-5" />}
          />
        </div>
      </div>
    </section>
  );
}

/* ---------- COMO A GENTIA OPERA ---------- */
const ETAPAS = [
  {
    n: "Etapa 01",
    num: "01",
    title: "Setup & Cultura",
    desc: "IA cria os valores da empresa, job description, perguntas de fit e o pitch da vaga baseado no seu método.",
    icon: Sparkles,
    accent: "var(--lp-blue)",
    output: "Job description pronto",
    metric: "2 min",
    mock: "setup" as const,
  },
  {
    n: "Etapa 02",
    num: "02",
    title: "Hunting Ativo",
    desc: "Mapeamento automático, enriquecimento de contato e abordagem personalizada via LinkedIn e e-mail.",
    icon: Radar,
    accent: "var(--lp-green)",
    output: "+120 candidatos",
    metric: "24h",
    mock: "hunting" as const,
  },
  {
    n: "Etapa 03",
    num: "03",
    title: "Triagem por IA",
    desc: "Três robôs conduzem a entrevista completa — cultural, comportamental e técnica — com pontuação automática.",
    icon: Bot,
    accent: "var(--lp-amber)",
    output: "Score 0–100",
    metric: "100% IA",
    mock: "triagem" as const,
  },
  {
    n: "Etapa 04",
    num: "04",
    title: "Entrega Qualificada",
    desc: "Candidatos aprovados agendados automaticamente no Calendly do seu RH para a entrevista final.",
    icon: CalendarCheck,
    accent: "var(--lp-fg)",
    output: "Reunião agendada",
    metric: "1-click",
    mock: "entrega" as const,
  },
];

function StepMock({ kind }: { kind: "setup" | "hunting" | "triagem" | "entrega" }) {
  if (kind === "setup") {
    return (
      <div className="space-y-1.5">
        {["Inovação", "Confiança", "Excelência"].map((v, i) => (
          <div key={v} className="flex items-center gap-2">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${60 + i * 12}%`,
                background: "color-mix(in srgb, var(--accent) 45%, transparent)",
              }}
            />
            <span className="text-[10px] text-[var(--lp-muted-2)]">{v}</span>
          </div>
        ))}
      </div>
    );
  }
  if (kind === "hunting") {
    return (
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-full"
            style={{
              background: i % 3 === 0
                ? "color-mix(in srgb, var(--accent) 70%, transparent)"
                : "rgba(255,255,255,0.06)",
              boxShadow: i % 3 === 0 ? "0 0 8px var(--accent)" : "none",
            }}
            animate={i % 3 === 0 ? { opacity: [0.6, 1, 0.6] } : undefined}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    );
  }
  if (kind === "triagem") {
    return (
      <div className="space-y-2">
        <div className="flex items-end justify-between mb-1">
          <span className="lp-mono text-[9px]">SCORE</span>
          <span className="lp-display text-[20px]" style={{ color: "var(--accent)" }}>87</span>
        </div>
        {[
          { label: "Cultural", v: 92 },
          { label: "DISC", v: 78 },
          { label: "Técnico", v: 84 },
        ].map((b) => (
          <div key={b.label} className="space-y-0.5">
            <div className="flex justify-between text-[9px] text-[var(--lp-muted-2)]">
              <span>{b.label}</span>
              <span>{b.v}</span>
            </div>
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--accent)" }}
                initial={{ width: 0 }}
                whileInView={{ width: `${b.v}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
  // entrega
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 15 }).map((_, i) => {
        const active = i === 8;
        return (
          <motion.div
            key={i}
            className="aspect-square rounded-sm"
            style={{
              background: active
                ? "color-mix(in srgb, var(--accent) 80%, transparent)"
                : "rgba(255,255,255,0.05)",
              boxShadow: active ? "0 0 12px var(--accent)" : "none",
            }}
            animate={active ? { opacity: [0.7, 1, 0.7] } : undefined}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        );
      })}
    </div>
  );
}

function ComoOpera() {
  return (
    <section className="lp-section py-24 relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10 relative">
        <Eyebrow>Fluxo</Eyebrow>
        <h2 className="lp-display lp-h2 mt-4 max-w-4xl">
          Como a GENTIA opera.
        </h2>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-[var(--lp-muted)]">
          Do setup inicial ao candidato aprovado entregue na agenda do seu RH.
        </p>

        {/* Desktop: pipeline horizontal com linha conectora */}
        <div className="hidden lg:block mt-16 relative">
          {/* Linha conectora de fundo */}
          <div className="absolute top-[88px] left-[6%] right-[6%] h-px bg-[var(--lp-border)]" />
          <motion.div
            className="absolute top-[88px] left-[6%] h-px origin-left"
            style={{
              width: "88%",
              background: "linear-gradient(90deg, var(--lp-blue), var(--lp-green), var(--lp-amber), var(--lp-fg))",
            }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.6, ease: [0.2, 0.7, 0.2, 1] }}
          />

          <div className="grid grid-cols-4 gap-5 relative">
            {ETAPAS.map((e, idx) => {
              const Icon = e.icon;
              return (
                <motion.div
                  key={e.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: idx * 0.12 }}
                  className="relative"
                  style={{ ["--accent" as any]: e.accent }}
                >
                  {/* Bolinha sobre a linha */}
                  <div className="flex justify-center mb-6 relative z-10">
                    <motion.div
                      className="w-14 h-14 rounded-full flex items-center justify-center border"
                      style={{
                        background: "var(--lp-bg)",
                        borderColor: "var(--accent)",
                        boxShadow: `0 0 0 4px var(--lp-bg), 0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)`,
                      }}
                      whileHover={{ scale: 1.08 }}
                    >
                      <Icon size={22} style={{ color: "var(--accent)" }} />
                      {e.mock === "hunting" && (
                        <motion.div
                          className="absolute inset-0 rounded-full"
                          style={{ border: "1px solid var(--accent)" }}
                          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  </div>

                  <div
                    className="lp-card p-6 relative overflow-hidden group transition-all duration-300"
                    style={{
                      minHeight: 320,
                    }}
                    onMouseEnter={(ev) => {
                      ev.currentTarget.style.borderColor = e.accent;
                    }}
                    onMouseLeave={(ev) => {
                      ev.currentTarget.style.borderColor = "";
                    }}
                  >
                    {/* Número marca-d'água */}
                    <div
                      className="absolute -top-4 -right-2 lp-display pointer-events-none select-none"
                      style={{
                        fontSize: 110,
                        lineHeight: 1,
                        color: "var(--accent)",
                        opacity: 0.06,
                      }}
                    >
                      {e.num}
                    </div>

                    <div className="lp-mono mb-3" style={{ color: "var(--accent)" }}>
                      {e.n}
                    </div>
                    <h3 className="lp-display text-[22px] mb-3">{e.title}</h3>
                    <p className="text-[13px] text-[var(--lp-muted)] leading-relaxed mb-5">
                      {e.desc}
                    </p>

                    {/* Mini mock */}
                    <div className="mt-auto pt-2 pb-4 border-t border-[var(--lp-border)]">
                      <div className="pt-4">
                        <StepMock kind={e.mock} />
                      </div>
                    </div>

                    {/* Rodapé output + metric */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--lp-border)]">
                      <span className="text-[11px] text-[var(--lp-muted)] truncate">
                        → {e.output}
                      </span>
                      <span
                        className="lp-mono text-[9px] px-2 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        {e.metric}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mobile/Tablet: timeline vertical */}
        <div className="lg:hidden mt-12 relative">
          <div className="absolute left-7 top-2 bottom-2 w-px bg-[var(--lp-border)]" />
          <div className="space-y-5">
            {ETAPAS.map((e, idx) => {
              const Icon = e.icon;
              return (
                <motion.div
                  key={e.n}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: idx * 0.1 }}
                  className="relative pl-20"
                  style={{ ["--accent" as any]: e.accent }}
                >
                  <div
                    className="absolute left-0 top-2 w-14 h-14 rounded-full flex items-center justify-center border"
                    style={{
                      background: "var(--lp-bg)",
                      borderColor: "var(--accent)",
                      boxShadow: `0 0 20px color-mix(in srgb, var(--accent) 35%, transparent)`,
                    }}
                  >
                    <Icon size={22} style={{ color: "var(--accent)" }} />
                  </div>
                  <div className="lp-card p-5 relative overflow-hidden">
                    <div
                      className="absolute -top-3 -right-1 lp-display pointer-events-none select-none"
                      style={{ fontSize: 80, lineHeight: 1, color: "var(--accent)", opacity: 0.07 }}
                    >
                      {e.num}
                    </div>
                    <div className="lp-mono mb-2" style={{ color: "var(--accent)" }}>
                      {e.n}
                    </div>
                    <h3 className="lp-display text-[20px] mb-2">{e.title}</h3>
                    <p className="text-[13px] text-[var(--lp-muted)] leading-relaxed mb-4">
                      {e.desc}
                    </p>
                    <div className="pt-3 border-t border-[var(--lp-border)]">
                      <StepMock kind={e.mock} />
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[var(--lp-border)]">
                      <span className="text-[11px] text-[var(--lp-muted)] truncate">
                        → {e.output}
                      </span>
                      <span
                        className="lp-mono text-[9px] px-2 py-1 rounded-full whitespace-nowrap"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        {e.metric}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarCard({
  n,
  title,
  description,
  bullets,
  miniStats,
  icon,
}: {
  n: string;
  title: string;
  description: string;
  bullets: string[];
  miniStats: { big: string; small: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="lp-card p-7 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <span className="lp-mono">{n}</span>
        <span className="w-9 h-9 rounded-full bg-[var(--lp-surface-2)] flex items-center justify-center text-[var(--lp-muted)]">
          {icon}
        </span>
      </div>
      <h3 className="lp-display text-[28px] mb-4">{title}</h3>
      <p className="text-[14px] text-[var(--lp-muted)] leading-relaxed mb-5">
        {description}
      </p>
      <ul className="space-y-2 mb-6">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[13.5px] text-[var(--lp-fg)]/85 leading-relaxed"
          >
            <span className="text-[var(--lp-green)] mt-0.5 shrink-0">→</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto grid grid-cols-2 gap-3">
        {miniStats.map((s) => (
          <div key={s.big} className="lp-card-2 p-4">
            <div className="lp-display text-[22px] text-[var(--lp-green)]">{s.big}</div>
            <div className="text-[12px] text-[var(--lp-muted)] mt-1">{s.small}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ big, small, mono }: { big: string; small: string; mono?: boolean }) {
  return (
    <div className="lp-card-2 p-4">
      <div className={mono ? "font-mono text-[18px]" : "lp-display text-[24px]"}>
        {big}
      </div>
      <div className="text-[12px] text-[var(--lp-muted)] mt-1">{small}</div>
    </div>
  );
}


/* ---------- PIVOT BANNER ---------- */
function PivotBanner() {
  return (
    <section className="lp-section py-28">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10 text-center">
        <h2 className="lp-display lp-h2 max-w-4xl mx-auto">
          Seis abas, formulários, follow-up manual.{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            Isso acaba aqui.
          </span>
        </h2>
        <p className="mt-6 text-[18px] text-[var(--lp-muted)]">
          O recrutamento voltou a ser recrutamento.
        </p>
        <div className="mt-8">
          <a href="/sobre" className="lp-btn-ghost">
            Ler manifesto <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- MARKET CATEGORIES ---------- */
function Diferenciais() {
  const items = [
    {
      t: "Candidato passivo primeiro",
      d: "Enquanto todos disputam os 10% que estão procurando emprego, a GENTIA acessa os outros 90% — os melhores, que estão empregados.",
    },
    {
      t: "Triagem 100% autônoma",
      d: "Nenhuma intervenção humana na qualificação. Três robôs especializados conduzem entrevistas completas e entregam score objetivo.",
    },
    {
      t: "Experiência candidato superior",
      d: "Processo fluido via WhatsApp. Devolutiva em tempo real. O candidato sente que está em uma conversa, não em uma triagem.",
    },
    {
      t: "Fit técnico adaptativo",
      d: "O robô técnico molda as perguntas em tempo real com base no nível de senioridade do candidato — sem roteiro fixo.",
    },
    {
      t: "ROI mensurável",
      d: "Métricas claras de redução de tempo, custo por contratação e qualidade de shortlist — não promessas, números reais.",
    },
    {
      t: "Pay-per-use sem mensalidade",
      d: "Pague por entrevista realizada ou lead aprovado. Sem contratos longos, sem risco. Você só paga pelo que usa.",
    },
  ];
  return (
    <section className="lp-section py-24">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <Eyebrow>Diferenciais</Eyebrow>
        <h2 className="lp-display lp-h2 mt-4 max-w-4xl">
          Por que a GENTIA é diferente.
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-12">
          {items.map((i) => (
            <div key={i.t} className="lp-card p-6">
              <h3 className="lp-display text-[20px] mb-3">{i.t}</h3>
              <p className="text-[13.5px] text-[var(--lp-muted)] leading-relaxed">
                {i.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ---------- PRINCIPLES ---------- */
function Principles() {
  const items = [
    { icon: <Users className="w-4 h-4" />, t: "Humano decide", d: "Quem contrata é gente. A IA evidencia, sugere, explica. Nunca decide sozinha." },
    { icon: <FileText className="w-4 h-4" />, t: "Evidência sempre", d: "Cada decisão tem justificativa textual e pode ser auditada. Sem caixa-preta. Sem score solto." },
    { icon: <ShieldCheck className="w-4 h-4" />, t: "Privacidade por padrão", d: "LGPD por design. Dados de candidatos isolados por ambiente. Multi-tenant real." },
    { icon: <Brain className="w-4 h-4" />, t: "Anti-viés em cada etapa", d: "Sourcing, descrição de vaga e perguntas passam pelo mesmo guardrail de equidade — não auditamos depois, prevenimos no momento da decisão." },
    { icon: <Sparkles className="w-4 h-4" />, t: "Inteligência sobre o software existente", d: "Não recriamos ATS, folha ou performance review. Adicionamos o agente que falta — onde seu time já trabalha." },

  ];
  return (
    <section className="lp-section py-24">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <Eyebrow>05 · Princípios</Eyebrow>
        <h2 className="lp-display lp-h2 mt-4 max-w-4xl">
          Como a Gent.IA opera.{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            Cinco compromissos não-negociáveis.
          </span>
        </h2>
        <p className="mt-6 max-w-2xl text-[var(--lp-muted)]">
          Recrutamento autônomo só funciona com freios. Estes são os nossos.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-12">
          {items.map((i) => (
            <div key={i.t} className="lp-card p-6">
              <div className="w-9 h-9 rounded-full bg-[var(--lp-surface-2)] flex items-center justify-center mb-4 text-[var(--lp-blue)]">
                {i.icon}
              </div>
              <h3 className="lp-display text-[20px] mb-2">{i.t}</h3>
              <p className="text-[13.5px] text-[var(--lp-muted)] leading-relaxed">
                {i.d}
              </p>
            </div>
          ))}
        </div>
        <div className="lp-mono mt-8 text-center">
          LGPD · EU AI Act · NYC LL144 · Anti-viés por design
        </div>
      </div>
    </section>
  );
}


/* ---------- FINAL CTA ---------- */
function FinalCta() {
  return (
    <section id="contato" className="lp-section py-28">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
        <Eyebrow>Comece agora</Eyebrow>
        <h2 className="lp-display lp-h2 mt-4 max-w-4xl">
          Pronto para parar de esperar candidatos aparecerem?
        </h2>
        <p className="mt-6 max-w-2xl text-[16px] text-[var(--lp-muted)] leading-relaxed">
          Agende uma demonstração e veja a GENTIA operando em uma vaga real da sua
          empresa.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-primary">
            Agendar demo <ArrowRight className="w-4 h-4" />
          </a>
          <a href={WHATSAPP_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-ghost">
            Falar no WhatsApp
          </a>
        </div>
        <p className="lp-mono mt-4">
          Sem compromisso. Demo de 30 minutos com uma vaga real sua.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 mt-12 max-w-2xl">
          <div className="lp-card p-5">
            <div className="lp-mono mb-2">resposta</div>
            <div className="text-[15px]">em 24h úteis</div>
          </div>
          <div className="lp-card p-5">
            <div className="lp-mono mb-2">demonstração</div>
            <div className="text-[15px]">30 min · vaga real</div>
          </div>
          <div className="lp-card p-5">
            <div className="lp-mono mb-2">ciclo</div>
            <div className="text-[15px]">aceitando vagas para junho</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- shared ---------- */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="lp-mono">{children}</div>;
}

/* ---------- Pipeline Kanban Mock (step 1) ---------- */
const KANBAN_STAGES = [
  { key: "candidatura", label: "Candidatura", count: 8, color: "var(--lp-surface-3)", text: "var(--lp-fg)" },
  { key: "cultural", label: "Fit Cultural", count: 8, color: "var(--lp-blue)", text: "#fff" },
  { key: "disc", label: "DISC", count: 6, color: "color-mix(in srgb, var(--lp-blue) 75%, #000)", text: "#fff" },
  { key: "tecnico", label: "Técnico", count: 5, color: "color-mix(in srgb, var(--lp-blue) 60%, #fff 0%)", text: "#fff" },
  { key: "aprovados", label: "Aprovados", count: 4, color: "var(--lp-green)", text: "#fff" },
];

type KCand = { initials: string; name: string; score?: number; sub?: string };

const ATIVOS: Record<string, KCand[]> = {
  cultural: [
    { initials: "C", name: "Candidato", score: 50 },
    { initials: "DD", name: "Daniele D'Angelo" },
  ],
  disc: [{ initials: "CM", name: "Camila Moreira" }],
  tecnico: [{ initials: "CG", name: "Cintia Gomes", score: 82 }],
  aprovados: [
    { initials: "JF", name: "Janaíni F.", score: 85 },
    { initials: "RA", name: "Robert Araújo", score: 89 },
    { initials: "BA", name: "Bianca A.", score: 86 },
    { initials: "JD", name: "José Diovano", score: 83 },
  ],
};

const PERDIDOS: Record<string, KCand[]> = {
  cultural: [
    { initials: "GS", name: "Guilherme Souza", score: 0, sub: "SAIU EM FIT CULTURAL" },
    { initials: "LA", name: "Letícia Amaral", score: 47, sub: "SAIU EM FIT CULTURAL" },
    { initials: "LG", name: "Laura Gomes", score: 0, sub: "SAIU EM FIT CULTURAL" },
    { initials: "RB", name: "Rodrigo Brito", score: 42, sub: "SAIU EM FIT CULTURAL" },
  ],
  disc: [{ initials: "GZ", name: "Giulia Zaneti", score: 85, sub: "SAIU EM DISC" }],
  tecnico: [
    { initials: "BB", name: "Beatriz Baptista", score: 77, sub: "SAIU EM TÉCNICO" },
    { initials: "RC", name: "Rita Cardoso", score: 74, sub: "SAIU EM TÉCNICO" },
  ],
  aprovados: [],
};

const JOB_RESP_OPTIONS = [
  "Análise e modelagem financeira",
  "Planejamento orçamentário (FP&A)",
  "Gestão de fluxo de caixa",
  "Conciliação contábil e fechamento",
  "Análise de crédito e risco",
  "Elaboração de relatórios gerenciais",
];
const JOB_RESP_SELECTED = [0, 1, 4];

function JobOpeningMock() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const durations = [1400, 1600, 1400];
    const t = setTimeout(() => setPhase((p) => (p + 1) % 3), durations[phase]);
    return () => clearTimeout(t);
  }, [phase]);

  const showUserMsg = phase >= 0;
  const showChips = phase >= 1;
  const showSummary = phase >= 2;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: Nara chat */}
      <div
        className="rounded-lg p-4 flex flex-col gap-2.5"
        style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--lp-border)]">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono"
            style={{ background: "var(--lp-blue)", color: "#0a1020" }}
          >
            OI
          </div>
          <div className="text-[13px] text-[var(--lp-fg)]">Nara</div>
          <span className="ml-auto lp-mono text-[9px] text-[var(--lp-muted-2)]">assistente</span>
        </div>

        <div className="text-[11px] text-[var(--lp-fg)]/85 leading-snug">
          Olá! Sou a Nara, sua assistente de recrutamento.
        </div>
        <div className="text-[11px] text-[var(--lp-fg)]/70 leading-snug">
          Me conte sobre a vaga (cargo, área, descrição).
        </div>

        <AnimatePresence>
          {showUserMsg && (
            <motion.div
              key="user"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="self-end max-w-[85%] px-3 py-1.5 rounded-lg text-[11px]"
              style={{ background: "var(--lp-fg)", color: "#0a1020" }}
            >
              analista financeiro pleno, São Paulo, híbrido
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChips && (
            <motion.div
              key="chips"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-1"
            >
              <div className="text-[11px] text-[var(--lp-fg)]/70 mb-2 leading-snug">
                Quais as principais responsabilidades?
              </div>
              <div className="flex flex-wrap gap-1.5">
                {JOB_RESP_OPTIONS.map((opt, i) => {
                  const selected = JOB_RESP_SELECTED.includes(i);
                  return (
                    <motion.span
                      key={opt}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.25 }}
                      className="text-[10px] px-2 py-1 rounded-md border flex items-center gap-1"
                      style={{
                        borderColor: selected ? "var(--lp-blue)" : "var(--lp-border)",
                        background: selected
                          ? "color-mix(in oklab, var(--lp-blue) 14%, transparent)"
                          : "transparent",
                        color: "var(--lp-fg)",
                      }}
                    >
                      {selected && <span style={{ color: "var(--lp-blue)" }}>✓</span>}
                      {opt}
                    </motion.span>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Configuration panel */}
      <div
        className="rounded-lg p-4 flex flex-col gap-3"
        style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
      >
        <div className="flex items-center justify-between pb-2 border-b border-[var(--lp-border)]">
          <div className="text-[12px] text-[var(--lp-fg)]">Configuração da vaga</div>
          <motion.span
            animate={{ opacity: showSummary ? [0.6, 1, 0.6] : 0.6 }}
            transition={{ duration: 1.2, repeat: showSummary ? Infinity : 0 }}
            className="lp-mono text-[9px] text-[var(--lp-muted-2)]"
          >
            1 de 6 seções
          </motion.span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--lp-blue)" }}
          />
          <span className="text-[11px] text-[var(--lp-fg)]/85">Contexto da vaga</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-[15px] text-[var(--lp-fg)] font-serif"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Analista Financeiro Pleno
        </motion.div>

        <div className="flex flex-wrap gap-1.5">
          {["Financeiro", "São Paulo · Híbrido", "Português"].map((tag, i) => (
            <motion.span
              key={tag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.25 }}
              className="text-[10px] px-2 py-0.5 rounded-md border"
              style={{
                borderColor: "var(--lp-border)",
                color: "var(--lp-fg)/85",
              }}
            >
              {tag}
            </motion.span>
          ))}
        </div>

        <div>
          <div className="lp-mono text-[9px] text-[var(--lp-muted-2)] mb-1.5">
            RESPONSABILIDADES
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[28px]">
            <AnimatePresence>
              {showChips &&
                JOB_RESP_SELECTED.map((idx, i) => (
                  <motion.span
                    key={JOB_RESP_OPTIONS[idx]}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.25 }}
                    className="text-[10px] px-2 py-1 rounded-md"
                    style={{
                      background: "color-mix(in oklab, var(--lp-blue) 18%, transparent)",
                      color: "var(--lp-fg)",
                      border: "1px solid color-mix(in oklab, var(--lp-blue) 40%, transparent)",
                    }}
                  >
                    {JOB_RESP_OPTIONS[idx]}
                  </motion.span>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineKanbanMock() {
  const [view, setView] = useState<"ativos" | "perdidos">("ativos");

  useEffect(() => {
    const id = window.setInterval(() => {
      setView((v) => (v === "ativos" ? "perdidos" : "ativos"));
    }, 3800);
    return () => window.clearInterval(id);
  }, []);

  const data = view === "ativos" ? ATIVOS : PERDIDOS;
  const cols = ["cultural", "disc", "tecnico", "aprovados"] as const;
  const totalAtivos = 8;
  const totalPerdidos = 12;

  return (
    <div className="w-full">
      {/* Header chips */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <Chip>👥 20 candidatos</Chip>
        <Chip tone="green">✓ 20% conversão</Chip>
        <Chip tone="red">↘ 12 perdidos</Chip>
        <Chip tone="amber">⚠ Gargalo: DISC</Chip>
      </div>

      {/* Funnel bars */}
      <div className="flex items-stretch gap-1 mb-3">
        {KANBAN_STAGES.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, scaleX: 0.2 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: "easeOut" }}
            style={{ background: s.color, color: s.text, transformOrigin: "left" }}
            className="flex-1 rounded-sm px-2 py-1.5 text-[10px] font-medium flex items-center justify-between min-w-0"
          >
            <span className="truncate">{s.label}</span>
            <span className="ml-1 bg-black/25 rounded px-1 text-[9px] tabular-nums">{s.count}</span>
          </motion.div>
        ))}
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={() => setView("ativos")}
          className="text-[10px] px-2 py-1 rounded-md transition-all"
          style={{
            background: view === "ativos" ? "#000" : "transparent",
            color: view === "ativos" ? "#fff" : "var(--lp-muted-2)",
            border: "1px solid " + (view === "ativos" ? "#000" : "var(--lp-border)"),
          }}
        >
          👥 Ativos ({totalAtivos})
        </button>
        <button
          onClick={() => setView("perdidos")}
          className="text-[10px] px-2 py-1 rounded-md transition-all"
          style={{
            background: view === "perdidos" ? "rgba(239,68,68,.12)" : "transparent",
            color: view === "perdidos" ? "#ef4444" : "var(--lp-muted-2)",
            border: "1px solid " + (view === "perdidos" ? "#ef4444" : "var(--lp-border)"),
          }}
        >
          ✕ Perdidos ({totalPerdidos})
        </button>
      </div>

      {/* Kanban columns */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-4 gap-1.5"
        >
          {cols.map((colKey) => {
            const stage = KANBAN_STAGES.find((s) => s.key === colKey)!;
            const items = data[colKey] || [];
            return (
              <div
                key={colKey}
                className="rounded-md p-1.5 min-h-[140px]"
                style={{ background: "color-mix(in srgb, var(--lp-surface-3) 60%, transparent)" }}
              >
                <div className="flex items-center justify-between text-[9px] mb-1.5 px-0.5">
                  <span className="flex items-center gap-1 truncate" style={{ color: "var(--lp-fg)" }}>
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: stage.color }}
                    />
                    {stage.label}
                  </span>
                  <span className="text-[var(--lp-muted-2)] tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.length === 0 ? (
                    <div className="text-[9px] text-[var(--lp-muted-2)] text-center py-3 italic">
                      Nenhum perdido
                    </div>
                  ) : (
                    items.map((c, i) => (
                      <motion.div
                        key={c.name}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.25 }}
                        className="rounded px-1.5 py-1"
                        style={{
                          background:
                            view === "perdidos"
                              ? "rgba(239,68,68,.06)"
                              : "var(--lp-surface-3)",
                          border:
                            view === "perdidos"
                              ? "1px solid rgba(239,68,68,.35)"
                              : "1px solid var(--lp-border)",
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
                            style={{ background: "var(--lp-surface-2)", color: "var(--lp-fg)" }}
                          >
                            {c.initials}
                          </div>
                          <div className="text-[9px] truncate flex-1" style={{ color: "var(--lp-fg)" }}>
                            {c.name}
                          </div>
                          {typeof c.score === "number" && (
                            <span
                              className="text-[8px] tabular-nums font-medium"
                              style={{
                                color:
                                  c.score >= 80
                                    ? "var(--lp-green)"
                                    : c.score >= 50
                                    ? "#f59e0b"
                                    : "#ef4444",
                              }}
                            >
                              {c.score}%
                            </span>
                          )}
                        </div>
                        {c.sub && (
                          <div className="text-[7px] mt-0.5 font-semibold" style={{ color: "#ef4444" }}>
                            {c.sub}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "red" | "amber";
}) {
  const styles: Record<string, { bg: string; color: string }> = {
    neutral: { bg: "var(--lp-surface-3)", color: "var(--lp-fg)" },
    green: { bg: "rgba(34,197,94,.12)", color: "var(--lp-green)" },
    red: { bg: "rgba(239,68,68,.12)", color: "#ef4444" },
    amber: { bg: "rgba(245,158,11,.12)", color: "#f59e0b" },
  };
  const s = styles[tone];
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-md font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {children}
    </span>
  );
}

/* ---------- Shortlist Ranking Mock (step 7) ---------- */
type ShortlistCand = {
  rank: number;
  medal: string;
  initials: string;
  name: string;
  overall: number;
  cultural: number;
  disc: number;
  tecnico: number | null;
  tags: string[];
  summary: string;
};

const SHORTLIST_CANDS: ShortlistCand[] = [
  {
    rank: 1,
    medal: "🥇",
    initials: "RA",
    name: "Robert Araújo",
    overall: 89,
    cultural: 93.7,
    disc: 88,
    tecnico: 81,
    tags: ["FIT CULTURAL FORTE", "DISC ALINHADO", "TÉCNICO EXCELENTE"],
    summary: "Melhor candidato: score geral alto e perfil DISC forte.",
  },
  {
    rank: 2,
    medal: "🥈",
    initials: "BA",
    name: "Bianca Annunziato",
    overall: 86,
    cultural: 92.4,
    disc: 71,
    tecnico: 88.5,
    tags: ["FIT CULTURAL FORTE", "TÉCNICO EXCELENTE"],
    summary: "Forte aderência cultural e excelente competência técnica.",
  },
  {
    rank: 3,
    medal: "🥉",
    initials: "GZ",
    name: "Giulia Zaneti",
    overall: 85,
    cultural: 93.4,
    disc: 69,
    tecnico: null,
    tags: ["FIT CULTURAL FORTE"],
    summary: "Alinhamento cultural excepcional, ideal p/ posições fit-first.",
  },
];

function ShortlistRankingMock() {
  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🏆</span>
          <span className="text-[12px] font-semibold" style={{ color: "var(--lp-fg)" }}>
            Shortlist IA
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-medium tabular-nums"
            style={{ background: "var(--lp-surface-3)", color: "var(--lp-muted-2)" }}
          >
            17/17 CANDIDATOS
          </span>
        </div>
        <span
          className="text-[9px] px-2 py-1 rounded-md font-medium flex items-center gap-1"
          style={{ background: "#000", color: "#fff" }}
        >
          📄 Gerar Relatório
        </span>
      </motion.div>

      {/* Cards */}
      <div className="space-y-1.5">
        {SHORTLIST_CANDS.map((c, i) => (
          <ShortlistCard key={c.rank} cand={c} index={i} />
        ))}
      </div>
    </div>
  );
}

function ShortlistCard({ cand, index }: { cand: ShortlistCand; index: number }) {
  const isTop = cand.rank === 1;
  const baseDelay = index * 0.22;
  const bars: { label: string; weight: string; value: number | null; color: string }[] = [
    { label: "Cultural", weight: "50%", value: cand.cultural, color: "var(--lp-blue)" },
    {
      label: "DISC",
      weight: "25%",
      value: cand.disc,
      color: "color-mix(in srgb, var(--lp-blue) 60%, #000)",
    },
    { label: "Técnico", weight: "25%", value: cand.tecnico, color: "var(--lp-green)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay, duration: 0.4 }}
      className="rounded-md px-2.5 py-2 flex gap-2.5"
      style={{
        background: isTop
          ? "color-mix(in srgb, var(--lp-amber) 8%, var(--lp-surface-3))"
          : "var(--lp-surface-3)",
        border: isTop
          ? "1px solid var(--lp-amber)"
          : "1px solid var(--lp-border)",
      }}
    >
      {/* Left: medal + overall */}
      <div className="flex flex-col items-center justify-center min-w-[42px]">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: baseDelay + 0.1, type: "spring", stiffness: 200, damping: 12 }}
          className="text-[16px] leading-none"
        >
          {cand.medal}
        </motion.span>
        <span
          className="text-[13px] font-bold tabular-nums mt-0.5"
          style={{ color: "var(--lp-green)" }}
        >
          {cand.overall}%
        </span>
      </div>

      {/* Right: details */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
            style={{ background: "var(--lp-surface-2)", color: "var(--lp-fg)" }}
          >
            {cand.initials}
          </div>
          <span className="text-[10px] font-semibold truncate" style={{ color: "var(--lp-fg)" }}>
            {cand.name}
          </span>
          <Check className="w-2.5 h-2.5" style={{ color: "var(--lp-green)" }} strokeWidth={3} />
        </div>

        {/* Bars */}
        <div className="space-y-1">
          {bars.map((b, bi) => (
            <div key={b.label} className="flex items-center gap-1.5">
              <span
                className="text-[8px] w-12 shrink-0"
                style={{ color: "var(--lp-muted-2)" }}
              >
                {b.label}{" "}
                <span className="opacity-60">({b.weight})</span>
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "var(--lp-surface-2)" }}
              >
                {b.value !== null && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${b.value}%` }}
                    transition={{ delay: baseDelay + 0.25 + bi * 0.1, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: b.color }}
                  />
                )}
              </div>
              <span
                className="text-[8px] tabular-nums w-10 text-right shrink-0"
                style={{ color: b.value === null ? "var(--lp-muted-2)" : "var(--lp-fg)" }}
              >
                {b.value === null ? "—" : `${b.value}%`}
              </span>
            </div>
          ))}
        </div>

        {/* Tags */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.7, duration: 0.3 }}
          className="flex flex-wrap gap-1 mt-1.5"
        >
          {cand.tags.map((t) => (
            <span
              key={t}
              className="text-[7px] px-1 py-0.5 rounded font-medium"
              style={{
                background: "var(--lp-surface-2)",
                color: "var(--lp-fg)",
              }}
            >
              <span style={{ color: "var(--lp-amber)" }}>✦</span> {t}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ---------- Hunting Results Mock (step 2) ---------- */
type HuntCand = {
  initials: string;
  name: string;
  location: string;
  role: string;
  match: number;
  bars: { label: string; value: number; color: string }[];
  tags: string[];
  extraTags: number;
};

const HUNT_CANDS: HuntCand[] = [
  {
    initials: "AP",
    name: "Amanda Pczbiowski",
    location: "São Paulo, SP",
    role: "Revenue & Strategic Partnerships @ Vixtra",
    match: 70,
    bars: [
      { label: "Obrigatórios", value: 50, color: "var(--lp-blue)" },
      { label: "Desejáveis", value: 50, color: "color-mix(in srgb, var(--lp-blue) 60%, #000)" },
      { label: "Local", value: 100, color: "var(--lp-green)" },
    ],
    tags: ["PARCERIAS", "REVENUE", "GO-TO-MARKET"],
    extraTags: 12,
  },
  {
    initials: "PR",
    name: "Pedro Rômulo",
    location: "Osasco, SP",
    role: "SDR @ Kamino",
    match: 62,
    bars: [
      { label: "Obrigatórios", value: 50, color: "var(--lp-blue)" },
      { label: "Desejáveis", value: 50, color: "color-mix(in srgb, var(--lp-blue) 60%, #000)" },
      { label: "Local", value: 80, color: "var(--lp-green)" },
    ],
    tags: ["VENDAS", "HUBSPOT", "SLACK"],
    extraTags: 12,
  },
];

function HuntingResultsMock() {
  return (
    <div className="w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[14px]">🎯</span>
          <span className="text-[12px] font-semibold truncate" style={{ color: "var(--lp-fg)" }}>
            Hunting · Sales Development Rep.
          </span>
        </div>
        <span
          className="text-[9px] px-2 py-1 rounded-md font-medium tabular-nums shrink-0"
          style={{ background: "var(--lp-surface-3)", color: "var(--lp-muted-2)" }}
        >
          <SmallCountUp to={38} /> resultados · <span style={{ color: "var(--lp-green)" }}>10 ✓</span>
        </span>
      </motion.div>

      {/* Cards */}
      <div className="space-y-2">
        {HUNT_CANDS.map((c, i) => (
          <HuntingCard key={c.name} cand={c} index={i} />
        ))}
      </div>
    </div>
  );
}

function HuntingCard({ cand, index }: { cand: HuntCand; index: number }) {
  const baseDelay = index * 0.28;
  const matchColor =
    cand.match >= 70 ? "var(--lp-green)" : cand.match >= 50 ? "var(--lp-amber)" : "var(--lp-muted-2)";
  const matchBg =
    cand.match >= 70
      ? "rgba(34,197,94,.15)"
      : cand.match >= 50
      ? "rgba(245,158,11,.15)"
      : "var(--lp-surface-3)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: baseDelay, duration: 0.4 }}
      className="rounded-md px-2.5 py-2"
      style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
    >
      {/* Top row: chips */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <span
          className="text-[8px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"
          style={{ background: "rgba(10,102,194,.15)", color: "#3b82f6" }}
        >
          in LINKEDIN
        </span>
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: baseDelay + 0.15, type: "spring", stiffness: 250, damping: 14 }}
          className="text-[9px] px-1.5 py-0.5 rounded font-bold tabular-nums"
          style={{ background: matchBg, color: matchColor }}
        >
          {cand.match}% MATCH
        </motion.span>
        <span className="text-[8px] text-[var(--lp-muted-2)] flex items-center gap-0.5">
          ✓ NOVO
        </span>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-1.5 mb-0.5">
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
          style={{ background: "var(--lp-surface-2)", color: "var(--lp-fg)" }}
        >
          {cand.initials}
        </div>
        <span className="text-[10px] font-semibold truncate" style={{ color: "var(--lp-fg)" }}>
          {cand.name}
        </span>
        <span className="text-[8px] text-[var(--lp-muted-2)] truncate">
          · 📍 {cand.location}
        </span>
      </div>
      <div className="text-[9px] mb-1.5 truncate" style={{ color: "var(--lp-muted-2)" }}>
        {cand.role}
      </div>

      {/* 3 sub-bars */}
      <div className="grid grid-cols-3 gap-1.5 mb-1.5">
        {cand.bars.map((b, bi) => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px]" style={{ color: "var(--lp-muted-2)" }}>
                {b.label}
              </span>
              <span className="text-[7px] tabular-nums font-semibold" style={{ color: "var(--lp-fg)" }}>
                {b.value}%
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: "var(--lp-surface-2)" }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${b.value}%` }}
                transition={{ delay: baseDelay + 0.3 + bi * 0.1, duration: 0.7, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Skill tags */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay + 0.7, duration: 0.3 }}
        className="flex flex-wrap gap-1"
      >
        {cand.tags.map((t) => (
          <span
            key={t}
            className="text-[7px] px-1 py-0.5 rounded font-medium"
            style={{ background: "var(--lp-surface-2)", color: "var(--lp-fg)" }}
          >
            {t}
          </span>
        ))}
        <span
          className="text-[7px] px-1 py-0.5 rounded font-medium"
          style={{ background: "var(--lp-surface-2)", color: "var(--lp-muted-2)" }}
        >
          +{cand.extraTags}
        </span>
      </motion.div>
    </motion.div>
  );
}




function SmallCountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(p * to));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className="tabular-nums">{n}</span>;
}

// ===================== Score Composite Mock (case 6) =====================

const SCORE_STEPS = [
  { key: "cultural", label: "Análise Cultural", icon: "🧠", score: 92, tone: "var(--lp-green)" },
  { key: "disc", label: "Fit Comportamental", icon: "◎", score: 79, tone: "var(--lp-blue)" },
  { key: "tech", label: "Fit Técnico", icon: "</>", score: 77, tone: "var(--lp-green)" },
  { key: "final", label: "Score Composto", icon: "✦", score: 86, tone: "var(--lp-green)" },
] as const;

function ScoreCompositeMock() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const dur = step === 3 ? 2400 : 1700;
    const t = setTimeout(() => setStep((s) => (s + 1) % 4), dur);
    return () => clearTimeout(t);
  }, [step]);

  const current = SCORE_STEPS[step];

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-2.5 pb-2.5 border-b"
        style={{ borderColor: "var(--lp-border)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: "var(--lp-surface-3)", color: "var(--lp-fg)" }}
          >
            JS
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold truncate" style={{ color: "var(--lp-fg)" }}>
              Janaini F. Santos
            </div>
            <div className="text-[9px] truncate" style={{ color: "var(--lp-muted-2)" }}>
              Analista de RH · Mauá
            </div>
          </div>
        </div>
        <motion.span
          key={`chip-${step}`}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="text-[10px] px-2 py-1 rounded-full font-semibold tabular-nums shrink-0"
          style={{
            background: `color-mix(in srgb, ${current.tone} 18%, transparent)`,
            color: current.tone,
            border: `1px solid color-mix(in srgb, ${current.tone} 40%, transparent)`,
          }}
        >
          {current.score}% {step === 3 ? "Alta" : ""}
        </motion.span>
      </div>

      {/* Tabs row */}
      <div className="flex items-center gap-1 mb-3">
        {SCORE_STEPS.map((s, i) => (
          <div
            key={s.key}
            className="flex-1 text-center text-[9px] py-1 rounded-md transition-all"
            style={{
              background: i === step ? "var(--lp-surface-3)" : "transparent",
              color: i === step ? "var(--lp-fg)" : "var(--lp-muted-2)",
              fontWeight: i === step ? 600 : 400,
              borderBottom: i === step ? `2px solid ${s.tone}` : "2px solid transparent",
            }}
          >
            {s.icon} {s.label.split(" ")[s.label.split(" ").length - 1]}
          </div>
        ))}
      </div>

      {/* Screen */}
      <div className="min-h-[180px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {step === 0 && <ScoreScreenCultural />}
            {step === 1 && <ScoreScreenDisc />}
            {step === 2 && <ScoreScreenTech />}
            {step === 3 && <ScoreScreenFinal />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {SCORE_STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all"
            style={{
              width: i === step ? 18 : 6,
              background: i === step ? "var(--lp-blue)" : "var(--lp-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--lp-surface-3)" }}>
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, delay, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function ScoreScreenCultural() {
  const criteria = [
    { label: "Honestidade e confiança", value: 90 },
    { label: "Trabalho em equipe", value: 94 },
    { label: "Comunicação clara", value: 88 },
  ];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center py-2">
        <svg width="90" height="78" viewBox="0 0 100 86">
          <polygon
            points="50,6 92,28 92,58 50,80 8,58 8,28"
            fill="none"
            stroke="var(--lp-border)"
            strokeWidth="1"
          />
          <polygon
            points="50,18 80,32 80,56 50,70 20,56 20,32"
            fill="none"
            stroke="var(--lp-border)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <motion.polygon
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            points="50,10 88,30 86,56 50,76 14,56 12,30"
            fill="color-mix(in srgb, var(--lp-green) 22%, transparent)"
            stroke="var(--lp-green)"
            strokeWidth="1.5"
            style={{ transformOrigin: "50% 43%" }}
          />
        </svg>
      </div>
      {criteria.map((c, i) => (
        <div key={c.label} className="space-y-1">
          <div className="flex justify-between text-[10px]" style={{ color: "var(--lp-fg)" }}>
            <span className="truncate">{c.label}</span>
            <span className="tabular-nums font-semibold" style={{ color: "var(--lp-green)" }}>
              {c.value}%
            </span>
          </div>
          <ScoreBar value={c.value} color="var(--lp-green)" delay={0.2 + i * 0.1} />
        </div>
      ))}
    </div>
  );
}

function ScoreScreenDisc() {
  const dims = [
    { label: "Dominância", value: 66, color: "#e0524a" },
    { label: "Influência", value: 84, color: "var(--lp-amber)" },
    { label: "Estabilidade", value: 72, color: "var(--lp-green)" },
    { label: "Conformidade", value: 94, color: "var(--lp-blue)" },
  ];
  return (
    <div className="space-y-2.5">
      <div
        className="rounded-md p-2.5"
        style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
      >
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] font-semibold" style={{ color: "var(--lp-fg)" }}>
            ◎ Match Score
          </span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--lp-green)" }}>
            79% ✓
          </span>
        </div>
        <ScoreBar value={79} color="var(--lp-fg)" delay={0.15} />
        <div className="text-[8px] mt-1" style={{ color: "var(--lp-muted-2)" }}>
          Nota de corte: 70%
        </div>
      </div>
      <div className="space-y-1.5">
        {dims.map((d, i) => (
          <div key={d.label} className="space-y-0.5">
            <div className="flex justify-between text-[10px]">
              <span className="flex items-center gap-1.5" style={{ color: "var(--lp-fg)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                {d.label}
              </span>
              <span className="tabular-nums font-semibold" style={{ color: d.color }}>
                {d.value}%
              </span>
            </div>
            <ScoreBar value={d.value} color={d.color} delay={0.25 + i * 0.08} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreScreenTech() {
  const skills = [
    { label: "Onboarding", value: 85 },
    { label: "Cargos & Salários", value: 80 },
    { label: "Retenção de Talentos", value: 75 },
  ];
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-md p-2.5 text-center"
          style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
        >
          <div className="text-[9px]" style={{ color: "var(--lp-muted-2)" }}>
            Score Técnico
          </div>
          <div className="text-[26px] font-bold tabular-nums leading-none mt-1" style={{ color: "var(--lp-green)" }}>
            77
          </div>
          <div className="text-[8px]" style={{ color: "var(--lp-muted-2)" }}>
            de 100
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-md p-2.5 flex flex-col items-center justify-center text-center"
          style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
        >
          <div className="text-[9px]" style={{ color: "var(--lp-muted-2)" }}>
            Recomendação
          </div>
          <span
            className="text-[9px] px-2 py-0.5 rounded-full font-semibold mt-1.5"
            style={{
              background: "color-mix(in srgb, var(--lp-green) 18%, transparent)",
              color: "var(--lp-green)",
              border: "1px solid color-mix(in srgb, var(--lp-green) 40%, transparent)",
            }}
          >
            ✓ RECOMENDADO
          </span>
        </motion.div>
      </div>
      <div className="space-y-1.5">
        {skills.map((s, i) => (
          <div key={s.label} className="space-y-0.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="flex items-center gap-1.5" style={{ color: "var(--lp-fg)" }}>
                {s.label}
                <span
                  className="text-[7px] px-1 py-px rounded-sm font-medium"
                  style={{ background: "color-mix(in srgb, var(--lp-blue) 18%, transparent)", color: "var(--lp-blue)" }}
                >
                  OBRIGATÓRIA
                </span>
              </span>
              <span className="tabular-nums font-semibold" style={{ color: "var(--lp-green)" }}>
                {s.value}%
              </span>
            </div>
            <ScoreBar value={s.value} color="var(--lp-green)" delay={0.3 + i * 0.1} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreScreenFinal() {
  const parts = [
    { label: "Cultural", weight: "50%", value: 92, color: "var(--lp-green)" },
    { label: "DISC", weight: "25%", value: 79, color: "var(--lp-blue)" },
    { label: "Técnico", weight: "25%", value: 77, color: "var(--lp-amber)" },
  ];
  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="lp-mono text-[9px]" style={{ color: "var(--lp-muted-2)" }}>
          Score Composto Final
        </div>
        <div className="flex items-baseline justify-center gap-1 mt-0.5">
          <span className="text-[44px] font-bold tabular-nums leading-none" style={{ color: "var(--lp-green)" }}>
            <CountUp to={86} />
          </span>
          <span className="text-[16px]" style={{ color: "var(--lp-muted-2)" }}>
            %
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {parts.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.1 }}
            className="rounded-md p-2 text-center"
            style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
          >
            <div className="text-[8px]" style={{ color: "var(--lp-muted-2)" }}>
              {p.label}
            </div>
            <div className="text-[9px] tabular-nums" style={{ color: "var(--lp-muted-2)" }}>
              peso {p.weight}
            </div>
            <div className="text-[14px] font-bold tabular-nums mt-0.5" style={{ color: p.color }}>
              {p.value}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-[10px] font-medium"
        style={{ color: "var(--lp-green)" }}
      >
        ✓ Recomendado para shortlist
      </motion.div>
    </div>
  );
}

// ===================== Human-in-the-loop Mock (case 8) =====================

const HUMAN_STEPS = ["approved", "compare", "decision"] as const;

function HumanLoopMock() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const durs = [1900, 2100, 2400];
    const t = setTimeout(() => setStep((s) => (s + 1) % 3), durs[step]);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Header badge */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center mb-3"
      >
        <span
          className="text-[10px] px-3 py-1 rounded-full font-semibold flex items-center gap-1.5"
          style={{
            background: "color-mix(in srgb, var(--lp-amber) 16%, transparent)",
            color: "var(--lp-amber)",
            border: "1px solid color-mix(in srgb, var(--lp-amber) 40%, transparent)",
          }}
        >
          ⚠ Aprovação humana necessária
        </span>
      </motion.div>

      {/* Screen */}
      <div className="min-h-[230px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={HUMAN_STEPS[step]}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {step === 0 && <HumanScreenApproved />}
            {step === 1 && <HumanScreenCompare />}
            {step === 2 && <HumanScreenDecision />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {HUMAN_STEPS.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full transition-all"
            style={{
              width: i === step ? 18 : 6,
              background: i === step ? "var(--lp-amber)" : "var(--lp-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function HumanScreenApproved() {
  const cands = [
    { ini: "JF", name: "Janaini F. Santos", score: 85, c: 92.1, d: 79, t: 77 },
    { ini: "RA", name: "Robert Araújo", score: 89, c: 93.7, d: 88, t: 81 },
    { ini: "BA", name: "Bianca Annunziato", score: 86, c: 92.4, d: 71, t: 88.5 },
  ];
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--lp-fg)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--lp-green)" }} />
          ✓ Aprovados
        </div>
        <span className="text-[10px] tabular-nums" style={{ color: "var(--lp-muted-2)" }}>
          4
        </span>
      </div>
      <motion.button
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full text-[10px] py-1.5 rounded-md font-semibold mb-2 flex items-center justify-center gap-1.5"
        style={{ background: "var(--lp-fg)", color: "var(--lp-bg)" }}
      >
        ✦ Comparar com IA
      </motion.button>
      <div className="space-y-1.5">
        {cands.map((c, i) => (
          <motion.div
            key={c.ini}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.1 }}
            className="flex items-center gap-2 rounded-md p-1.5"
            style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: "var(--lp-surface-2)", color: "var(--lp-fg)" }}
            >
              {c.ini}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold truncate" style={{ color: "var(--lp-fg)" }}>
                  {c.name}
                </span>
                <span className="text-[10px] font-bold tabular-nums shrink-0 ml-1" style={{ color: "var(--lp-green)" }}>
                  {c.score}%
                </span>
              </div>
              <div className="text-[8px] tabular-nums" style={{ color: "var(--lp-green)" }}>
                C {c.c} · D {c.d} · T {c.t}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function HumanScreenCompare() {
  const finalists = [
    { name: "Robert Araújo", c: 94, d: 88, t: 81, comp: 89 },
    { name: "Bianca Annunziato", c: 92, d: 71, t: 89, comp: 86 },
    { name: "Janaini F. Santos", c: 92, d: 79, t: 77, comp: 85 },
  ];
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
    >
      <div className="text-[11px] font-semibold mb-1 flex items-center gap-1.5" style={{ color: "var(--lp-fg)" }}>
        ✦ Comparar finalistas com IA
      </div>
      <div className="text-[8.5px] mb-2" style={{ color: "var(--lp-muted-2)" }}>
        A IA analisa scores cultural, comportamental e técnico
      </div>
      <div className="text-[8.5px] mb-1.5 font-medium" style={{ color: "var(--lp-fg)" }}>
        Finalistas (3 selecionados)
      </div>
      <div className="space-y-1.5">
        {finalists.map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-start gap-2 rounded-md p-1.5"
            style={{ background: "var(--lp-surface-3)", border: "1px solid var(--lp-border)" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.3 + i * 0.1 }}
              className="w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "var(--lp-fg)" }}
            >
              <Check className="w-2.5 h-2.5" style={{ color: "var(--lp-bg)" }} strokeWidth={3} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold" style={{ color: "var(--lp-fg)" }}>
                {f.name}
              </div>
              <div className="text-[8px] tabular-nums" style={{ color: "var(--lp-muted-2)" }}>
                Cultural: {f.c} · DISC: {f.d} · Téc: {f.t} · Comp: {f.comp}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-2 text-center text-[10px] py-1.5 rounded-md font-semibold flex items-center justify-center gap-1.5"
        style={{ background: "var(--lp-fg)", color: "var(--lp-bg)" }}
      >
        ✦ Rodar análise
      </motion.div>
    </div>
  );
}

function HumanScreenDecision() {
  const rows = [
    { k: "Top finalista", v: "Robert Araújo" },
    { k: "Vaga", v: "Sr. Backend Node" },
    { k: "Score Composto", v: "89 / 100" },
    { k: "Recomendação IA", v: "✦ APROVAR" },
  ];
  return (
    <div
      className="rounded-lg p-2.5"
      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
    >
      <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: "1px solid var(--lp-border)" }}>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: "var(--lp-surface-3)", color: "var(--lp-fg)" }}
        >
          ▣
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold" style={{ color: "var(--lp-fg)" }}>
            GENT.IA · Decisão de Shortlist
          </div>
          <div className="text-[8.5px]" style={{ color: "var(--lp-muted-2)" }}>
            Trilha auditável · LGPD ✓
          </div>
        </div>
      </div>
      <div className="space-y-1">
        {rows.map((r, i) => (
          <motion.div
            key={r.k}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="flex items-center justify-between text-[10px] py-1"
          >
            <span style={{ color: "var(--lp-muted-2)" }}>{r.k}</span>
            <span
              className="font-mono px-1.5 py-0.5 rounded-sm"
              style={{
                background: "var(--lp-surface-3)",
                color: r.k === "Recomendação IA" ? "var(--lp-green)" : "var(--lp-fg)",
                fontWeight: 600,
              }}
            >
              {r.v}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-1.5 mt-2.5"
      >
        <motion.button
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="flex-1 text-[10px] py-1.5 rounded-md font-semibold flex items-center justify-center gap-1"
          style={{ background: "var(--lp-green)", color: "#0a1020" }}
        >
          <Check className="w-3 h-3" strokeWidth={3} /> Aprovar
        </motion.button>
        <button
          className="flex-1 text-[10px] py-1.5 rounded-md font-medium"
          style={{ background: "transparent", color: "var(--lp-fg)", border: "1px solid var(--lp-border)" }}
        >
          Pedir + 1
        </button>
      </motion.div>
    </div>
  );
}

// ===================== Cultural Fit Mock (case 4) — placeholder =====================

const CULTURE_BARS = [
  { label: "Trabalho em equipe", score: 88 },
  { label: "Liberdade com responsabilidade", score: 92 },
  { label: "Gratidão e saúde", score: 90 },
  { label: "Comunicação clara", score: 94 },
];

const CULTURE_QUESTIONS = [
  {
    code: "Q14",
    text: "Faz sentido buscar um equilíbrio. Me conta sobre uma ocasião em que você precisou se adaptar a uma cultura ou estilo de trabalho diferente do seu.",
  },
  {
    code: "Q19",
    text: "Sei, você ia falar sobre quando um colega não entrega a parte dele no projeto. Como você costuma agir nessas situações?",
  },
];

function CultureAudioBar() {
  return (
    <div
      className="rounded-md px-3 py-2 flex items-center gap-3"
      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
        style={{ background: "var(--lp-fg)", color: "#0a1020" }}
      >
        ▶
      </div>
      <div className="flex items-end gap-[2px] flex-1 h-5">
        {Array.from({ length: 42 }).map((_, i) => {
          const h = 18 + Math.round(Math.sin(i * 0.7) * 10 + (i % 5) * 2);
          return (
            <motion.span
              key={i}
              animate={{ scaleY: [0.45, 1, 0.6, 0.9, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.04, ease: "easeInOut" }}
              className="block w-[2px] origin-bottom"
              style={{ height: `${Math.min(h, 22)}px`, background: "var(--lp-muted)" }}
            />
          );
        })}
      </div>
      <span className="lp-mono text-[10px] text-[var(--lp-muted-2)]">00:00 / 18:42</span>
    </div>
  );
}

function CultureTabs({ active }: { active: "geral" | "transcricao" | "avaliacao" }) {
  const tabs: Array<{ id: typeof active; label: string }> = [
    { id: "geral", label: "Visão Geral" },
    { id: "transcricao", label: "Transcrição" },
    { id: "avaliacao", label: "Avaliação" },
  ];
  return (
    <div
      className="grid grid-cols-3 rounded-md p-1 text-[11px]"
      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
    >
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <div
            key={t.id}
            className="text-center py-1.5 rounded-sm transition-all"
            style={{
              background: isActive ? "var(--lp-bg)" : "transparent",
              color: isActive ? "var(--lp-fg)" : "var(--lp-muted)",
              fontWeight: isActive ? 600 : 400,
              border: isActive ? "1px solid var(--lp-border)" : "1px solid transparent",
            }}
          >
            {t.label}
          </div>
        );
      })}
    </div>
  );
}

function CultureFieldPair({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="lp-mono text-[9px] text-[var(--lp-muted-2)] mb-0.5">{label}</div>
      <div className="text-[11px] text-[var(--lp-fg)]/90 truncate">{children}</div>
    </div>
  );
}

function CultureChip({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" }) {
  const color = tone === "green" ? "var(--lp-green)" : "var(--lp-blue)";
  return (
    <span
      className="lp-mono text-[9px] px-1.5 py-0.5 rounded"
      style={{
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        color: "var(--lp-fg)",
        border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function CulturalFitMock() {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setScreen((s) => (s + 1) % 4), 2400);
    return () => clearTimeout(t);
  }, [screen]);

  const tabFor = (s: number): "geral" | "transcricao" | "avaliacao" =>
    s === 0 ? "geral" : "avaliacao";

  return (
    <div className="w-full max-w-[560px] mx-auto flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-[var(--lp-fg)] font-medium">Detalhes da entrevista</div>
          <div className="text-[10px] text-[var(--lp-muted-2)] mt-0.5">
            José Giovanno · Analista de RH · 15 de abr
          </div>
        </div>
        <button
          className="lp-mono text-[10px] px-2 py-1 rounded-md flex items-center gap-1"
          style={{ border: "1px solid var(--lp-border)", color: "var(--lp-fg)" }}
        >
          ✦ Perguntar à IA
        </button>
      </div>

      <CultureAudioBar />
      <CultureTabs active={tabFor(screen)} />

      {/* Screens */}
      <div className="min-h-[150px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {screen === 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <CultureFieldPair label="CANDIDATO">José Giovanno</CultureFieldPair>
                <CultureFieldPair label="EMAIL">machadojose32@hotmail.com</CultureFieldPair>
                <CultureFieldPair label="VAGA">Analista de RH</CultureFieldPair>
                <div>
                  <div className="lp-mono text-[9px] text-[var(--lp-muted-2)] mb-0.5">STATUS</div>
                  <CultureChip>CONCLUÍDO</CultureChip>
                </div>
                <div>
                  <div className="lp-mono text-[9px] text-[var(--lp-muted-2)] mb-0.5">AVALIAÇÃO</div>
                  <CultureChip>APROVADO</CultureChip>
                </div>
                <div>
                  <div className="lp-mono text-[9px] text-[var(--lp-muted-2)] mb-0.5">SCORE</div>
                  <div className="text-[12px]" style={{ color: "var(--lp-green)" }}>
                    ● 92%
                  </div>
                </div>
                <CultureFieldPair label="DURAÇÃO">18 min 42 s</CultureFieldPair>
                <CultureFieldPair label="INICIOU EM">15 abr 2026 · 09:45</CultureFieldPair>
              </div>
            )}

            {screen === 1 && (
              <div
                className="rounded-md p-3"
                style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="text-[12px] text-[var(--lp-fg)] font-medium flex items-center gap-2">
                      Desempenho Geral <CultureChip>APROVADO</CultureChip>
                    </div>
                    <div className="text-[10px] text-[var(--lp-muted-2)] mt-0.5">
                      Média ponderada dos critérios de avaliação
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[22px] font-semibold" style={{ color: "var(--lp-green)" }}>
                      92.0
                    </span>
                    <span className="text-[10px] text-[var(--lp-muted-2)]"> / 100</span>
                  </div>
                </div>
                <div className="text-[11px] text-[var(--lp-fg)]/90 font-medium mb-1">
                  Análise de Compatibilidade
                </div>
                <div className="text-[10.5px] text-[var(--lp-fg)]/75 leading-relaxed space-y-1">
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    Perfil extremamente alinhado à cultura da empresa, com bagagem orgânica e contínua.
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}>
                    Demonstra resiliência, humildade e altíssima capacidade de adaptação.
                  </motion.p>
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.6 }}>
                    Valores enraizados em colaboração, integridade e gratidão.
                  </motion.p>
                </div>
              </div>
            )}

            {screen === 2 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] text-[var(--lp-fg)] font-medium">
                    Critérios de Avaliação
                  </div>
                  <span className="lp-mono text-[10px] text-[var(--lp-muted-2)]">6 critérios</span>
                </div>
                <div className="space-y-1.5">
                  {CULTURE_BARS.map((c, i) => (
                    <motion.div
                      key={c.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.3 }}
                      className="rounded-md p-2"
                      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[var(--lp-fg)]/90">{c.label}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium" style={{ color: "var(--lp-green)" }}>
                            {c.score.toFixed(1)}
                          </span>
                          <span className="text-[9px] text-[var(--lp-muted-2)]">/ 100</span>
                          <CultureChip>PASSOU</CultureChip>
                        </span>
                      </div>
                      <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ background: "var(--lp-border)" }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${c.score}%` }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                          className="h-full"
                          style={{ background: "var(--lp-green)" }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {screen === 3 && (
              <div>
                <div className="text-[11px] text-[var(--lp-fg)]/85 mb-2">
                  Questões usadas para avaliar (2)
                </div>
                <div className="space-y-2">
                  {CULTURE_QUESTIONS.map((q, i) => (
                    <motion.div
                      key={q.code}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15, duration: 0.3 }}
                      className="rounded-md p-2.5 flex gap-2"
                      style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
                    >
                      <span
                        className="lp-mono text-[9px] px-1.5 py-0.5 rounded h-fit"
                        style={{
                          background: "color-mix(in oklab, var(--lp-blue) 18%, transparent)",
                          color: "var(--lp-fg)",
                        }}
                      >
                        {q.code}
                      </span>
                      <div className="text-[10.5px] text-[var(--lp-fg)]/85 leading-snug line-clamp-2">
                        {q.text}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div
                  className="mt-2 flex items-center justify-between rounded-md p-2"
                  style={{ background: "var(--lp-surface-2)", border: "1px solid var(--lp-border)" }}
                >
                  <span className="text-[11px] text-[var(--lp-fg)]/85">Liberdade com responsabilidade</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium" style={{ color: "var(--lp-green)" }}>
                      92.0
                    </span>
                    <span className="text-[9px] text-[var(--lp-muted-2)]">/ 100</span>
                    <CultureChip>PASSOU</CultureChip>
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all"
            style={{
              background: i === screen ? "var(--lp-blue)" : "var(--lp-border)",
              transform: i === screen ? "scale(1.4)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
