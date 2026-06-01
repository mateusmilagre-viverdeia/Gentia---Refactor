import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ExternalLink, Linkedin, Instagram, Brain, Wrench, MessageSquare, Sparkles } from 'lucide-react';
import type { AnalysisStage, ProfileAnalysisResult } from '@/hooks/useProfileUrlAnalysis';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: AnalysisStage;
  result: ProfileAnalysisResult | null;
}

function scoreColor(s: number) {
  if (s >= 75) return 'text-emerald-600';
  if (s >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function scoreLabel(s: number) {
  if (s >= 80) return 'Excelente fit';
  if (s >= 60) return 'Bom fit';
  if (s >= 40) return 'Fit moderado';
  return 'Fit baixo';
}

export function HuntingProfileAnalysisSheet({ open, onOpenChange, stage, result }: Props) {
  const isLoading = stage === 'scraping' || stage === 'analyzing';

  const profile: any = result?.profile;
  const name = profile?.fullName || profile?.username || 'Perfil';
  const headline = profile?.headline || profile?.biography || '';
  const photo = profile?.profilePicture || profile?.profilePicUrl;

  const a = result?.analysis;
  const tech: any = a?.tech_fit;
  const discDom = a ? Math.max(a.inferred_disc.d, a.inferred_disc.i, a.inferred_disc.s, a.inferred_disc.c) : 0;
  const behavioral = a ? Math.round(discDom * (a.disc_confidence ?? 0.5)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Análise de perfil
          </SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">{stage === 'scraping' ? 'Extraindo dados do perfil…' : 'Analisando comportamento e fit…'}</p>
          </div>
        )}

        {!isLoading && result && a && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 py-4">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={photo} alt={name} />
                  <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold truncate">{name}</h3>
                    {result.source === 'linkedin' ? (
                      <Linkedin className="h-4 w-4 text-[#0A66C2]" />
                    ) : (
                      <Instagram className="h-4 w-4 text-pink-500" />
                    )}
                  </div>
                  {headline && <p className="text-sm text-muted-foreground line-clamp-2">{headline}</p>}
                  <a
                    href={result.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Abrir perfil original
                  </a>
                </div>
              </div>

              {/* Overall score */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Aderência geral</p>
                    <p className={`text-4xl font-bold ${scoreColor(result.overallScore)}`}>{result.overallScore}<span className="text-base text-muted-foreground">/100</span></p>
                    <p className="text-xs text-muted-foreground mt-1">{scoreLabel(result.overallScore)}{result.jobTitle ? ` para ${result.jobTitle}` : ''}</p>
                  </div>
                  <Badge variant="secondary">Prioridade {a.hunting_priority}/100</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {tech && (
                    <div>
                      <div className="flex justify-between text-xs"><span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> Técnico</span><span className="font-medium">{tech.score}/100</span></div>
                      <Progress value={tech.score} className="h-1.5" />
                    </div>
                  )}
                  <div>
                    <div className="flex justify-between text-xs"><span className="flex items-center gap-1"><Brain className="h-3 w-3" /> Comportamental</span><span className="font-medium">{behavioral}/100</span></div>
                    <Progress value={behavioral} className="h-1.5" />
                  </div>
                </div>
              </div>

              <Tabs defaultValue="resumo">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="tecnico" disabled={!tech}>Técnico</TabsTrigger>
                  <TabsTrigger value="disc">DISC</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="space-y-3 pt-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Estilo de comunicação</p>
                    <p className="text-sm">{a.communication_style}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Insights de personalidade</p>
                    <ul className="space-y-1 text-sm list-disc pl-4">
                      {a.personality_insights.map((i, idx) => <li key={idx}>{i}</li>)}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="tecnico" className="space-y-3 pt-3">
                  {tech && (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Score técnico</p>
                          <p className={`text-2xl font-semibold ${scoreColor(tech.score)}`}>{tech.score}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs text-muted-foreground">Senioridade</p>
                          <p className="text-sm font-medium">{tech.seniority_match ? '✓ Compatível' : '✗ Divergente'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-1">Skills encontradas ({tech.skills_matched.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {tech.skills_matched.map((s) => <Badge key={s} variant="outline" className="border-emerald-300 text-emerald-700">{s}</Badge>)}
                          {tech.skills_matched.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma skill diretamente identificada.</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-rose-700 mb-1">Skills faltantes ({tech.skills_missing.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {tech.skills_missing.map((s) => <Badge key={s} variant="outline" className="border-rose-300 text-rose-700">{s}</Badge>)}
                          {tech.skills_missing.length === 0 && <span className="text-xs text-muted-foreground">Sem gaps relevantes.</span>}
                        </div>
                      </div>
                      {tech.certifications_found?.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Certificações</p>
                          <div className="flex flex-wrap gap-1">
                            {tech.certifications_found.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="disc" className="space-y-3 pt-3">
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    {(['d', 'i', 's', 'c'] as const).map((k) => (
                      <div key={k} className="rounded-lg border p-2">
                        <p className="text-xs text-muted-foreground uppercase">{k}</p>
                        <p className="text-xl font-semibold">{a.inferred_disc[k]}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Perfil dominante: <strong>{a.inferred_disc.primary}</strong>
                    {a.inferred_disc.secondary ? <> · Secundário: <strong>{a.inferred_disc.secondary}</strong></> : null}
                    {' · '}Confiança: <strong>{Math.round((a.disc_confidence || 0) * 100)}%</strong>
                  </p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Evidências</p>
                    <ul className="space-y-2 text-sm">
                      {a.disc_evidence.map((e, idx) => (
                        <li key={idx} className="rounded-md border p-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="font-medium uppercase">{e.dimension}</span>
                            <span>+{e.score_contribution}</span>
                          </div>
                          <p className="text-sm mt-1">{e.evidence}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="posts" className="pt-3">
                  {result.posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum post público analisado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.posts.slice(0, 10).map((p, idx) => (
                        <li key={idx} className="rounded-md border p-3 text-sm flex gap-2">
                          <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="line-clamp-4">{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        {!isLoading && result && (
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
