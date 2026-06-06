import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Briefcase, Clock, ArrowRight, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Job {
  id: string; title: string; description: string | null; location: string | null;
  work_modality: string | null; work_regime: string | null; department: string | null;
  budget_min: number | null; budget_max: number | null; hide_salary: boolean | null;
  created_at: string;
}

interface PageData {
  page: any;
  jobs: Job[];
  consultancy_name: string | null;
}

export default function CareersPublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [modalityFilter, setModalityFilter] = useState("all");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    supabase.functions.invoke("careers-public-data", {
      method: "GET" as any,
      body: undefined as any,
    });
    // Fetch direto via URL para suportar query params
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/careers-public-data?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // SEO
  useEffect(() => {
    if (!data) return;
    const { page } = data;
    const clientName = page.clientes_consultoria?.nome_fantasia || page.clientes_consultoria?.razao_social || "Carreiras";
    const title = page.meta_title || `Carreiras — ${clientName}`;
    const desc = page.meta_description || page.company_description?.slice(0, 160) || `Vagas abertas em ${clientName}`;
    document.title = title;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", desc);
  }, [data]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    data?.jobs.forEach((j) => j.location && set.add(j.location));
    return Array.from(set);
  }, [data]);

  const filteredJobs = useMemo(() => {
    return (data?.jobs || []).filter((j) => {
      if (search && !j.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (locationFilter !== "all" && j.location !== locationFilter) return false;
      if (modalityFilter !== "all" && j.work_modality !== modalityFilter) return false;
      return true;
    });
  }, [data, search, locationFilter, modalityFilter]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Globe className="h-10 w-10 opacity-40" />
        <p>Página não encontrada</p>
      </div>
    );
  }

  const { page } = data;
  const primary = page.primary_color || "#0F172A";
  const secondary = page.secondary_color || "#3B82F6";
  const clientName = page.clientes_consultoria?.nome_fantasia || page.clientes_consultoria?.razao_social || "";

  return (
    <div className="min-h-screen bg-background" style={{ "--brand": primary, "--brand-2": secondary } as any}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: `${primary}20` }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {page.logo_url ? (
              <img src={page.logo_url} alt={clientName} className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${primary}15` }}>
                <Building2 className="h-5 w-5" style={{ color: primary }} />
              </div>
            )}
            <span className="font-semibold" style={{ color: primary }}>{clientName}</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: page.cover_image_url
            ? `linear-gradient(to bottom, ${primary}cc, ${primary}ee), url(${page.cover_image_url}) center/cover`
            : `linear-gradient(135deg, ${primary}, ${secondary})`,
        }}
      >
        <div className="container mx-auto px-4 py-20 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Construa sua carreira conosco</h1>
          {page.company_description && (
            <p className="text-lg max-w-2xl opacity-90 whitespace-pre-line">{page.company_description}</p>
          )}
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
            <Briefcase className="h-4 w-4" />
            {data.jobs.length} {data.jobs.length === 1 ? "vaga aberta" : "vagas abertas"}
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Buscar vaga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {locations.length > 0 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Local" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os locais</SelectItem>
                {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Modalidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="remoto">Remoto</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="hibrido">Híbrido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista de vagas */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma vaga encontrada com esses filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                to={`/c/${slug}/vagas/${job.id}`}
                className="group rounded-xl border p-5 hover:shadow-md transition-all"
                style={{ borderColor: `${primary}20` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors" style={{ color: primary }}>
                      {job.title}
                    </h3>
                    {job.department && <p className="text-xs text-muted-foreground mt-0.5">{job.department}</p>}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                  {job.work_modality && <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{job.work_modality}</span>}
                  {job.work_regime && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{job.work_regime.toUpperCase()}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t mt-16" style={{ borderColor: `${primary}15` }}>
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          {data.consultancy_name && (
            <p>Recrutamento conduzido por <strong style={{ color: primary }}>{data.consultancy_name}</strong></p>
          )}
          <p className="mt-1 text-xs">Powered by GENTIA</p>
        </div>
      </footer>
    </div>
  );
}
