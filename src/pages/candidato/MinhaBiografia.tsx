import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCandidateProfile } from "@/contexts/CandidateProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { CandidateNavbar } from "@/components/candidate/CandidateNavbar";
import { AddEducationDialog } from "@/components/candidate/AddEducationDialog";
import { AddWorkHistoryDialog } from "@/components/candidate/AddWorkHistoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trash2, 
  Plus, 
  Camera, 
  FileText, 
  Upload, 
  GraduationCap, 
  Briefcase,
  User,
  Loader2,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { parse } from "date-fns";
import { formatBRT } from "@/lib/datetime";
import { useSignedFileUrl } from "@/lib/storageUrl";

interface Education {
  id?: string;
  course_name: string;
  degree_type: string;
}

interface WorkHistory {
  id?: string;
  position: string;
  company: string;
  responsibilities: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface ProfileData {
  id?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  phone: string;
  city: string;
  state: string;
  gender: string;
  linkedin_url: string;
  other_social_urls: string;
  avatar_url: string;
  cv_url: string;
}

const BRAZILIAN_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

export default function MinhaBiografia() {
  const { user } = useAuth();
  const { reloadProfile: reloadContextProfile } = useCandidateProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get("vaga");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [showEducationDialog, setShowEducationDialog] = useState(false);
  const [showWorkDialog, setShowWorkDialog] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    first_name: "",
    last_name: "",
    birth_date: "",
    phone: "",
    city: "",
    state: "",
    gender: "",
    linkedin_url: "",
    other_social_urls: "",
    avatar_url: "",
    cv_url: "",
  });
  
  const [educationList, setEducationList] = useState<Education[]>([]);
  const [workHistoryList, setWorkHistoryList] = useState<WorkHistory[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("candidate_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (profileData) {
        setProfile({
          id: profileData.id,
          first_name: (profileData as any).first_name || profileData.full_name?.split(" ")[0] || "",
          last_name: (profileData as any).last_name || profileData.full_name?.split(" ").slice(1).join(" ") || "",
          birth_date: profileData.birth_date ? formatBRT(new Date(profileData.birth_date), "dd/MM/yyyy") : "",
          phone: profileData.phone || "",
          city: profileData.city || "",
          state: (profileData as any).state || "",
          gender: profileData.gender || "",
          linkedin_url: profileData.linkedin_url || "",
          other_social_urls: profileData.other_social_urls || "",
          avatar_url: profileData.avatar_url || "",
          cv_url: profileData.cv_url || "",
        });
        
        const { data: educationData } = await supabase
          .from("candidate_education")
          .select("*")
          .eq("candidate_profile_id", profileData.id);
        
        if (educationData) {
          setEducationList(educationData.map(e => ({
            id: e.id,
            course_name: e.course_name,
            degree_type: e.degree_type,
          })));
        }
        
        const { data: workData } = await supabase
          .from("candidate_work_history")
          .select("*")
          .eq("candidate_profile_id", profileData.id)
          .order("start_date", { ascending: false });
        
        if (workData) {
          setWorkHistoryList(workData.map(w => ({
            id: w.id,
            position: w.position,
            company: w.company,
            responsibilities: w.responsibilities || "",
            start_date: w.start_date ? formatBRT(new Date(w.start_date), "MM/yyyy") : "",
            end_date: w.end_date ? formatBRT(new Date(w.end_date), "MM/yyyy") : "",
            is_current: w.is_current,
          })));
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;
    try {
      // Strip non-digit characters for pure-digit detection
      const digitsOnly = dateStr.replace(/\D/g, "");

      // Try DD/MM/YYYY format (with separators)
      if (dateStr.includes("/") && dateStr.length > 7) {
        const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) return formatBRT(parsed, "yyyy-MM-dd");
      }
      // Try MM/YYYY format (with separator)
      if (dateStr.includes("/") && dateStr.length <= 7) {
        const parsed = parse(dateStr, "MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) return formatBRT(parsed, "yyyy-MM-dd");
      }
      // 8 digits without separator: DDMMYYYY
      if (digitsOnly.length === 8 && !dateStr.includes("/")) {
        const withSlashes = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4)}`;
        const parsed = parse(withSlashes, "dd/MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) return formatBRT(parsed, "yyyy-MM-dd");
      }
      // 6 digits without separator: MMYYYY
      if (digitsOnly.length === 6 && !dateStr.includes("/")) {
        const withSlash = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
        const parsed = parse(withSlash, "MM/yyyy", new Date());
        if (!isNaN(parsed.getTime())) return formatBRT(parsed, "yyyy-MM-dd");
      }
      return null;
    } catch {
      return null;
    }
  };

  // Auto-mask: inserts "/" as user types digits
  const applyDateMask = (value: string, pattern: "DD/MM/AAAA" | "MM/AAAA"): string => {
    const digits = value.replace(/\D/g, "");
    if (pattern === "DD/MM/AAAA") {
      const maxLen = 8;
      const d = digits.slice(0, maxLen);
      if (d.length <= 2) return d;
      if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
      return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
    }
    // MM/AAAA
    const maxLen = 6;
    const d = digits.slice(0, maxLen);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("candidate-files")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Bucket privado: salvamos o PATH; a exibição gera signed URL on-demand.
      setProfile({ ...profile, avatar_url: filePath });
      toast.success("Foto atualizada!");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao fazer upload da foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      toast.error("Por favor, selecione um arquivo PDF ou Word");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 10MB");
      return;
    }

    setUploadingCV(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/cv.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("candidate-files")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Bucket privado: salvamos o PATH; o download gera signed URL on-demand.
      setProfile({ ...profile, cv_url: filePath });
      toast.success("Currículo atualizado!");
    } catch (error) {
      console.error("Error uploading CV:", error);
      toast.error("Erro ao fazer upload do currículo");
    } finally {
      setUploadingCV(false);
    }
  };

  const handleAddEducation = (edu: Education) => {
    setEducationList([...educationList, edu]);
  };

  const handleRemoveEducation = (index: number) => {
    setEducationList(educationList.filter((_, i) => i !== index));
  };

  const handleAddWorkHistory = (work: WorkHistory) => {
    setWorkHistoryList([...workHistoryList, work]);
  };

  const handleRemoveWorkHistory = (index: number) => {
    setWorkHistoryList(workHistoryList.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    
    // Required biographical fields (used to gate voice interviews)
    const requiredErrors: string[] = [];
    if (!profile.first_name?.trim()) requiredErrors.push("Nome");
    if (!profile.last_name?.trim()) requiredErrors.push("Sobrenome");
    if (!profile.birth_date?.trim()) requiredErrors.push("Data de Nascimento");
    if (!profile.phone?.trim()) requiredErrors.push("Telefone");
    if (!profile.city?.trim()) requiredErrors.push("Cidade");
    if (!profile.state?.trim()) requiredErrors.push("Estado");
    if (requiredErrors.length > 0) {
      toast.error(`Preencha os campos obrigatórios: ${requiredErrors.join(", ")}`);
      return;
    }

    // Validate birth_date format
    if (!parseDate(profile.birth_date)) {
      toast.error("Data de Nascimento inválida. Use o formato DD/MM/AAAA.");
      return;
    }

    // Validate work history dates before saving
    for (let i = 0; i < workHistoryList.length; i++) {
      const w = workHistoryList[i];
      if (!w.start_date || !parseDate(w.start_date)) {
        toast.error(`Experiência "${w.position || `#${i + 1}`}": data de início inválida. Use MM/AAAA.`);
        return;
      }
      if (!w.is_current && w.end_date && !parseDate(w.end_date)) {
        toast.error(`Experiência "${w.position || `#${i + 1}`}": data de término inválida. Use MM/AAAA.`);
        return;
      }
    }
    
    setSaving(true);
    
    try {
      const fullName = `${profile.first_name} ${profile.last_name}`.trim();
      const profilePayload: any = {
        user_id: user.id,
        full_name: fullName,
        first_name: profile.first_name,
        last_name: profile.last_name,
        birth_date: parseDate(profile.birth_date),
        phone: profile.phone || null,
        city: profile.city || null,
        state: profile.state || null,
        gender: profile.gender || null,
        linkedin_url: profile.linkedin_url || null,
        other_social_urls: profile.other_social_urls || null,
        avatar_url: profile.avatar_url || null,
        cv_url: profile.cv_url || null,
      };

      let profileId = profile.id;
      
      if (profileId) {
        const { error } = await supabase
          .from("candidate_profiles")
          .update(profilePayload)
          .eq("id", profileId);
        
        if (error) {
          console.error("Erro ao atualizar perfil:", error);
          toast.error(`Erro ao salvar dados pessoais: ${error.message}`);
          return;
        }
      } else {
        const { data, error } = await supabase
          .from("candidate_profiles")
          .insert(profilePayload)
          .select("id")
          .single();
        
        if (error) {
          console.error("Erro ao criar perfil:", error);
          toast.error(`Erro ao criar perfil: ${error.message}`);
          return;
        }
        profileId = data.id;
      }
      
      if (profileId) {
        // Education
        const { error: delEduErr } = await supabase.from("candidate_education").delete().eq("candidate_profile_id", profileId);
        if (delEduErr) {
          console.error("Erro ao limpar formação:", delEduErr);
          toast.error(`Erro ao salvar formação acadêmica: ${delEduErr.message}`);
          return;
        }

        if (educationList.length > 0) {
          const educationPayload = educationList.map(e => ({
            candidate_profile_id: profileId,
            course_name: e.course_name,
            degree_type: e.degree_type,
          }));
          
          const { error: eduError } = await supabase
            .from("candidate_education")
            .insert(educationPayload);
          
          if (eduError) {
            console.error("Erro ao salvar formação:", eduError);
            toast.error(`Erro ao salvar formação acadêmica: ${eduError.message}`);
            return;
          }
        }

        // Work history
        const { error: delWorkErr } = await supabase.from("candidate_work_history").delete().eq("candidate_profile_id", profileId);
        if (delWorkErr) {
          console.error("Erro ao limpar experiência:", delWorkErr);
          toast.error(`Erro ao salvar experiência profissional: ${delWorkErr.message}`);
          return;
        }
        
        if (workHistoryList.length > 0) {
          const workPayload = workHistoryList.map(w => ({
            candidate_profile_id: profileId,
            position: w.position,
            company: w.company,
            responsibilities: w.responsibilities || null,
            start_date: parseDate(w.start_date)!,
            end_date: w.is_current ? null : parseDate(w.end_date),
            is_current: w.is_current,
          }));
          
          const { error: workError } = await supabase
            .from("candidate_work_history")
            .insert(workPayload);
          
          if (workError) {
            console.error("Erro ao salvar experiência:", workError);
            toast.error(`Erro ao salvar experiência profissional: ${workError.message}`);
            return;
          }
        }
      }
      
      toast.success("Perfil salvo com sucesso!");
      
      // Reload context profile to update navbar across all pages
      await reloadContextProfile();
      
      if (jobIdFromUrl) {
        navigate(`/candidato/aplicar/${jobIdFromUrl}`);
      } else {
        await loadProfile();
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(`Erro inesperado ao salvar perfil: ${error?.message || "verifique o console"}`);
    } finally {
      setSaving(false);
    }
  };

  // Bucket privado: resolve o path salvo em avatar_url para uma signed URL exibível.
  const avatarDisplayUrl = useSignedFileUrl("candidate-files", profile.avatar_url);

  const initials = [profile.first_name?.[0], profile.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <CandidateNavbar user={{ email: user?.email, firstName: profile.first_name, lastName: profile.last_name }} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <CandidateNavbar user={{ email: user?.email, firstName: profile.first_name, lastName: profile.last_name }} />
      
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Minha Biografia</h1>
          <p className="text-sm text-muted-foreground">
            Complete seu perfil para se candidatar às vagas
          </p>
        </div>

        <div className="space-y-4">
          {/* Photo and CV Section - Separated */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo Upload Card */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto de Perfil
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage src={avatarDisplayUrl ?? undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                      <AvatarFallback className="text-lg bg-muted">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 text-white" />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Clique na foto para alterar</p>
                    <p className="text-xs">JPG ou PNG, máx 5MB</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CV Upload Card */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Currículo
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <div
                  onClick={() => cvInputRef.current?.click()}
                  className="border border-dashed border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  {uploadingCV ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      <span className="text-sm">Enviando...</span>
                    </div>
                  ) : profile.cv_url ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Currículo enviado</p>
                        <p className="text-xs text-muted-foreground">Clique para substituir</p>
                      </div>
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Enviar currículo</p>
                        <p className="text-xs text-muted-foreground">PDF ou Word, máx 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCVUpload}
                  className="hidden"
                />
              </CardContent>
            </Card>
          </div>

          {/* Basic Info Section - Compact */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="Seu nome"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sobrenome *</Label>
                  <Input
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Seu sobrenome"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data de Nascimento *</Label>
                  <Input
                    value={profile.birth_date}
                    onChange={(e) => setProfile({ ...profile, birth_date: applyDateMask(e.target.value, "DD/MM/AAAA") })}
                    placeholder="DD/MM/AAAA"
                    maxLength={10}
                    className="h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Telefone *</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cidade *</Label>
                  <Input
                    value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    placeholder="São Paulo"
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estado (UF) *</Label>
                  <Select
                    value={profile.state}
                    onValueChange={(value) => setProfile({ ...profile, state: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Gênero</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="nao-binario">Não-binário</SelectItem>
                      <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Campos marcados com * são obrigatórios para liberar as entrevistas com IA.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">LinkedIn</Label>
                  <Input
                    value={profile.linkedin_url}
                    onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/seu-perfil"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Outras Redes</Label>
                  <Input
                    value={profile.other_social_urls}
                    onChange={(e) => setProfile({ ...profile, other_social_urls: e.target.value })}
                    placeholder="Instagram, Behance, etc."
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Education Section - Compact with Dialog */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Formação Acadêmica
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowEducationDialog(true)}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {educationList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma formação cadastrada
                </p>
              ) : (
                <div className="space-y-2">
                  {educationList.map((edu, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{edu.course_name}</p>
                          <p className="text-xs text-muted-foreground">{edu.degree_type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEducation(index)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Work History Section - Compact with Dialog */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Experiência Profissional
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowWorkDialog(true)}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {workHistoryList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma experiência cadastrada
                </p>
              ) : (
                <div className="space-y-2">
                  {workHistoryList.map((work, index) => (
                    <div 
                      key={index} 
                      className="py-2 px-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <Briefcase className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{work.position}</p>
                            <p className="text-xs text-muted-foreground">{work.company}</p>
                            <p className="text-xs text-muted-foreground">
                              {work.start_date} - {work.is_current ? "Atual" : work.end_date}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveWorkHistory(index)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spacer for fixed footer */}
          <div className="h-20" />
        </div>
      </main>

      {/* Fixed Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            disabled={saving}
            size="sm"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="min-w-24"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </div>
      </div>

      <AddEducationDialog
        open={showEducationDialog}
        onOpenChange={setShowEducationDialog}
        onAdd={handleAddEducation}
      />

      <AddWorkHistoryDialog
        open={showWorkDialog}
        onOpenChange={setShowWorkDialog}
        onAdd={handleAddWorkHistory}
      />
    </div>
  );
}
