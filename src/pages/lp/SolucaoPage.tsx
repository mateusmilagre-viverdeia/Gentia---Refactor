import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CTA_URL, EXTERNAL_LINK_PROPS } from "@/lib/lpLinks";

export default function SolucaoPage() {
  return (
    <>
      <Helmet>
        <title>Solução — Gent.IA</title>
        <meta name="description" content="Deep dive nos três pilares da Gent.IA: captação, triagem e agendamento + feedback." />
        <link rel="canonical" href="https://gentia.tech/solucao" />
      </Helmet>
      <section className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-20 pb-24">
        <div className="lp-mono">Soluções</div>
        <h1 className="lp-display lp-h2 mt-4 max-w-4xl">
          Três pilares.{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            Um ciclo de R&S completo.
          </span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-4 mt-16">
          {[
            {
              n: "Pilar 01",
              t: "Captação",
              d: "Hunting ativo em Apollo + LinkedIn + Evaboot. Distribui vaga em WhatsApp, voz, e-mail e chat. Pipeline cheio sem licença extra de job board.",
            },
            {
              n: "Pilar 02",
              t: "Triagem",
              d: "Entrevista por voz com IA (semantic VAD). Avaliação cultural + DISC + técnica numa régua só. Score composto: 50% cultural · 25% DISC · 25% técnico.",
            },
            {
              n: "Pilar 03",
              t: "Agendamento + Feedback",
              d: "Coordena agendas, reagenda, faz follow-up. Devolutiva estruturada para aprovados E recusados — porque tratar bem quem não passou é parte do R&S.",
            },
          ].map((p) => (
            <div key={p.n} className="lp-card p-7">
              <div className="lp-mono">{p.n}</div>
              <h3 className="lp-display text-[28px] mt-3 mb-3">{p.t}</h3>
              <p className="text-[14px] text-[var(--lp-muted)] leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-primary">
            Ver demonstração <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </>
  );
}
