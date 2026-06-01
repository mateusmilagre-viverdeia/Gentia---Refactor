import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Check, MessageCircle, Users, Settings, Wand2, Mail, MessageSquare } from "lucide-react";
import { useOutreachCampaigns } from "@/hooks/useOutreachCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useQuery } from "@tanstack/react-query";

interface Props {
  onClose: () => void;
}

const steps = [
  { id: 1, title: "Informações", icon: MessageCircle },
  { id: 2, title: "Audiência", icon: Users },
  { id: 3, title: "Mensagem", icon: Wand2 },
  { id: 4, title: "Automação", icon: Settings },
];

export function OutreachCampaignWizard({ onClose }: Props) {
  const { createCampaign } = useOutreachCampaigns();
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    job_id: "",
    channel: "whatsapp" as "whatsapp" | "email",
    from_email: "",
    from_name: "",
    subject_template: "Oportunidade que pode te interessar",
    target_source: "hunting_results",
    max_contacts: 100,
    initial_message_template: "Olá {nome}! 👋\n\nVi seu perfil e acredito que você seria um ótimo fit para uma oportunidade que estamos trabalhando.\n\nPosso te contar mais sobre?",
    ai_persona: "Recrutador profissional, amigável e objetivo. Usa linguagem casual mas respeitosa.",
    auto_reply_enabled: true,
    max_auto_replies: 5,
    reply_delay_minutes: 5,
    daily_send_limit: 50,
  });

  // Fetch jobs for selection
  const { data: jobs } = useQuery({
    queryKey: ["recruitment-jobs", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const { data } = await supabase
        .from("recruitment_jobs")
        .select("id, title")
        .eq("account_id", currentOrganization.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: {
        if (formData.name.trim().length === 0) return false;
        if (formData.channel === "email") {
          const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.from_email);
          if (!emailOk) return false;
          if (formData.subject_template.trim().length === 0) return false;
        }
        return true;
      }
      case 2:
        return formData.target_source && formData.max_contacts > 0;
      case 3:
        return formData.initial_message_template.trim().length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const campaign = await createCampaign({
        name: formData.name,
        description: formData.description || null,
        job_id: formData.job_id || null,
        target_source: formData.target_source,
        max_contacts: formData.max_contacts,
        initial_message_template: formData.initial_message_template,
        ai_persona: formData.ai_persona || null,
        auto_reply_enabled: formData.auto_reply_enabled,
        max_auto_replies: formData.max_auto_replies,
        reply_delay_minutes: formData.reply_delay_minutes,
        daily_send_limit: formData.daily_send_limit,
        channel: formData.channel,
        from_email: formData.channel === "email" ? formData.from_email : null,
        from_name: formData.channel === "email" ? (formData.from_name || null) : null,
        subject_template: formData.channel === "email" ? formData.subject_template : null,
      });

      if (campaign) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova Campanha de Outreach</h1>
          <p className="text-muted-foreground">Configure sua campanha de prospecção automatizada</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center gap-2 ${isActive ? "text-primary" : isCompleted ? "text-primary/60" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : isCompleted ? "bg-primary/20" : "bg-muted"}`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </div>
                <span className="text-sm font-medium hidden md:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${currentStep > step.id ? "bg-primary/60" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Informações Básicas"}
            {currentStep === 2 && "Selecione a Audiência"}
            {currentStep === 3 && "Configure a Mensagem"}
            {currentStep === 4 && "Automação e Limites"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Defina o nome e objetivo da campanha"}
            {currentStep === 2 && "Escolha de onde virão os contatos para a campanha"}
            {currentStep === 3 && "Personalize a mensagem inicial e a persona da IA"}
            {currentStep === 4 && "Configure respostas automáticas e limites de envio"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Campanha *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Prospecção Devs Senior - Q1 2025"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo da campanha..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_id">Vaga Relacionada (opcional)</Label>
                <Select 
                  value={formData.job_id || "_none"} 
                  onValueChange={(v) => updateField("job_id", v === "_none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma vaga..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma vaga específica</SelectItem>
                    {jobs?.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Channel selection */}
              <div className="space-y-2">
                <Label>Canal de envio *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "whatsapp", label: "WhatsApp", icon: MessageSquare, description: "Envio via Z-API" },
                    { value: "email", label: "Email", icon: Mail, description: "Envio + recebimento via Resend" },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = formData.channel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField("channel", opt.value)}
                        className={`p-4 rounded-lg border text-left transition-colors ${active ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{opt.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.channel === "email" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="from_email">Email remetente *</Label>
                      <Input
                        id="from_email"
                        type="email"
                        placeholder="recrutamento@suaempresa.com"
                        value={formData.from_email}
                        onChange={(e) => updateField("from_email", e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Domínio precisa estar verificado no Resend.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from_name">Nome remetente</Label>
                      <Input
                        id="from_name"
                        placeholder="Recrutamento Empresa"
                        value={formData.from_name}
                        onChange={(e) => updateField("from_name", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject_template">Assunto do email *</Label>
                    <Input
                      id="subject_template"
                      placeholder="Olá {{candidate_name}}, oportunidade para você"
                      value={formData.subject_template}
                      onChange={(e) => updateField("subject_template", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{{candidate_name}}"} para personalizar.
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Audience */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label>Fonte dos Contatos *</Label>
                <div className="grid gap-3">
                  {[
                    { value: "hunting_results", label: "Resultados de Hunting", description: "Candidatos encontrados nas buscas de hunting" },
                    { value: "talent_pool", label: "Talent Pool", description: "Candidatos do banco de talentos" },
                    { value: "candidates", label: "Candidatos Existentes", description: "Candidatos já cadastrados no ATS" },
                  ].map((option) => (
                    <div
                      key={option.value}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${formData.target_source === option.value ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}
                      onClick={() => updateField("target_source", option.value)}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_contacts">Máximo de Contatos</Label>
                <Input
                  id="max_contacts"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.max_contacts}
                  onChange={(e) => updateField("max_contacts", parseInt(e.target.value) || 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Custo: {Math.ceil(formData.max_contacts / 100) * 15} créditos (15 por 100 contatos)
                </p>
              </div>
            </>
          )}

          {/* Step 3: Message */}
          {currentStep === 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="initial_message_template">Mensagem Inicial *</Label>
                <Textarea
                  id="initial_message_template"
                  placeholder="Olá {nome}! ..."
                  value={formData.initial_message_template}
                  onChange={(e) => updateField("initial_message_template", e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{nome}"} para personalizar com o nome do candidato. A IA pode ajustar o tom automaticamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_persona">Persona da IA</Label>
                <Textarea
                  id="ai_persona"
                  placeholder="Ex: Recrutador profissional, amigável e objetivo..."
                  value={formData.ai_persona}
                  onChange={(e) => updateField("ai_persona", e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Define como a IA vai personalizar mensagens e responder automaticamente.
                </p>
              </div>
            </>
          )}

          {/* Step 4: Automation */}
          {currentStep === 4 && (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label>Respostas Automáticas com IA</Label>
                  <p className="text-sm text-muted-foreground">
                    A IA responde automaticamente aos candidatos
                  </p>
                </div>
                <Switch
                  checked={formData.auto_reply_enabled}
                  onCheckedChange={(v) => updateField("auto_reply_enabled", v)}
                />
              </div>

              {formData.auto_reply_enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="max_auto_replies">Máximo de Respostas Automáticas por Conversa</Label>
                    <Input
                      id="max_auto_replies"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.max_auto_replies}
                      onChange={(e) => updateField("max_auto_replies", parseInt(e.target.value) || 5)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reply_delay_minutes">Delay entre Respostas (minutos)</Label>
                    <Input
                      id="reply_delay_minutes"
                      type="number"
                      min={1}
                      max={60}
                      value={formData.reply_delay_minutes}
                      onChange={(e) => updateField("reply_delay_minutes", parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tempo de espera antes de enviar respostas automáticas para parecer mais natural.
                    </p>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="daily_send_limit">Limite Diário de Envios</Label>
                <Input
                  id="daily_send_limit"
                  type="number"
                  min={10}
                  max={200}
                  value={formData.daily_send_limit}
                  onChange={(e) => updateField("daily_send_limit", parseInt(e.target.value) || 50)}
                />
                <p className="text-xs text-muted-foreground">
                  Limita a quantidade de mensagens enviadas por dia para evitar bloqueios.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={currentStep === 1 ? onClose : handlePrev}>
          {currentStep === 1 ? "Cancelar" : (
            <>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </>
          )}
        </Button>

        {currentStep < 4 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Próximo
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting || !canProceed()}>
            {isSubmitting ? "Criando..." : "Criar Campanha"}
          </Button>
        )}
      </div>
    </div>
  );
}
