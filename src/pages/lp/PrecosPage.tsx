import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { CTA_URL, EXTERNAL_LINK_PROPS } from "@/lib/lpLinks";

const tiers = [
  {
    name: "Essencial",
    eyebrow: "Para começar",
    price: "A partir de R$ 297/mês",
    priceNote: "sem fidelidade",
    desc: "Para empresas com até 10 vagas/mês.",
    feats: [
      "Hunting ativo",
      "Entrevista por voz com IA",
      "Score cultural + DISC + técnico",
      "Shortlist auditável",
    ],
  },
  {
    name: "Escala",
    eyebrow: "Operação consolidada",
    price: "Pay Per Use",
    priceNote: "Pague pelo uso",
    desc: "Para empresas acima de 10 vagas/mês.",
    feats: [
      "Tudo do Essencial",
      "Pesquisa de mercado por vaga",
      "Suporte prioritário",
      "Treinamento de time",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    eyebrow: "Consultorias e HeadHunters",
    price: "Sob consulta",
    desc: "Operações com +40 vagas/mês ou requisitos de compliance.",
    feats: [
      "Tudo do Escala",
      "SLA dedicado",
      "Onboarding personalizado",
    ],
  },
];

export default function PrecosPage() {
  return (
    <>
      <Helmet>
        <title>Preços — Gent.IA</title>
        <meta
          name="description"
          content="Três planos para o Gentia de Recrutamento & Seleção: assinatura a partir de R$ 297/mês, pay-per-use e sob consulta."
        />
        <link rel="canonical" href="https://gentia.tech/precos" />
      </Helmet>
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-20 pb-24">
        <div className="lp-mono">Preços</div>
        <h1 className="lp-display lp-h2 mt-4 max-w-3xl">
          Escolha como pagar.{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            Sem letra miúda.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-[var(--lp-muted)] leading-relaxed">
          Comece com uma assinatura mensal, cresça pagando pelo uso ou desenhe um
          plano sob medida. Você só paga pelo que realmente usa.
        </p>


        <div className="grid lg:grid-cols-3 gap-4 mt-14">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`lp-card p-7 ${
                t.highlight ? "ring-1 ring-[var(--lp-blue)]/50 bg-[var(--lp-blue)]/[0.04]" : ""
              }`}
            >
              <div className="lp-mono mb-1">{t.eyebrow}</div>
              <div className="lp-display text-[30px] mb-1">{t.name}</div>
              <div className="text-[var(--lp-muted)] text-[13px] mb-4">{t.desc}</div>
              <div className="lp-display text-[26px] mb-1">{t.price}</div>
              <div className="text-[var(--lp-muted)] text-[12px] mb-6 min-h-[18px]">
                {t.priceNote ?? ""}
              </div>
              <ul className="space-y-2.5 mb-8">
                {t.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13.5px]">
                    <Check className="w-4 h-4 text-[var(--lp-green)] mt-0.5 shrink-0" />
                    <span className="text-[var(--lp-fg)]/85">{f}</span>
                  </li>
                ))}
              </ul>
              <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-primary w-full justify-center">
                Falar com o time
              </a>
            </div>
          ))}
        </div>

        <div className="mt-16 lp-card p-8 text-center max-w-3xl mx-auto">
          <div className="lp-mono mb-3">caso de uso fora desses planos?</div>
          <p className="text-[var(--lp-muted)] mb-5">
            Modelagem por hora-consultor, por vaga fechada ou por shortlist entregue.
            A gente desenha junto.
          </p>
          <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-ghost">
            Conversar com vendas <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </>
  );
}
