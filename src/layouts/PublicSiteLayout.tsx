import { Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import "@/styles/lp.css";
import logoGentiaDark from "@/assets/logo-gentia-dark.png";
import { CTA_URL, WHATSAPP_URL, EXTERNAL_LINK_PROPS } from "@/lib/lpLinks";

const navItems = [
  { label: "Hunting", to: "/#como-funciona" },
  { label: "Qualificação", to: "/#como-funciona" },
  { label: "Como funciona", to: "/#como-funciona" },
  { label: "Preços", to: "/precos" },
];

export default function PublicSiteLayout({ children }: { children?: ReactNode }) {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="lp-root">
      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-all ${
          scrolled
            ? "backdrop-blur-xl bg-[rgba(10,16,32,0.78)] border-b border-[var(--lp-border)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 h-[132px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoGentiaDark} alt="Gent.IA" className="h-[112px] w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[13.5px] text-[var(--lp-muted)]">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="hover:text-[var(--lp-fg)] transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a
              href={WHATSAPP_URL}
              {...EXTERNAL_LINK_PROPS}
              className="hidden sm:inline-flex text-[13px] text-[var(--lp-muted)] hover:text-[var(--lp-fg)] transition"
            >
              WhatsApp
            </a>
            <Link
              to="/login"
              className="inline-flex text-[13px] text-[var(--lp-muted)] hover:text-[var(--lp-fg)] transition"
            >
              Login
            </Link>
            <a
              href={CTA_URL}
              {...EXTERNAL_LINK_PROPS}
              className="lp-btn-primary !py-2.5 !px-5 !text-[13px]"
            >
              Agendar demo
            </a>
          </div>
        </div>
      </header>

      <main>
        {children ?? <Outlet />}
      </main>

      {/* Footer */}
      <footer className="lp-section mt-32">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 grid grid-cols-2 md:grid-cols-5 gap-10 text-[13.5px]">
          <div className="col-span-2">
            <img src={logoGentiaDark} alt="Gent.IA" className="h-[138px] w-auto mb-4" />
            <p className="text-[var(--lp-muted)] max-w-xs leading-relaxed">
              Recrutamento autônomo para consultorias de R&amp;S. Sourcing, entrevistas
              por voz e shortlist auditável — em uma plataforma só.
            </p>
          </div>
          <FooterCol
            title="Produto"
            links={[
              { label: "Como funciona", to: "/#como-funciona" },
              { label: "Soluções", to: "/solucao" },
              { label: "Preços", to: "/precos" },
            ]}
          />
          <FooterCol
            title="Empresa"
            links={[
              { label: "Manifesto", to: "/sobre" },
              { label: "Sobre", to: "/sobre" },
            ]}
          />
          <FooterCol
            title="Confiança"
            links={[
              { label: "LGPD", to: "#" },
              { label: "EU AI Act", to: "#" },
              { label: "Privacidade", to: "#" },
            ]}
          />
        </div>
        <div className="lp-divider" />
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-[12px] text-[var(--lp-muted-2)]">
          <span>© 2026 Gent.IA · Todos os direitos reservados</span>
          <span className="lp-mono">LGPD · GDPR · EU AI Act · NYC LL144</span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) {
  return (
    <div>
      <div className="lp-mono mb-4">{title}</div>
      <ul className="space-y-2.5 text-[var(--lp-muted)]">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="hover:text-[var(--lp-fg)] transition">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
