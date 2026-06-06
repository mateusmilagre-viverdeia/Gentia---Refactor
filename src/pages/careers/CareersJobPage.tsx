import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, MapPin, Briefcase, Clock, ArrowLeft, Upload, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { JobLookupError } from "@/components/recruitment/JobLookupError";
import { sanitizeJobId } from "@/lib/jobIdSanitizer";

export default function CareersJobPage() {
  const { slug, jobId: rawJobId } = useParams<{ slug: string; jobId: string }>();
  const jobId = sanitizeJobId(rawJobId);
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    linkedin_url: "",
    message: "",
    privacy_consent: false,
  });
  const [cvFile, setCvFile] = useState<File | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/careers-public-data?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  const job = useMemo(() => data?.jobs?.find((j: any) => j.id === jobId), [data, jobId]);
  const page = data?.page;

  // SEO + Schema.org
  useEffect(() => {
    if (!job || !page) return;
    const clientName = page.clientes_consultoria?.nome_fantasia || page.clientes_consultoria?.razao_social || "";
    document.title = `${job.title} — ${clientName}`;
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", `${job.title} em ${clientName}. ${job.location || ""} ${job.work_modality || ""}. Candidate-se agora.`);

    const schema = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: job.title,
      description: job.description || `Vaga ${job.title} em ${clientName}`,
      datePosted: job.created_at,
      employmentType: (job.work_regime || "FULL_TIME").toUpperCase(),
      hiringOrganization: {
        "@type": "Organization",
        name: clientName,
        ...(page.logo_url ? { logo: page.logo_url } : {}),
      },
      ...(job.location ? {
        jobLocation: {
          "@type": "Place",
          address: { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "BR" },
        },
      } : {}),
      ...(job.work_modality === "remoto" ? { jobLocationType: "TELECOMMUTE" } : {}),
      ...(job.budget_min && !job.hide_salary ? {
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "BRL",
          value: { "@type": "QuantitativeValue", minValue: job.budget_min, maxValue: job.budget_max || job.budget_min, unitText: "MONTH" },
        },
      } : {}),
      directApply: true,
      url: window.location.href,
    };
    const scriptId = "career-job-schema";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
    return () => { document.getElementById(scriptId)?.remove(); };
  }, [job, page]);

  if (!jobId) {
    console.warn("[CareersJobPage] Invalid jobId in URL", { rawJobId, slug });
    return <JobLookupError kind="invalid_link" careersSlug={slug ?? null} />;
  }
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!data || !job) {
    console.warn("[CareersJobPage] Job not found in careers payload", { jobId, slug });
    return <JobLookupError kind="not_found" careersSlug={slug ?? null} />;
  }
  if (job.status && job.status !== "active") {
    console.warn("[CareersJobPage] Job inactive", { jobId, status: job.status });
    return (
      <JobLookupError
        kind="job_closed"
        careersSlug={slug ?? null}
        companyName={
          page?.clientes_consultoria?.nome_fantasia ||
          page?.clientes_consultoria?.razao_social ||
          null
        }
      />
    );
  }

  const primary = page.primary_color || "#0F172A";
  const clientName = page.clientes_consultoria?.nome_fantasia || page.clientes_consultoria?.razao_social || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy_consent) {
      toast.error("Confirme o consentimento de privacidade");
      return;
    }
    setSubmitting(true);
    try {
      let cv_base64: string | undefined;
      let cv_filename: string | undefined;
      if (cvFile) {
        if (cvFile.size > 5 * 1024 * 1024) {
          toast.error("Arquivo maior que 5MB");
          setSubmitting(false);
          return;
        }
        cv_filename = cvFile.name;
        cv_base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(cvFile);
        });
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/careers-apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          job_id: jobId,
          ...form,
          cv_base64,
          cv_filename,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao enviar");
      navigate(`/c/${slug}/sucesso?vaga=${encodeURIComponent(job.title)}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar candidatura");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b" style={{ borderColor: `${primary}20` }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to={`/c/${slug}`} className="flex items-center gap-3">
            {page.logo_url ? (
              <img src={page.logo_url} alt="" className="h-9 w-auto object-contain" />
            ) : (
              <Building2 className="h-6 w-6" style={{ color: primary }} />
            )}
            <span className="font-semibold" style={{ color: primary }}>{clientName}</span>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to={`/c/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Todas as vagas
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Detalhes */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: primary }}>{job.title}</h1>
              {job.department && <p className="text-sm text-muted-foreground mt-1">{job.department}</p>}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {job.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.location}</span>}
                {job.work_modality && <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4" />{job.work_modality}</span>}
                {job.work_regime && <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" />{job.work_regime.toUpperCase()}</span>}
              </div>
            </div>
            {job.description && (
              <div className="prose prose-sm max-w-none">
                <h2 className="text-lg font-semibold mb-2" style={{ color: primary }}>Sobre a vaga</h2>
                <div className="whitespace-pre-line text-sm leading-relaxed">{job.description}</div>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleSubmit} className="rounded-xl border p-6 space-y-4 sticky top-6" style={{ borderColor: `${primary}20` }}>
              <h3 className="font-semibold" style={{ color: primary }}>Candidate-se</h3>
              <div>
                <Label className="text-xs">Nome completo *</Label>
                <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">WhatsApp *</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1" />
                <p className="text-[11px] text-muted-foreground mt-1">Usaremos seu WhatsApp para enviar testes e atualizações sobre a vaga.</p>
              </div>
              <div>
                <Label className="text-xs">LinkedIn</Label>
                <Input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Mensagem (opcional)</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} className="mt-1" placeholder="Por que você é a pessoa certa?" />
              </div>
              <div>
                <Label className="text-xs">Currículo (PDF, máx 5MB)</Label>
                <div className="mt-1 relative border-2 border-dashed rounded-lg p-3 text-center hover:bg-muted/40 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    {cvFile ? cvFile.name : "Anexar currículo"}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="privacy"
                  checked={form.privacy_consent}
                  onCheckedChange={(v) => setForm({ ...form, privacy_consent: !!v })}
                />
                <Label htmlFor="privacy" className="text-xs leading-relaxed cursor-pointer">
                  Autorizo o tratamento dos meus dados para fins de recrutamento conforme a LGPD.
                </Label>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
                style={{ background: primary, color: "white" }}
              >
                {submitting ? "Enviando..." : "Enviar candidatura"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
