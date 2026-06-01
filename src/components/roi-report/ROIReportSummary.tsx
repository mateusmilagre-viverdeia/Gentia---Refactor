interface Props {
  text: string;
}

export function ROIReportSummary({ text }: Props) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}|\r?\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Sobre este processo</h2>
      <div className="space-y-3 text-base leading-relaxed text-foreground/90">
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
    </section>
  );
}
