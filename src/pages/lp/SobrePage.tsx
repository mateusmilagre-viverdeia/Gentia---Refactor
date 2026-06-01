import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CTA_URL, EXTERNAL_LINK_PROPS } from "@/lib/lpLinks";

export default function SobrePage() {
  return (
    <>
      <Helmet>
        <title>Manifesto — Gent.IA</title>
        <meta
          name="description"
          content="Por que recrutamento autônomo para consultorias. Manifesto Gent.IA."
        />
        <link rel="canonical" href="https://gentia.tech/sobre" />
      </Helmet>
      <section className="max-w-[920px] mx-auto px-6 lg:px-10 pt-20 pb-24">
        <div className="lp-mono">Manifesto</div>
        <h1 className="lp-display lp-h2 mt-4">
          O recrutamento{" "}
          <span className="lp-serif-italic text-[var(--lp-muted)]">
            voltou a ser recrutamento.
          </span>
        </h1>

        <div className="mt-12 space-y-7 text-[17px] leading-[1.7] text-[var(--lp-fg)]/85">
          <p>
            Consultoria de R&amp;S virou operação de planilha. O consultor passou a
            ser arquivista de candidato. A boa decisão — feita por gente que entende
            de gente — ficou no fim do funil, soterrada por seis abas abertas e
            cinquenta candidatos pra triar.
          </p>
          <p>
            A Gent.IA existe para devolver o R&amp;S ao consultor. A plataforma faz
            sourcing, faz a primeira conversa, faz a entrevista por voz, mede DISC,
            avalia fit cultural e técnico — e entrega <em>shortlist com evidências</em>.
            A decisão é sempre humana.
          </p>
          <p>
            Não construímos uma ferramenta para você operar. Construímos a tecnologia
            para sua consultoria entregar 3× mais vagas — com o mesmo time, sem
            perder a mão.
          </p>
          <p className="lp-serif-italic text-[22px] text-[var(--lp-fg)] pt-4">
            "Vendemos serviço, não software. O trabalho de R&amp;S, pronto."
          </p>
        </div>

        <div className="mt-16">
          <a href={CTA_URL} {...EXTERNAL_LINK_PROPS} className="lp-btn-primary">
            Conversar com o time <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </>
  );
}
