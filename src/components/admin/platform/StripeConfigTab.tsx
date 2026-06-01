import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Check, AlertCircle, Plus, Save, CreditCard, Package, Zap, ShieldCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";
import { cn } from "@/lib/utils";

// Token config stored in localStorage
const TOKEN_CONFIG_KEY = 'platform_ai_token_config';

interface ModelCostEntry {
  label: string;
  cost_per_1m_input: number;  // USD per 1M tokens
  cost_per_1m_output: number; // USD per 1M tokens
  tag: string; // e.g. "audio" or "texto"
}

interface TokenConfig {
  usd_to_brl: number;
  tokens_per_credit: Record<string, number>;
  models: Record<string, ModelCostEntry>;
  // For ai_interview: split between audio and text tokens
  ai_interview_audio_token_ratio: number; // 0-1, fraction of tokens that are audio
}

const DEFAULT_TOKEN_CONFIG: TokenConfig = {
  usd_to_brl: 5.50,
  tokens_per_credit: {
    ai_interview: 15000,
    hunting: 8000,
    enrichment: 5000,
    outreach: 3000,
    marketplace: 2000,
    recruitment: 10000,
  },
  models: {
    'gpt-4o-mini-realtime': {
      label: 'GPT-4o Mini Realtime',
      cost_per_1m_input: 10.00,
      cost_per_1m_output: 20.00,
      tag: 'áudio',
    },
    'gemini-3-flash': {
      label: 'Gemini 3 Flash',
      cost_per_1m_input: 0.15,
      cost_per_1m_output: 0.60,
      tag: 'texto',
    },
  },
  ai_interview_audio_token_ratio: 0.4, // 40% audio, 60% text
};

