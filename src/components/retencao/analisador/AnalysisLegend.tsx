export function AnalysisLegend() {
  return (
    <div className="flex flex-wrap items-center gap-6 p-4 bg-muted/30 rounded-lg text-sm">
      <span className="font-medium text-muted-foreground">LEGENDA:</span>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-green-500" />
        <span>Exibe o valor (+1 pt)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-yellow-500" />
        <span>Às vezes exibe (+0.5 pt)</span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-red-500" />
        <span>Não exibe (0 pt)</span>
      </div>

      <div className="border-l pl-6 ml-2">
        <span className="text-muted-foreground">Total: </span>
        <span className="text-green-600 font-medium">≥4 pts</span>
        <span className="text-muted-foreground mx-1">|</span>
        <span className="text-yellow-600 font-medium">3.5 pts</span>
        <span className="text-muted-foreground mx-1">|</span>
        <span className="text-red-600 font-medium">≤3 pts</span>
      </div>
    </div>
  );
}
