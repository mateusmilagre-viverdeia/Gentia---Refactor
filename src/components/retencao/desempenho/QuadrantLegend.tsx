export function QuadrantLegend() {
  const quadrants = [
    { label: 'Desligar', description: 'Baixo desempenho + Valores incompatíveis' },
    { label: 'Desenvolver', description: 'Baixo desempenho + Valores compatíveis' },
    { label: 'Avaliar cada caso', description: 'Alto desempenho + Valores incompatíveis' },
    { label: 'Delegar Desafios', description: 'Alto desempenho + Valores compatíveis' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
      {quadrants.map((q) => (
        <div key={q.label} className="text-center">
          <span className="text-sm font-medium text-foreground block">{q.label}</span>
          <span className="text-[10px] text-muted-foreground">{q.description}</span>
        </div>
      ))}
    </div>
  );
}