function loadTokenConfig(): TokenConfig {
  try {
    const stored = localStorage.getItem(TOKEN_CONFIG_KEY);
    if (stored) return { ...DEFAULT_TOKEN_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_TOKEN_CONFIG;
}

function saveTokenConfig(config: TokenConfig) {
  localStorage.setItem(TOKEN_CONFIG_KEY, JSON.stringify(config));
}

function calcAICost(credits: number, creditType: string, config: TokenConfig): number {
  const tokensPerCredit = config.tokens_per_credit[creditType] || config.tokens_per_credit.recruitment || 10000;
  const totalTokens = tokensPerCredit * credits;

  if (creditType === 'ai_interview') {
    // Composite: audio (realtime) + text (gemini)
    const audioModel = config.models['gpt-4o-mini-realtime'];
    const textModel = config.models['gemini-3-flash'];
    const audioRatio = config.ai_interview_audio_token_ratio;
    const tokensAudio = totalTokens * audioRatio;
    const tokensText = totalTokens * (1 - audioRatio);
    
    const audioCostUSD = (tokensAudio / 1_000_000) * ((audioModel?.cost_per_1m_input ?? 10) * 0.5 + (audioModel?.cost_per_1m_output ?? 20) * 0.5);
    const textCostUSD = (tokensText / 1_000_000) * ((textModel?.cost_per_1m_input ?? 0.15) * 0.6 + (textModel?.cost_per_1m_output ?? 0.60) * 0.4);
    return (audioCostUSD + textCostUSD) * config.usd_to_brl;
  }

  // Text-only types use gemini
  const textModel = config.models['gemini-3-flash'];
  const avgCostPer1M = ((textModel?.cost_per_1m_input ?? 0.15) * 0.6 + (textModel?.cost_per_1m_output ?? 0.60) * 0.4);
  return (totalTokens / 1_000_000) * avgCostPer1M * config.usd_to_brl;
}

function calcFeePercent(priceCents: number, aiCostBRL: number): number | null {
  const priceReal = priceCents / 100;
  if (priceReal <= 0) return null;
  return ((priceReal - aiCostBRL) / priceReal) * 100;
}

interface StripePrice {
  id: string;
  product: string;
  product_name: string | null;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
  active: boolean;
  nickname: string | null;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  credit_type: string;
  bonus_percent: number | null;
  is_popular: boolean | null;
  is_active: boolean | null;
  description: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  display_order: number | null;
}

interface CreditCost {
  id: string;
  feature_key: string;
  credit_type: string;
  credits_per_use: number;
  usage_unit: string;
  description: string | null;
  is_active: boolean | null;
}

export function StripeConfigTab() {
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [costs, setCosts] = useState<CreditCost[]>([]);
  const [loading, setLoading] = useState({ products: false, packages: false, costs: false, officialPrices: false });
  const [editingPackage, setEditingPackage] = useState<Record<string, Partial<CreditPackage>>>({});
  const [editingCost, setEditingCost] = useState<Record<string, Partial<CreditCost>>>({});
  const [savingPackage, setSavingPackage] = useState<string | null>(null);
  const [syncingPackage, setSyncingPackage] = useState<string | null>(null);
  const [savingCost, setSavingCost] = useState<string | null>(null);
  const [showNewPackage, setShowNewPackage] = useState(false);
  const [newPackage, setNewPackage] = useState({ name: '', credits: 0, price_cents: 0, credit_type: 'recruitment', bonus_percent: 0, description: '' });
  const [creatingPackage, setCreatingPackage] = useState(false);

  // Official prices state
  const [officialPriceOrgBase, setOfficialPriceOrgBase] = useState('');
  const [officialPriceSeat, setOfficialPriceSeat] = useState('');
  const [officialPricesLoaded, setOfficialPricesLoaded] = useState(false);
  const [savingOfficialPrices, setSavingOfficialPrices] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(l => ({ ...l, products: true }));
    const { data } = await invokeAuthenticatedFunction<{ prices: StripePrice[] }>(
      'platform-admin-stripe', { action: 'list-products' }
    );
    if (data) setPrices(data.prices || []);
    setLoading(l => ({ ...l, products: false }));
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(l => ({ ...l, packages: true }));
    const { data } = await invokeAuthenticatedFunction<{ packages: CreditPackage[] }>(
      'platform-admin-stripe', { action: 'list-packages' }
    );
    if (data) setPackages(data.packages || []);
    setLoading(l => ({ ...l, packages: false }));
  }, []);

  const fetchCosts = useCallback(async () => {
    setLoading(l => ({ ...l, costs: true }));
    const { data } = await invokeAuthenticatedFunction<{ costs: CreditCost[] }>(
      'platform-admin-stripe', { action: 'list-costs' }
    );
    if (data) setCosts(data.costs || []);
    setLoading(l => ({ ...l, costs: false }));
  }, []);

  const fetchOfficialPrices = useCallback(async () => {
    setLoading(l => ({ ...l, officialPrices: true }));
    const { data } = await invokeAuthenticatedFunction<{ config: { price_org_base: string; price_seat_additional: string } }>(
      'platform-admin-stripe', { action: 'get-official-prices' }
    );
    if (data?.config) {
      setOfficialPriceOrgBase(data.config.price_org_base);
      setOfficialPriceSeat(data.config.price_seat_additional);
      setOfficialPricesLoaded(true);
    }
    setLoading(l => ({ ...l, officialPrices: false }));
  }, []);

  const handleSaveOfficialPrices = async () => {
    if (!officialPriceOrgBase || !officialPriceSeat) {
      toast.error('Selecione ambos os preços');
      return;
    }
    setSavingOfficialPrices(true);
    const { error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
      action: 'set-official-prices',
      price_org_base: officialPriceOrgBase,
      price_seat_additional: officialPriceSeat,
    });
    if (error) {
      toast.error(`Erro ao salvar: ${error}`);
    } else {
      toast.success('Produto oficial atualizado com sucesso');
    }
    setSavingOfficialPrices(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchPackages();
    fetchCosts();
    fetchOfficialPrices();
  }, [fetchProducts, fetchPackages, fetchCosts, fetchOfficialPrices]);

  // Edge function uses GET params but invokeAuthenticatedFunction sends body.
  // We need to call via the function with action in the body, but the edge function reads from URL params.
  // Let's fix: the edge function should also accept action from body. But since we follow the whatsapp pattern,
  // let's use supabase.functions.invoke with GET method workaround.
  // Actually invokeAuthenticatedFunction always POSTs. Let's adjust to pass action in body and update edge function.

  const handleSavePackage = async (pkg: CreditPackage) => {
    const edits = editingPackage[pkg.id];
    if (!edits || Object.keys(edits).length === 0) return;

    setSavingPackage(pkg.id);
    const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
      action: 'update-package',
      id: pkg.id,
      ...edits,
    });
    if (error) {
      toast.error(`Erro ao salvar: ${error}`);
    } else {
      toast.success('Pacote atualizado com sucesso');
      setEditingPackage(prev => { const n = { ...prev }; delete n[pkg.id]; return n; });
      fetchPackages();
    }
    setSavingPackage(null);
  };

  const handleSaveCost = async (cost: CreditCost) => {
    const edits = editingCost[cost.id];
    if (!edits || Object.keys(edits).length === 0) return;

    setSavingCost(cost.id);
    const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
      action: 'update-cost',
      id: cost.id,
      ...edits,
    });
    if (error) {
      toast.error(`Erro ao salvar: ${error}`);
    } else {
      toast.success('Custo atualizado com sucesso');
      setEditingCost(prev => { const n = { ...prev }; delete n[cost.id]; return n; });
      fetchCosts();
    }
    setSavingCost(null);
  };

  const handleCreatePackage = async () => {
    if (!newPackage.name || !newPackage.credits || !newPackage.price_cents) {
      toast.error('Preencha nome, créditos e preço');
      return;
    }
    setCreatingPackage(true);
    const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
      action: 'create-package',
      ...newPackage,
    });
    if (error) {
      toast.error(`Erro ao criar: ${error}`);
    } else {
      toast.success('Pacote criado e sincronizado com Stripe');
      setShowNewPackage(false);
      setNewPackage({ name: '', credits: 0, price_cents: 0, credit_type: 'recruitment', bonus_percent: 0, description: '' });
      fetchPackages();
    }
    setCreatingPackage(false);
  };

  const updatePackageField = (id: string, field: string, value: unknown) => {
    setEditingPackage(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const updateCostField = (id: string, field: string, value: unknown) => {
    setEditingCost(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const groupedPackages = packages.reduce<Record<string, CreditPackage[]>>((acc, pkg) => {
    if (!acc[pkg.credit_type]) acc[pkg.credit_type] = [];
    acc[pkg.credit_type].push(pkg);
    return acc;
  }, {});

  const creditTypeLabels: Record<string, string> = {
    recruitment: 'Recrutamento',
    hunting: 'Hunting',
    enrichment: 'Enriquecimento',
    ai_interview: 'IA & Entrevistas',
    outreach: 'Outreach',
    marketplace: 'Marketplace',
  };

  const usageUnitLabels: Record<string, string> = {
    per_use: 'Por uso',
    per_minute: 'Por minuto',
    per_hour: 'Por hora',
  };

  // Token config for AI cost estimation
  const [tokenConfig, setTokenConfig] = useState<TokenConfig>(loadTokenConfig);

  const updateTokenConfig = (updates: Partial<TokenConfig>) => {
    setTokenConfig(prev => {
      const next = { ...prev, ...updates };
      saveTokenConfig(next);
      return next;
    });
  };

  const updateTokensPerCredit = (type: string, value: number) => {
    setTokenConfig(prev => {
      const next = { ...prev, tokens_per_credit: { ...prev.tokens_per_credit, [type]: value } };
      saveTokenConfig(next);
      return next;
    });
  };

  const recurringPrices = prices.filter(p => p.recurring && p.active);

  return (
    <div className="space-y-6">
      {/* Section 0: Official Product Selector */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Produto Oficial da Plataforma</CardTitle>
                <CardDescription>Defina quais preços do Stripe serão usados no checkout de assinatura</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading.officialPrices || loading.products ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recurringPrices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Carregue os preços do Stripe primeiro para selecionar o produto oficial.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plano Base (Organização)</Label>
                  <Select value={officialPriceOrgBase} onValueChange={setOfficialPriceOrgBase}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o preço base" />
                    </SelectTrigger>
                    <SelectContent>
                      {recurringPrices.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name || p.product} — {formatCurrency(p.unit_amount || 0)}/{p.recurring?.interval === 'month' ? 'mês' : p.recurring?.interval}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {officialPriceOrgBase && (
                    <p className="text-xs text-muted-foreground font-mono">{officialPriceOrgBase}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Seat Adicional</Label>
                  <Select value={officialPriceSeat} onValueChange={setOfficialPriceSeat}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o preço do seat" />
                    </SelectTrigger>
                    <SelectContent>
                      {recurringPrices.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.product_name || p.product} — {formatCurrency(p.unit_amount || 0)}/{p.recurring?.interval === 'month' ? 'mês' : p.recurring?.interval}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {officialPriceSeat && (
                    <p className="text-xs text-muted-foreground font-mono">{officialPriceSeat}</p>
                  )}
                </div>
              </div>
              <Button onClick={handleSaveOfficialPrices} disabled={savingOfficialPrices} size="sm">
                {savingOfficialPrices ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar Produto Oficial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section A: Stripe Products/Prices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Planos de Assinatura (Stripe)</CardTitle>
                <CardDescription>Produtos e preços ativos na sua conta Stripe</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchProducts} disabled={loading.products}>
              {loading.products ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading.products ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : prices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum preço encontrado no Stripe.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Price ID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prices.map(price => (
                    <TableRow key={price.id}>
                      <TableCell className="font-medium">
                        {price.product_name || price.product}
                        {price.nickname && (
                          <span className="ml-2 text-xs text-muted-foreground">({price.nickname})</span>
                        )}
                      </TableCell>
                      <TableCell>{formatCurrency(price.unit_amount || 0)}</TableCell>
                      <TableCell>
                        {price.recurring ? (
                          <Badge variant="secondary">{price.recurring.interval === 'month' ? 'Mensal' : price.recurring.interval === 'year' ? 'Anual' : price.recurring.interval}</Badge>
                        ) : (
                          <Badge variant="outline">Único</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{price.id}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={price.active ? "default" : "secondary"}>
                          {price.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Config Section */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Cotação de Tokens por Crédito</CardTitle>
              <CardDescription className="text-xs">Configure quantos tokens equivalem a 1 crédito e o custo médio por token para cálculo da cotação da IA.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* USD to BRL + Audio token ratio */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cotação USD → BRL</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-8 text-sm"
                  value={tokenConfig.usd_to_brl}
                  onChange={e => updateTokenConfig({ usd_to_brl: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ratio áudio em Entrevista (%)</Label>
                <Input
                  type="number"
                  step="5"
                  min="0"
                  max="100"
                  className="h-8 text-sm"
                  value={Math.round(tokenConfig.ai_interview_audio_token_ratio * 100)}
                  onChange={e => updateTokenConfig({ ai_interview_audio_token_ratio: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) / 100 })}
                />
                <span className="text-[9px] text-muted-foreground">% dos tokens são áudio (realtime)</span>
              </div>
            </div>

            {/* Model costs table */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Modelos de IA e Custos (USD por 1M tokens)</Label>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Modelo</TableHead>
                    <TableHead className="text-xs w-[100px]">Input</TableHead>
                    <TableHead className="text-xs w-[100px]">Output</TableHead>
                    <TableHead className="text-xs w-[60px]">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(tokenConfig.models).map(([key, model]) => (
                    <TableRow key={key}>
                      <TableCell className="p-1.5 text-xs font-medium">{model.label}</TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 text-xs"
                          value={model.cost_per_1m_input}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setTokenConfig(prev => {
                              const next = { ...prev, models: { ...prev.models, [key]: { ...prev.models[key], cost_per_1m_input: val } } };
                              saveTokenConfig(next);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          className="h-7 text-xs"
                          value={model.cost_per_1m_output}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setTokenConfig(prev => {
                              const next = { ...prev, models: { ...prev.models, [key]: { ...prev.models[key], cost_per_1m_output: val } } };
                              saveTokenConfig(next);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Badge variant="outline" className="text-[9px]">{model.tag}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Tokens per credit type */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">Tokens por Crédito</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(creditTypeLabels).map(([type, label]) => (
                  <div key={type} className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      {type === 'ai_interview' ? '🎤' : '📝'} {label}
                    </Label>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={tokenConfig.tokens_per_credit[type] || 0}
                      onChange={e => updateTokensPerCredit(type, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {type === 'ai_interview' ? 'Voz + Texto' : 'Texto'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B: Credit Packages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Pacotes de Créditos</CardTitle>
                <CardDescription>Gerencie pacotes de créditos e sincronize com o Stripe</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchPackages} disabled={loading.packages}>
                {loading.packages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar
              </Button>
              <Button size="sm" onClick={() => setShowNewPackage(true)} disabled={showNewPackage}>
                <Plus className="h-4 w-4" />
                Novo Pacote
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New package form */}
          {showNewPackage && (
            <Card className="border-dashed border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Novo Pacote de Créditos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input value={newPackage.name} onChange={e => setNewPackage(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Starter" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newPackage.credit_type} onValueChange={v => setNewPackage(p => ({ ...p, credit_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(creditTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Créditos</Label>
                    <Input type="number" value={newPackage.credits || ''} onChange={e => setNewPackage(p => ({ ...p, credits: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Preço (centavos)</Label>
                    <Input type="number" value={newPackage.price_cents || ''} onChange={e => setNewPackage(p => ({ ...p, price_cents: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bônus %</Label>
                    <Input type="number" value={newPackage.bonus_percent || ''} onChange={e => setNewPackage(p => ({ ...p, bonus_percent: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Input value={newPackage.description} onChange={e => setNewPackage(p => ({ ...p, description: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleCreatePackage} disabled={creatingPackage}>
                    {creatingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Criar e Sincronizar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewPackage(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading.packages ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(groupedPackages).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pacote encontrado.</p>
          ) : (
            Object.entries(groupedPackages).map(([type, pkgs]) => (
              <div key={type}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {creditTypeLabels[type] || type}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="max-w-[100px]">Nome</TableHead>
                      <TableHead className="w-[65px]">Créditos</TableHead>
                      <TableHead className="w-[130px]">Preço</TableHead>
                      <TableHead className="w-[90px]">Cotação IA</TableHead>
                      <TableHead className="w-[60px]">Fee</TableHead>
                      <TableHead className="w-[55px]">Bônus</TableHead>
                      <TableHead className="w-[45px] text-center">Pop.</TableHead>
                      <TableHead className="w-[45px] text-center">Ativo</TableHead>
                      <TableHead className="w-[110px]">Stripe</TableHead>
                      <TableHead className="w-[36px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pkgs.map(pkg => {
                      const edits = editingPackage[pkg.id] || {};
                      const hasEdits = Object.keys(edits).length > 0;
                      const currentCredits = (edits.credits ?? pkg.credits) as number;
                      const currentPriceCents = (edits.price_cents ?? pkg.price_cents) as number;
                      const aiCost = calcAICost(currentCredits, type, tokenConfig);
                      const fee = calcFeePercent(currentPriceCents, aiCost);

                      return (
                        <TableRow key={pkg.id}>
                          <TableCell className="p-1.5 max-w-[100px]">
                            <Input
                              className="h-7 text-sm truncate"
                              value={edits.name ?? pkg.name}
                              onChange={e => updatePackageField(pkg.id, 'name', e.target.value)}
                              title={edits.name ?? pkg.name}
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              className="h-7 text-sm w-full"
                              value={edits.credits ?? pkg.credits}
                              onChange={e => updatePackageField(pkg.id, 'credits', parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                className="h-7 text-sm w-[70px]"
                                value={edits.price_cents ?? pkg.price_cents}
                                onChange={e => updatePackageField(pkg.id, 'price_cents', parseInt(e.target.value) || 0)}
                              />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {formatCurrency(edits.price_cents ?? pkg.price_cents)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-1.5">
                            <span className="text-xs font-mono text-muted-foreground">
                              {aiCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="p-1.5">
                            {fee !== null ? (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-mono",
                                  fee > 50 ? "text-emerald-600 border-emerald-300 dark:text-emerald-400" :
                                  fee > 20 ? "text-amber-600 border-amber-300 dark:text-amber-400" :
                                  "text-red-500 border-red-300 dark:text-red-400"
                                )}
                              >
                                {fee.toFixed(0)}%
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              className="h-7 text-sm w-full"
                              value={edits.bonus_percent ?? pkg.bonus_percent ?? 0}
                              onChange={e => updatePackageField(pkg.id, 'bonus_percent', parseInt(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="p-1.5 text-center">
                            <Switch
                              checked={edits.is_popular ?? pkg.is_popular ?? false}
                              onCheckedChange={v => updatePackageField(pkg.id, 'is_popular', v)}
                            />
                          </TableCell>
                          <TableCell className="p-1.5 text-center">
                            <Switch
                              checked={edits.is_active ?? pkg.is_active ?? true}
                              onCheckedChange={v => updatePackageField(pkg.id, 'is_active', v)}
                            />
                          </TableCell>
                          <TableCell className="p-1.5">
                            {pkg.stripe_price_id ? (
                              <Badge variant="default" className="text-[10px]">
                                <Check className="h-3 w-3 mr-0.5" />
                                Sincronizado
                              </Badge>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                  <AlertCircle className="h-3 w-3 mr-0.5" />
                                  Sem Stripe
                                </Badge>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-6 w-6 shrink-0"
                                  disabled={syncingPackage === pkg.id}
                                  title="Sincronizar com Stripe"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setSyncingPackage(pkg.id);
                                    const { data, error } = await invokeAuthenticatedFunction('platform-admin-stripe', {
                                      action: 'sync-package',
                                      package_id: pkg.id,
                                    });
                                    if (error) {
                                      toast.error(`Erro ao sincronizar: ${error}`);
                                    } else {
                                      toast.success(`Pacote "${pkg.name}" sincronizado com o Stripe`);
                                      fetchPackages();
                                    }
                                    setSyncingPackage(null);
                                  }}
                                >
                                  {syncingPackage === pkg.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="p-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              disabled={!hasEdits || savingPackage === pkg.id}
                              onClick={() => handleSavePackage(pkg)}
                            >
                              {savingPackage === pkg.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Section C: Feature Costs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Custos por Funcionalidade</CardTitle>
                <CardDescription>Defina quantos créditos cada funcionalidade de IA consome</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCosts} disabled={loading.costs}>
              {loading.costs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading.costs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : costs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum custo cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionalidade</TableHead>
                  <TableHead>Tipo de Crédito</TableHead>
                  <TableHead>Créditos/Uso</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map(cost => {
                  const edits = editingCost[cost.id] || {};
                  const hasEdits = Object.keys(edits).length > 0;

                  return (
                    <TableRow key={cost.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm">{cost.feature_key}</span>
                          {cost.description && (
                            <p className="text-xs text-muted-foreground">{cost.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{creditTypeLabels[cost.credit_type] || cost.credit_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          value={edits.credits_per_use ?? cost.credits_per_use}
                          onChange={e => updateCostField(cost.id, 'credits_per_use', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={edits.usage_unit ?? cost.usage_unit}
                          onValueChange={v => updateCostField(cost.id, 'usage_unit', v)}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(usageUnitLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cost.is_active ? "default" : "secondary"}>
                          {cost.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!hasEdits || savingCost === cost.id}
                          onClick={() => handleSaveCost(cost)}
                        >
                          {savingCost === cost.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
