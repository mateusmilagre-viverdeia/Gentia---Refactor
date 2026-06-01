import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Sparkles, RefreshCw, MessageSquare, Phone, User, Instagram, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HuntingApproachModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  candidatePhone?: string | null;
  generatedMessage: string;
  matchScore?: number | null;
  approachId: string;
  accountId?: string;
  extractedData?: any;
  onSend: (message: string, phone: string, personaId?: string) => Promise<void>;
  onRegenerate: (personaId?: string) => Promise<string>;
  isSending?: boolean;
}

export function HuntingApproachModal({
  open,
  onOpenChange,
  candidateName,
  candidatePhone,
  generatedMessage,
  matchScore,
  approachId,
  accountId,
  extractedData,
  onSend,
  onRegenerate,
  isSending = false,
}: HuntingApproachModalProps) {
  const [message, setMessage] = useState(generatedMessage);
  const [phone, setPhone] = useState(candidatePhone || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [charCount, setCharCount] = useState(generatedMessage.length);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('none');

  const MAX_CHARS = 300;

  // Fetch personas
  const { data: personas = [] } = useQuery({
    queryKey: ['outreach-personas', accountId],
    queryFn: async () => {
      if (!accountId) return [];
      const { data } = await supabase
        .from('hunting_outreach_personas')
        .select('id, name, tone')
        .eq('account_id', accountId)
        .order('name');
      return data || [];
    },
    enabled: !!accountId && open,
  });

  useEffect(() => {
    setMessage(generatedMessage);
    setCharCount(generatedMessage.length);
  }, [generatedMessage]);

  const handleMessageChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setMessage(value);
      setCharCount(value.length);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const pid = selectedPersonaId !== 'none' ? selectedPersonaId : undefined;
      const newMessage = await onRegenerate(pid);
      setMessage(newMessage);
      setCharCount(newMessage.length);
      toast.success('Mensagem regenerada!');
    } catch {
      toast.error('Erro ao regenerar mensagem');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      toast.error('Informe o telefone do candidato');
      return;
    }
    if (!message.trim()) {
      toast.error('A mensagem não pode estar vazia');
      return;
    }
    try {
      const pid = selectedPersonaId !== 'none' ? selectedPersonaId : undefined;
      await onSend(message, phone, pid);
      onOpenChange(false);
    } catch {
      // Error handled in parent
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Abordar Candidato
          </DialogTitle>
          <DialogDescription>
            Revise e personalize a mensagem gerada por IA antes de enviar via WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">{candidateName}</p>
              <p className="text-sm text-muted-foreground">Candidato via Hunting</p>
            </div>
            {matchScore != null && (
              <Badge variant="outline" className="bg-primary/10 text-primary">
                {matchScore}% match
              </Badge>
            )}
          </div>

          {/* DISC Behavioral Insights */}
          {extractedData?.inferred_disc && (() => {
            const disc = extractedData.inferred_disc;
            const commStyle = extractedData.communication_style;
            const insights = extractedData.personality_insights || [];
            const igData = extractedData.instagram_data;
            
            const toneLabels: Record<string, string> = {
              'D': '🎯 Direto e orientado a resultados',
              'I': '🌟 Entusiasmado e relacional',
              'S': '🤝 Calmo e cooperativo',
              'C': '📊 Técnico e analítico',
            };
            
            const styleLabels: Record<string, string> = {
              direct: 'Direto',
              enthusiastic: 'Entusiasmado',
              calm: 'Calmo',
              analytical: 'Analítico',
              balanced: 'Equilibrado',
            };

            return (
              <div className="p-3 rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-medium">Perfil Comportamental (DISC)</span>
                  {extractedData.disc_confidence && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      {extractedData.disc_confidence}% confiança
                    </Badge>
                  )}
                </div>
                
                {/* DISC Bars */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { label: 'D', value: disc.d, color: 'bg-red-400' },
                    { label: 'I', value: disc.i, color: 'bg-yellow-400' },
                    { label: 'S', value: disc.s, color: 'bg-green-400' },
                    { label: 'C', value: disc.c, color: 'bg-blue-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <div className="font-semibold">{label}</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-0.5">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
                      </div>
                      <div className="text-muted-foreground">{value}</div>
                    </div>
                  ))}
                </div>
                
                {/* Recommended Tone */}
                <div className="text-xs">
                  <span className="text-muted-foreground">Tom recomendado: </span>
                  <span className="font-medium">{toneLabels[disc.primary] || 'Equilibrado'}</span>
                </div>
                
                {commStyle && commStyle !== 'balanced' && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Estilo: </span>
                    <span>{styleLabels[commStyle] || commStyle}</span>
                  </div>
                )}
                
                {/* Top insights */}
                {insights.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {insights.slice(0, 2).map((insight: string, i: number) => (
                      <p key={i}>💡 {insight}</p>
                    ))}
                  </div>
                )}
                
                {/* Instagram badge */}
                {igData?.username && (
                  <div className="flex items-center gap-1 text-xs">
                    <Instagram className="h-3 w-3 text-pink-500" />
                    <span className="text-muted-foreground">@{igData.username} • {igData.posts?.length || 0} posts analisados</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Persona Selector */}
          {personas.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Persona de Abordagem
              </Label>
              <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma persona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Padrão (sem persona)</SelectItem>
                  {personas.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.tone ? `(${p.tone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp do candidato
            </Label>
            <Input
              id="phone"
              placeholder="+55 (11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="font-mono"
            />
            {!candidatePhone && (
              <p className="text-xs text-muted-foreground">
                Telefone não detectado no perfil. Informe manualmente.
              </p>
            )}
          </div>

          {/* Message Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Mensagem gerada por IA
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Regenerar
              </Button>
            </div>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              className="min-h-[120px] resize-none"
              placeholder="Mensagem de abordagem..."
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Você pode editar a mensagem antes de enviar</span>
              <span className={charCount > MAX_CHARS * 0.9 ? 'text-destructive' : ''}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={isSending || !phone.trim() || !message.trim()}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
