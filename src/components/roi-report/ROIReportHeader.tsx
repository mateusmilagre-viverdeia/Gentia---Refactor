interface Props {
  meta: any;
}

function LogoFallback({ label }: { label?: string }) {
  return (
    <div className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-md border bg-muted px-3 text-sm font-semibold">
      {(label || "—").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function ROIReportHeader({ meta }: Props) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto max-w-5xl space-y-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {meta.consultancy_logo_url ? (
              <img src={meta.consultancy_logo_url} alt={meta.consultancy_name || "Consultoria"} className="h-10 max-w-28 shrink-0 object-contain sm:max-w-36" />
            ) : (
              <LogoFallback label={meta.consultancy_name} />
            )}
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">{meta.consultancy_name || "Consultoria"}</p>
              <p className="text-xs text-muted-foreground">Consultoria parceira</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 text-right">
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium">{meta.client_name || "Cliente"}</p>
              <p className="text-xs text-muted-foreground">Empresa cliente</p>
            </div>
            {meta.client_logo_url ? (
              <img src={meta.client_logo_url} alt={meta.client_name || "Cliente"} className="h-10 max-w-28 shrink-0 object-contain sm:max-w-36" />
            ) : (
              <LogoFallback label={meta.client_name} />
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground sm:text-sm">
          Processo conduzido por <strong>{meta.consultancy_name || "consultoria"}</strong> para <strong>{meta.client_name || "cliente"}</strong>
        </p>
      </div>
    </header>
  );
}
