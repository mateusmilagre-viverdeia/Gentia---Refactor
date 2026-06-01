import { useState, useEffect } from "react";
import { Loader2, Copy, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

interface Step1Props {
  onComplete: () => void;
  mode?: "agency" | "self";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function formatBrPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function Step1Profile({ onComplete, mode = "agency" }: Step1Props) {
  const { currentAccount, currentOrganization, reloadOrganizations } = useOrganization();
  const isAgency = mode === "agency";
  const entityLabel = isAgency ? "consultoria" : "empresa";

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pré-popular com dados existentes da empresa
  useEffect(() => {
    if (!currentAccount?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      const { data } = await supabase
        .from("companies")
        .select("name, website, whatsapp, logo_url")
        .eq("id", currentAccount.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setName(data.name ?? currentOrganization?.name ?? "");
        setWebsite(data.website ?? "");
        if (data.whatsapp) {
          // remove +55 prefix if present
          const local = data.whatsapp.replace(/^\+?55/, "");
          setWhatsapp(formatBrPhone(local));
        }
        if (data.logo_url) {
          setExistingLogoUrl(data.logo_url);
        }
      } else if (currentOrganization?.name) {
        setName(currentOrganization.name);
      }
      setLoadingExisting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentAccount?.id, currentOrganization?.name]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const slug = slugify(name);
  const generatedEmail = slug
    ? `curriculos-${slug}@candidatos.gentia.com.br`
    : "—";

  const whatsappDigits = whatsapp.replace(/\D/g, "");
  const whatsappValid = whatsappDigits.length === 10 || whatsappDigits.length === 11;
  const whatsappError = whatsapp.length > 0 && !whatsappValid;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2MB");
      return;
    }
    if (!["image/png", "image/svg+xml", "image/jpeg"].includes(file.type)) {
      toast.error("Use PNG, SVG ou JPG");
      return;
    }
    setLogoFile(file);
  };

  const copyEmail = async () => {
    if (slug) {
      await navigator.clipboard.writeText(generatedEmail);
      toast.success("E-mail copiado");
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !currentAccount) {
      toast.error(`Preencha o nome da ${entityLabel}`);
      return;
    }
    if (!whatsappValid) {
      toast.error("WhatsApp obrigatório");
      return;
    }
    setSaving(true);
    try {
      let logoUrl: string | null = existingLogoUrl;
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const path = `${currentAccount.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("consultancy-logos")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage
          .from("consultancy-logos")
          .getPublicUrl(path);
        logoUrl = pub.publicUrl;
      }

      const updates: Record<string, unknown> = {
        name: name.trim(),
        slug,
        whatsapp: `+55${whatsappDigits}`,
      };
      if (website.trim()) updates.website = website.trim();
      if (logoUrl) updates.logo_url = logoUrl;

      const { error: updErr } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", currentAccount.id);
      if (updErr) throw updErr;

      await reloadOrganizations();
      // Notify sidebar to refresh logo immediately
      window.dispatchEvent(new CustomEvent("company-logo-updated"));
      toast.success(`Perfil da ${entityLabel} salvo`);
      onComplete();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const displayedLogo = logoPreview ?? existingLogoUrl;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold">
          {isAgency ? "Perfil da consultoria" : "Perfil da empresa"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isAgency
            ? "Comece configurando os dados básicos da sua consultoria."
            : "Comece configurando os dados básicos da sua empresa."}
        </p>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="agency-name">
            {isAgency ? "Nome da consultoria *" : "Nome da empresa *"}
          </Label>
          <Input
            id="agency-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAgency ? "Ex: GENTIA Talent Hub" : "Ex: Acme S.A."}
            disabled={loadingExisting}
          />
        </div>

        <div className="space-y-2">
          <Label>Logo (PNG, SVG ou JPG — até 2MB)</Label>
          <div className="flex items-center gap-3">
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/50">
              {displayedLogo ? (
                <img src={displayedLogo} alt="logo" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            {(logoFile || existingLogoUrl) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoFile(null);
                  if (!logoFile) setExistingLogoUrl(null);
                }}
              >
                Remover
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-whatsapp">WhatsApp *</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
              +55
            </span>
            <Input
              id="agency-whatsapp"
              className="rounded-l-none"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatBrPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              disabled={loadingExisting}
            />
          </div>
          {whatsappError && (
            <p className="text-destructive text-xs">
              WhatsApp é obrigatório para receber notificações do GENTIA.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-site">Site (opcional)</Label>
          <Input
            id="agency-site"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            disabled={loadingExisting}
          />
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Label className="text-xs text-muted-foreground">
            E-mail para captura de currículos
          </Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-sm">{generatedEmail}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyEmail}
              disabled={!slug}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={saving || loadingExisting || !name.trim() || !whatsappValid}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar e continuar
        </Button>
      </div>
    </div>
  );
}
