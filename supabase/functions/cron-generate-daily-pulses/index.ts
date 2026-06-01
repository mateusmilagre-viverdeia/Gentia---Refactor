import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = createLogger("cron-generate-daily-pulses");
const logStep = (step: string, details?: Record<string, unknown>) => {
  if (step === "ERROR") {
    log.error("Error", details);
  } else {
    log.log(step, details);
  }
};

type ChannelType = 'discord' | 'slack' | 'email' | 'webhook';

interface PulseNotificationChannel {
  id: string;
  account_id: string;
  channel_type: ChannelType;
  name: string;
  webhook_url: string | null;
  is_active: boolean;
  config: Record<string, unknown> | null;
}

interface PulseWebhookEventPayload {
  event: 'pulse.test' | 'pulse.daily_ready' | 'pulse.reminder' | 'pulse.alert';
  account_id: string;
  account_name?: string;
  channel_id?: string;
  channel_name?: string;
  assignment_id: string;
  date: string;
  title: string;
  message: string;
  deep_link: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

type DeliveryStatus = 'success' | 'failed';

function truncate(value: string | undefined, max = 2000) {
  if (!value) return null;
  return value.length > max ? value.slice(0, max) : value;
}

// deno-lint-ignore no-explicit-any
async function logPulseDelivery(
  supabase: any,
  data: {
    account_id: string;
    channel_id: string | null;
    channel_type: string;
    channel_name: string | null;
    event: string;
    status: DeliveryStatus;
    http_status?: number | null;
    duration_ms?: number | null;
    error_message?: string | null;
    response_body?: string | null;
    payload?: Record<string, unknown> | null;
  }
) {
  try {
    await supabase.from('pulse_notification_deliveries').insert({
      account_id: data.account_id,
      channel_id: data.channel_id,
      channel_type: data.channel_type,
      channel_name: data.channel_name,
      event: data.event,
      status: data.status,
      http_status: data.http_status ?? null,
      duration_ms: data.duration_ms ?? null,
      error_message: data.error_message ?? null,
      response_body: truncate(data.response_body ?? undefined),
      payload: data.payload ?? null,
    });
  } catch (e) {
    // Não quebra o cron por falha de log
    logStep('Error logging pulse delivery', {
      accountId: data.account_id,
      channelId: data.channel_id,
      error: e instanceof Error ? e.message : 'Unknown',
    });
  }
}

// Check if today is a weekday (Monday-Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // 0 = Sunday, 6 = Saturday
}

interface CultureQuestion {
  id: string;
  pillar_type: string;
  reference_text: string;
  question_text: string;
  last_used_at: string | null;
}

const CULTURE_ROTATION_PILLARS = [
  'mission',
  'vision',
  'decision',
  'indicator',
  'project',
  'energy',
  'development',
] as const;

type CultureRotationPillar = typeof CULTURE_ROTATION_PILLARS[number];

function normalizeCultureRotationPillar(value: unknown): CultureRotationPillar {
  const v = String(value ?? '').trim();
  if ((CULTURE_ROTATION_PILLARS as readonly string[]).includes(v)) return v as CultureRotationPillar;
  return 'mission';
}

function getNextCultureRotationPillar(current: unknown): CultureRotationPillar {
  const cur = normalizeCultureRotationPillar(current);
  const idx = CULTURE_ROTATION_PILLARS.indexOf(cur);
  const nextIdx = idx >= 0 ? (idx + 1) % CULTURE_ROTATION_PILLARS.length : 0;
  return CULTURE_ROTATION_PILLARS[nextIdx];
}

// Get next available pillar that has questions (dynamic rotation)
async function getNextAvailableCulturePillar(
  supabase: any,
  accountId: string,
  currentPillar: CultureRotationPillar,
  availablePillars: Set<string>
): Promise<CultureRotationPillar> {
  const currentIdx = CULTURE_ROTATION_PILLARS.indexOf(currentPillar);
  
  // Try to find next pillar that has questions
  for (let i = 1; i <= CULTURE_ROTATION_PILLARS.length; i++) {
    const nextIdx = (currentIdx + i) % CULTURE_ROTATION_PILLARS.length;
    const nextPillar = CULTURE_ROTATION_PILLARS[nextIdx];
    if (availablePillars.has(nextPillar)) {
      return nextPillar;
    }
  }
  
  // Fallback: return first available pillar or default
  const firstAvailable = Array.from(availablePillars)[0];
  return (firstAvailable as CultureRotationPillar) || 'development';
}

// deno-lint-ignore no-explicit-any
async function aggregateMetricsForAccount(
  supabase: any,
  accountId: string,
  targetDate: string
): Promise<void> {
  // Get all responses for the date
  const { data: responses, error: responsesError } = await supabase
    .from('pulse_responses')
    .select('numeric_score, respondent_user_id, respondent_team_id, question_id')
    .eq('account_id', accountId)
    .eq('date', targetDate);

  if (responsesError || !responses || responses.length === 0) {
    return; // No responses to aggregate
  }

  // Get total users in the account
  const { count: totalUsers } = await supabase
    .from('account_members')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_active', true);

  // Get questions with driver info for breakdown
  const questionIds = [...new Set(responses.map((r: any) => r.question_id))];
  
  let driverMap: Record<string, string> = {};
  if (questionIds.length > 0) {
    const { data: questions } = await supabase
      .from('pulse_questions')
      .select('id, driver_id, pulse_drivers(key)')
      .in('id', questionIds);
    
    questions?.forEach((q: any) => {
      if (q.pulse_drivers?.key) {
        driverMap[q.id] = q.pulse_drivers.key;
      }
    });
  }

  // Calculate metrics
  const validResponses = responses.filter((r: any) => r.numeric_score !== null);
  const respondedUserIds = new Set(responses.map((r: any) => r.respondent_user_id).filter(Boolean));
  const respondedUsers = respondedUserIds.size;
  
  // Calculate engagement score (keep on 1-5 scale for DB storage)
  const avgScore = validResponses.length > 0
    ? validResponses.reduce((sum: number, r: any) => sum + (r.numeric_score || 0), 0) / validResponses.length
    : 0;
  // Round to 2 decimal places and cap at 5.00 (DB has precision 4,2)
  const engagementScore = Math.min(Math.round(avgScore * 100) / 100, 5.00);

  // Calculate participation rate (cap at 99.99 for DB precision)
  const participationRate = (totalUsers && totalUsers > 0)
    ? Math.min(Math.round((respondedUsers / totalUsers) * 10000) / 100, 99.99)
    : 0;

  // Calculate by_driver breakdown
  const byDriver: Record<string, { avg: number; count: number }> = {};
  validResponses.forEach((r: any) => {
    const driverKey = driverMap[r.question_id];
    if (driverKey) {
      if (!byDriver[driverKey]) {
        byDriver[driverKey] = { avg: 0, count: 0 };
      }
      byDriver[driverKey].avg += r.numeric_score || 0;
      byDriver[driverKey].count += 1;
    }
  });
  
  // Convert to averages
  Object.keys(byDriver).forEach(key => {
    if (byDriver[key].count > 0) {
      byDriver[key].avg = Math.round((byDriver[key].avg / byDriver[key].count / 5) * 100);
    }
  });

  // Calculate by_team breakdown
  const byTeam: Record<string, { avg: number; count: number; responded: number }> = {};
  validResponses.forEach((r: any) => {
    const teamId = r.respondent_team_id;
    if (teamId) {
      if (!byTeam[teamId]) {
        byTeam[teamId] = { avg: 0, count: 0, responded: 0 };
      }
      byTeam[teamId].avg += r.numeric_score || 0;
      byTeam[teamId].count += 1;
    }
  });
  
  // Track unique responders per team
  const teamResponders: Record<string, Set<string>> = {};
  responses.forEach((r: any) => {
    if (r.respondent_team_id && r.respondent_user_id) {
      if (!teamResponders[r.respondent_team_id]) {
        teamResponders[r.respondent_team_id] = new Set();
      }
      teamResponders[r.respondent_team_id].add(r.respondent_user_id);
    }
  });
  
  // Convert to averages
  Object.keys(byTeam).forEach(key => {
    if (byTeam[key].count > 0) {
      byTeam[key].avg = Math.round((byTeam[key].avg / byTeam[key].count / 5) * 100);
      byTeam[key].responded = teamResponders[key]?.size || 0;
    }
  });

  // Upsert metrics
  const metricsData = {
    account_id: accountId,
    date: targetDate,
    engagement_score_avg: engagementScore,
    participation_rate: participationRate,
    responded_users: respondedUsers,
    total_users: totalUsers || 0,
    by_driver: byDriver,
    by_team: byTeam,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from('pulse_metrics_daily')
    .upsert(metricsData, {
      onConflict: 'account_id,date',
    });

  logStep('Metrics aggregated', { accountId, date: targetDate, engagement: engagementScore });
}

// deno-lint-ignore no-explicit-any
async function aggregateCultureMetricsForAccount(
  supabase: any,
  accountId: string,
  targetDate: string
): Promise<void> {
  // Get culture responses for the date (items marked as culture questions)
  const { data: cultureItems, error: itemsError } = await supabase
    .from('pulse_daily_assignment_items')
    .select(`
      id,
      culture_pillar,
      culture_question_id,
      assignment:pulse_daily_assignments!inner(id, account_id, date)
    `)
    .eq('is_culture_question', true)
    .eq('assignment.account_id', accountId)
    .eq('assignment.date', targetDate);

  if (itemsError || !cultureItems || cultureItems.length === 0) {
    return;
  }

  // Get responses for these items
  const itemIds = cultureItems.map((i: any) => i.id);
  const { data: responses } = await supabase
    .from('pulse_responses')
    .select('numeric_score, assignment_item_id, respondent_user_id')
    .eq('account_id', accountId)
    .eq('date', targetDate)
    .in('assignment_item_id', itemIds);

  if (!responses || responses.length === 0) {
    return;
  }

  // Calculate overall culture score
  const validResponses = responses.filter((r: any) => r.numeric_score !== null);
  const overallScore = validResponses.length > 0
    ? Math.round((validResponses.reduce((sum: number, r: any) => sum + (r.numeric_score || 0), 0) / validResponses.length / 5) * 100)
    : 0;

  // Calculate by pillar
  const byPillar: Record<string, { total: number; count: number }> = {};
  const byValue: Record<string, { total: number; count: number }> = {};

  for (const item of cultureItems) {
    const itemResponses = responses.filter((r: any) => r.assignment_item_id === item.id);
    const itemValid = itemResponses.filter((r: any) => r.numeric_score !== null);
    
    if (itemValid.length > 0 && item.culture_pillar) {
      if (!byPillar[item.culture_pillar]) {
        byPillar[item.culture_pillar] = { total: 0, count: 0 };
      }
      byPillar[item.culture_pillar].total += itemValid.reduce((s: number, r: any) => s + (r.numeric_score || 0), 0);
      byPillar[item.culture_pillar].count += itemValid.length;

      // For values, track individually
      if (item.culture_pillar === 'value' && item.culture_question_id) {
        const { data: cultureQ } = await supabase
          .from('pulse_culture_questions')
          .select('reference_text')
          .eq('id', item.culture_question_id)
          .maybeSingle();
        
        if (cultureQ?.reference_text) {
          const valueName = cultureQ.reference_text;
          if (!byValue[valueName]) {
            byValue[valueName] = { total: 0, count: 0 };
          }
          byValue[valueName].total += itemValid.reduce((s: number, r: any) => s + (r.numeric_score || 0), 0);
          byValue[valueName].count += itemValid.length;
        }
      }
    }
  }

  // Convert to percentages
  const byPillarFinal: Record<string, number> = {};
  Object.entries(byPillar).forEach(([key, val]) => {
    if (val.count > 0) {
      byPillarFinal[key] = Math.round((val.total / val.count / 5) * 100);
    }
  });

  const byValueFinal: Record<string, number> = {};
  Object.entries(byValue).forEach(([key, val]) => {
    if (val.count > 0) {
      byValueFinal[key] = Math.round((val.total / val.count / 5) * 100);
    }
  });

  const respondentIds = new Set(responses.map((r: any) => r.respondent_user_id).filter(Boolean));

  // Upsert culture metrics
  await supabase
    .from('pulse_culture_metrics_daily')
    .upsert({
      account_id: accountId,
      date: targetDate,
      overall_score: overallScore,
      by_pillar: byPillarFinal,
      by_value: byValueFinal,
      response_count: validResponses.length,
      respondent_count: respondentIds.size,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'account_id,date',
    });

  logStep('Culture metrics aggregated', { accountId, date: targetDate, overallScore });
}

// deno-lint-ignore no-explicit-any
async function fetchActivePulseChannels(supabase: any, accountId: string): Promise<PulseNotificationChannel[]> {
  const { data, error } = await supabase
    .from('pulse_notification_channels')
    .select('id, account_id, channel_type, name, webhook_url, is_active, config')
    .eq('account_id', accountId)
    .eq('is_active', true);

  if (error) {
    logStep('Error fetching pulse_notification_channels', { accountId, error: error.message });
    return [];
  }
  return (data || []) as PulseNotificationChannel[];
}

async function sendWebhookChannel(
  channel: PulseNotificationChannel,
  payload: PulseWebhookEventPayload
): Promise<{ success: boolean; httpStatus?: number; responseBody?: string; error?: string; durationMs?: number }>{
  if (!channel.webhook_url) return { success: false, error: 'Missing webhook_url' };
  try {
    const started = Date.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const cfg = channel.config;
    if (cfg?.headers && typeof cfg.headers === 'object' && cfg.headers !== null && !Array.isArray(cfg.headers)) {
      Object.assign(headers, cfg.headers as Record<string, string>);
    }

    const res = await fetch(channel.webhook_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const durationMs = Date.now() - started;
    if (res.ok) return { success: true, httpStatus: res.status, durationMs };
    const text = await res.text();
    return { success: false, httpStatus: res.status, responseBody: text, durationMs, error: `Webhook returned ${res.status}: ${text}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Webhook error' };
  }
}

async function sendDiscordChannel(
  channel: PulseNotificationChannel,
  payload: PulseWebhookEventPayload
): Promise<{ success: boolean; httpStatus?: number; responseBody?: string; error?: string; durationMs?: number }>{
  if (!channel.webhook_url) return { success: false, error: 'Missing webhook_url' };
  try {
    const started = Date.now();
    const res = await fetch(channel.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔔 **${payload.title}**\n${payload.message}\n\n👉 ${payload.deep_link}`,
      }),
    });
    const durationMs = Date.now() - started;
    if (res.ok) return { success: true, httpStatus: res.status, durationMs };
    const text = await res.text();
    return { success: false, httpStatus: res.status, responseBody: text, durationMs, error: `Discord returned ${res.status}: ${text}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Discord error' };
  }
}

async function sendSlackChannel(
  channel: PulseNotificationChannel,
  payload: PulseWebhookEventPayload
): Promise<{ success: boolean; httpStatus?: number; responseBody?: string; error?: string; durationMs?: number }>{
  if (!channel.webhook_url) return { success: false, error: 'Missing webhook_url' };
  try {
    const started = Date.now();
    const res = await fetch(channel.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: payload.title, emoji: true },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `${payload.message}\n\n<${payload.deep_link}|Abrir Pulse>` },
          },
        ],
      }),
    });
    const durationMs = Date.now() - started;
    if (res.ok) return { success: true, httpStatus: res.status, durationMs };
    const text = await res.text();
    return { success: false, httpStatus: res.status, responseBody: text, durationMs, error: `Slack returned ${res.status}: ${text}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Slack error' };
  }
}

// deno-lint-ignore no-explicit-any
async function notifyPulseChannelsForDailyReady(
  supabase: any,
  accountId: string,
  assignmentId: string,
  questionsCount: number,
  accountName?: string,
) {
  const channels = await fetchActivePulseChannels(supabase, accountId);
  if (channels.length === 0) return;

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  // Important: this deep_link is for automations; clients can rewrite to their own domain.
  const deepLink = '/retencao/pulse';

  const payload: PulseWebhookEventPayload = {
    event: 'pulse.daily_ready',
    account_id: accountId,
    account_name: accountName,
    assignment_id: assignmentId,
    date: new Date().toISOString().split('T')[0],
    title: '💫 Seu Pulso Diário está disponível!',
    message: `Responda ${questionsCount} perguntas rápidas sobre o pulso de ${todayLabel}`,
    deep_link: deepLink,
    timestamp: new Date().toISOString(),
    metadata: {
      questions_count: questionsCount,
      kind: 'daily_ready',
    },
  };

  for (const ch of channels) {
    // Skip unsupported / missing URLs
    if (!ch.webhook_url && (ch.channel_type === 'webhook' || ch.channel_type === 'discord' || ch.channel_type === 'slack')) {
      continue;
    }

    const perChannelPayload: PulseWebhookEventPayload = {
      ...payload,
      channel_id: ch.id,
      channel_name: ch.name,
    };

    let res: { success: boolean; httpStatus?: number; responseBody?: string; error?: string; durationMs?: number } = { success: false, error: 'Unknown channel type' };
    if (ch.channel_type === 'webhook') res = await sendWebhookChannel(ch, perChannelPayload);
    if (ch.channel_type === 'discord') res = await sendDiscordChannel(ch, perChannelPayload);
    if (ch.channel_type === 'slack') res = await sendSlackChannel(ch, perChannelPayload);

    await logPulseDelivery(supabase, {
      account_id: accountId,
      channel_id: ch.id,
      channel_type: ch.channel_type,
      channel_name: ch.name,
      event: perChannelPayload.event,
      status: res.success ? 'success' : 'failed',
      http_status: res.httpStatus ?? null,
      duration_ms: res.durationMs ?? null,
      error_message: res.success ? null : (res.error ?? null),
      response_body: res.responseBody ?? null,
      payload: perChannelPayload as unknown as Record<string, unknown>,
    });

    if (!res.success) {
      logStep('Channel notification failed', { accountId, channelId: ch.id, channelType: ch.channel_type, error: res.error });
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logStep('Starting daily pulse generation cron job');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentHour = today.getUTCHours();
    const currentMinute = today.getUTCMinutes();
    logStep('Processing date', { date: todayStr, dayOfWeek: today.getDay(), utcTime: `${currentHour}:${currentMinute}` });

    // Get all accounts with active pulse configuration including new scheduling fields
    const { data: accounts, error: accountsError } = await supabase
      .from('pulse_schedule_rules')
      .select(`
        account_id,
        is_active,
        daily_questions_count,
        culture_questions_count,
        weekdays_only,
        send_time,
        send_days,
        is_recurring,
        start_date,
        end_date,
        companies!inner(id, name, status)
      `)
      .eq('is_active', true);

    if (accountsError) {
      logStep('Error fetching accounts', { error: accountsError.message });
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    // Also get accounts that have pulse questions but no explicit schedule rules
    const { data: accountsWithQuestions } = await supabase
      .from('pulse_questions')
      .select('account_id')
      .eq('is_active', true);

    const accountIdsWithQuestions = new Set<string>(
      ((accountsWithQuestions || []) as Array<{ account_id: string }>).map(q => q.account_id).filter(Boolean)
    );
    const accountIdsWithRules = new Set<string>(
      ((accounts || []) as Array<{ account_id: string }>).map(a => a.account_id).filter(Boolean)
    );
    
    // Merge: accounts with rules + accounts with questions but no rules
    const allAccountIds = new Set<string>([...accountIdsWithRules, ...accountIdsWithQuestions]);
    
    logStep('Found accounts to process', { 
      withRules: accountIdsWithRules.size,
      withQuestions: accountIdsWithQuestions.size,
      total: allAccountIds.size
    });

    const results = {
      processed: 0,
      success: 0,
      skipped: 0,
      skipped_weekend: 0,
      skipped_not_scheduled: 0,
      skipped_outside_period: 0,
      failed: 0,
      notifications_created: 0,
      culture_questions_added: 0,
      errors: [] as string[],
    };

    // Build rules map for quick lookup with new fields
    const rulesMap = new Map<string, any>();
    (accounts as Array<{
      account_id: string;
      daily_questions_count: number | null;
      culture_questions_count: number | null;
      weekdays_only: boolean | null;
      send_time: string | null;
      send_days: number[] | null;
      is_recurring: boolean | null;
      start_date: string | null;
      end_date: string | null;
    }> | null | undefined)?.forEach((a) => {
      rulesMap.set(a.account_id, {
        daily_questions_count: a.daily_questions_count || 3,
        culture_questions_count: a.culture_questions_count ?? 2,
        weekdays_only: a.weekdays_only ?? true,
        send_time: a.send_time || '08:59:00',
        send_days: a.send_days || [1, 2, 3, 4, 5], // Default Mon-Fri
        is_recurring: a.is_recurring ?? true,
        start_date: a.start_date,
        end_date: a.end_date,
      });
    });

    // Helper: Check if current UTC time matches configured send_time (within 30 min window)
    const isWithinScheduledTime = (sendTime: string): boolean => {
      if (!sendTime) return true; // No specific time = always run
      const [hours, minutes] = sendTime.split(':').map(Number);
      const configuredMinutes = hours * 60 + minutes;
      const currentMinutes = currentHour * 60 + currentMinute;
      // Allow 30-minute window before and after scheduled time
      return Math.abs(currentMinutes - configuredMinutes) <= 30;
    };

    // Helper: Check if today's day of week is in configured send_days
    const isSendDay = (sendDays: number[]): boolean => {
      if (!sendDays || sendDays.length === 0) return true;
      return sendDays.includes(today.getDay());
    };

    // Helper: Check if today is within configured date range
    const isWithinDateRange = (startDate: string | null, endDate: string | null): boolean => {
      if (!startDate && !endDate) return true;
      const todayDate = new Date(todayStr);
      if (startDate && new Date(startDate) > todayDate) return false;
      if (endDate && new Date(endDate) < todayDate) return false;
      return true;
    };

    for (const accountId of allAccountIds) {
      // Skip null account_id to prevent errors
      if (!accountId) {
        logStep('Skipping null account_id');
        continue;
      }

      // Get account rules (or defaults)
      const accountRules = rulesMap.get(accountId) || {
        daily_questions_count: 3,
        culture_questions_count: 2,
        weekdays_only: true,
        send_time: '08:59:00',
        send_days: [1, 2, 3, 4, 5],
        is_recurring: true,
        start_date: null,
        end_date: null,
      };

      // Check if it's a scheduled day (new logic)
      if (!isSendDay(accountRules.send_days)) {
        logStep('Skipping - not a scheduled day', { accountId, configuredDays: accountRules.send_days, today: today.getDay() });
        results.skipped_not_scheduled++;
        continue;
      }

      // Check if within date range (for non-recurring or limited period)
      if (!isWithinDateRange(accountRules.start_date, accountRules.end_date)) {
        logStep('Skipping - outside configured date range', { accountId, start: accountRules.start_date, end: accountRules.end_date });
        results.skipped_outside_period++;
        continue;
      }

      // Legacy weekdays_only check (fallback if send_days not configured)
      if (accountRules.weekdays_only && !isWeekday(today) && (!accountRules.send_days || accountRules.send_days.length === 0)) {
        logStep('Skipping weekend for account', { accountId });
        results.skipped_weekend++;
        continue;
      }
      
      results.processed++;
      logStep(`Processing account ${results.processed}/${allAccountIds.size}`, { accountId });
      try {
        // Check if pulse already exists for today
        const { data: existingAssignment } = await supabase
          .from('pulse_daily_assignments')
          .select('id')
          .eq('account_id', accountId)
          .eq('date', todayStr)
          .maybeSingle();

        if (existingAssignment) {
          logStep('Pulse already exists for today, skipping', { accountId });
          results.skipped++;
          continue;
        }

        // Generate pulse for this account using service role (bypass auth)
        const pulseResult = await generatePulseForAccount(
          supabase, 
          accountId, 
          todayStr,
          accountRules.daily_questions_count,
          accountRules.culture_questions_count
        );
        
        if (pulseResult.success) {
          results.success++;
          results.culture_questions_added += pulseResult.culture_questions_count || 0;
          logStep('Pulse generated successfully', { 
            accountId, 
            assignmentId: pulseResult.assignment_id,
            questionsCount: pulseResult.questions_count,
            cultureQuestionsCount: pulseResult.culture_questions_count
          });

          // Create notifications for all account members
          const notificationsCreated = await createPulseNotifications(
            supabase, 
            accountId, 
            pulseResult.assignment_id!,
            pulseResult.questions_count || 3
          );
          results.notifications_created += notificationsCreated;

          // Notify external channels configured per-account (Discord/Slack/Webhook)
          await notifyPulseChannelsForDailyReady(
            supabase,
            accountId,
            pulseResult.assignment_id!,
            pulseResult.questions_count || 3,
            undefined,
          );
          
        } else {
          results.failed++;
          results.errors.push(`${accountId}: ${pulseResult.error}`);
          logStep('Failed to generate pulse', { accountId, error: pulseResult.error });
        }

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${accountId}: ${errorMessage}`);
        logStep('Error processing account', { accountId, error: errorMessage });
      }
    }

    // Aggregate metrics for yesterday (ensures complete data)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    logStep('Aggregating metrics for yesterday', { date: yesterdayStr });
    for (const accountId of allAccountIds) {
      if (!accountId) continue;
      try {
        await aggregateMetricsForAccount(supabase, accountId, yesterdayStr);
        await aggregateCultureMetricsForAccount(supabase, accountId, yesterdayStr);
      } catch (error) {
        logStep('Error aggregating metrics', { 
          accountId, 
          error: error instanceof Error ? error.message : 'Unknown' 
        });
      }
    }

    // Retenção: manter logs de entregas por 30 dias
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      await supabase
        .from('pulse_notification_deliveries')
        .delete()
        .lt('created_at', cutoff.toISOString());
    } catch (e) {
      logStep('Error cleaning pulse_notification_deliveries', {
        error: e instanceof Error ? e.message : 'Unknown',
      });
    }

    const duration = Date.now() - startTime;
    logStep('Cron job completed', { ...results, duration_ms: duration });

    // Send Discord notification if any pulses were generated
    if (results.success > 0) {
      await sendDiscordNotification(results.success, results.notifications_created, results.culture_questions_added);
    }

    return new Response(JSON.stringify({
      success: true,
      date: todayStr,
      duration_ms: duration,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Fatal error in cron job', { error: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

interface ScheduleRules {
  daily_questions_count: number;
  must_include_driver_keys: string[];
  prefer_driver_keys: string[];
  rotation_pool_driver_keys: string[];
  max_repeat_block_days: number;
  anonymous_driver_keys: string[];
}

interface Question {
  id: string;
  driver_id: string;
  question_text: string;
  driver_key: string;
  max_repeat_per_month: number;
  is_anonymous: boolean;
}

// deno-lint-ignore no-explicit-any
async function selectCultureQuestions(
  supabase: any,
  accountId: string,
  count: number,
  blockDays: number = 14,
  rotationEnabled: boolean = true,
  rotationPillar: CultureRotationPillar = 'mission'
): Promise<CultureQuestion[]> {
  if (count <= 0) return [];

  // Get all active culture questions for this account
  const { data: allCultureQuestions, error } = await supabase
    .from('pulse_culture_questions')
    .select('id, pillar_type, reference_text, question_text, last_used_at')
    .eq('account_id', accountId)
    .eq('is_active', true);

  if (error || !allCultureQuestions || allCultureQuestions.length === 0) {
    logStep('No culture questions found', { accountId, error: error?.message });
    return [];
  }

  // Get available pillars that have questions
  const availablePillars = new Set<string>(
    allCultureQuestions.map((q: CultureQuestion) => q.pillar_type)
  );

  logStep('Culture questions pool', { 
    accountId, 
    total: allCultureQuestions.length,
    pillars: Array.from(availablePillars),
    byPillar: Object.fromEntries(
      Array.from(availablePillars).map(p => [
        p, 
        allCultureQuestions.filter((q: CultureQuestion) => q.pillar_type === p).length
      ])
    )
  });

  // Adaptive blocking: reduce block days for pillars with few active questions
  // so they don't get permanently blocked
  const pillarQuestionCounts: Record<string, number> = {};
  allCultureQuestions.forEach((q: CultureQuestion) => {
    pillarQuestionCounts[q.pillar_type] = (pillarQuestionCounts[q.pillar_type] || 0) + 1;
  });

  const availableQuestions = allCultureQuestions.filter((q: CultureQuestion) => {
    if (!q.last_used_at) return true;
    // Adaptive: pillars with <= 3 questions get max 3-day block
    // Pillars with <= 5 questions get max 7-day block
    // Pillars with 6+ questions keep the configured block (14 days)
    const pillarCount = pillarQuestionCounts[q.pillar_type] || 1;
    let effectiveBlockDays = blockDays;
    if (pillarCount <= 3) effectiveBlockDays = Math.min(blockDays, 3);
    else if (pillarCount <= 5) effectiveBlockDays = Math.min(blockDays, 7);

    const effectiveBlockDate = new Date();
    effectiveBlockDate.setDate(effectiveBlockDate.getDate() - effectiveBlockDays);
    return new Date(q.last_used_at) < effectiveBlockDate;
  });

  logStep('Adaptive blocking applied', {
    accountId,
    totalQuestions: allCultureQuestions.length,
    availableAfterBlock: availableQuestions.length,
    pillarCounts: pillarQuestionCounts,
  });

  // If not enough available, include all
  const questionsPool = availableQuestions.length >= count 
    ? availableQuestions 
    : allCultureQuestions;

  // Separate values and other pillars
  const valueQuestions = questionsPool.filter((q: CultureQuestion) => q.pillar_type === 'value');
  const otherQuestions = questionsPool.filter((q: CultureQuestion) => q.pillar_type !== 'value');

  const pickRandom = (pool: CultureQuestion[]) => pool[Math.floor(Math.random() * pool.length)];

  // Strict rotation mode for the default "2 questions/day" culture setup:
  // 1 = value, 1 = rotationPillar
  if (rotationEnabled && count === 2) {
    const selected: CultureQuestion[] = [];

    // VALUE question (with fallback)
    const valuePoolPreferred = valueQuestions;
    const valuePoolFallback = allCultureQuestions.filter((q: CultureQuestion) => q.pillar_type === 'value');
    let valuePool = (valuePoolPreferred.length > 0 ? valuePoolPreferred : valuePoolFallback);
    
    if (valuePool.length > 0) {
      // Prefer not repeating the same reference_text within the day
      const shuffled = [...valuePool].sort(() => Math.random() - 0.5);
      const first = shuffled.find(q => q.reference_text) ?? shuffled[0];
      if (first) selected.push(first);
    } else {
      // FALLBACK: No value questions exist - use any available question
      logStep('No VALUE questions found, using fallback', { accountId });
      const fallback = pickRandom(questionsPool);
      if (fallback) selected.push(fallback);
    }

    // ROTATION pillar question - with dynamic pillar selection
    let effectiveRotationPillar = rotationPillar;
    
    // Check if the configured rotation pillar has questions
    const pillarHasQuestions = availablePillars.has(rotationPillar);
    if (!pillarHasQuestions) {
      // Find next available pillar dynamically
      const nonValuePillars = Array.from(availablePillars).filter(p => p !== 'value');
      if (nonValuePillars.length > 0) {
        effectiveRotationPillar = await getNextAvailableCulturePillar(
          supabase, 
          accountId, 
          rotationPillar, 
          new Set(nonValuePillars)
        );
        logStep('Rotation pillar adjusted dynamically', { 
          accountId, 
          requestedPillar: rotationPillar, 
          usedPillar: effectiveRotationPillar 
        });
      }
    }

    const rotationPoolPreferred = otherQuestions.filter((q: CultureQuestion) => q.pillar_type === effectiveRotationPillar);
    const rotationPoolFallback = allCultureQuestions.filter((q: CultureQuestion) => q.pillar_type === effectiveRotationPillar);
    let rotationPool = rotationPoolPreferred.length > 0 ? rotationPoolPreferred : rotationPoolFallback;

    // Last resort: any non-value question
    if (rotationPool.length === 0) {
      rotationPool = otherQuestions.length > 0
        ? otherQuestions
        : allCultureQuestions.filter((q: CultureQuestion) => q.pillar_type !== 'value');
    }

    if (rotationPool.length > 0) {
      // Exclude already selected questions
      const availableRotation = rotationPool.filter((q: CultureQuestion) => !selected.includes(q));
      if (availableRotation.length > 0) {
        const chosen = pickRandom(availableRotation);
        if (chosen) selected.push(chosen);
      } else if (rotationPool.length > 0) {
        // If all were selected, pick any from rotation pool
        const chosen = pickRandom(rotationPool);
        if (chosen && !selected.includes(chosen)) selected.push(chosen);
      }
    }

    // FINAL FALLBACK: Ensure we always return the requested count if possible
    if (selected.length < count && questionsPool.length > selected.length) {
      const remaining = questionsPool.filter((q: CultureQuestion) => !selected.includes(q));
      while (selected.length < count && remaining.length > 0) {
        const randomIdx = Math.floor(Math.random() * remaining.length);
        selected.push(remaining.splice(randomIdx, 1)[0]);
      }
      logStep('Culture fallback used to complete count', {
        accountId,
        requestedCount: count,
        achievedCount: selected.length,
      });
    }

    logStep('Culture questions selected (rotation)', {
      accountId,
      requested: count,
      selected: selected.length,
      rotationPillar,
      effectiveRotationPillar,
      blockDays,
      valueCount: selected.filter(q => q.pillar_type === 'value').length,
      otherCount: selected.filter(q => q.pillar_type !== 'value').length,
      selectedPillars: selected.map(q => q.pillar_type),
    });

    return selected;
  }

  // Calculate 50% distribution for values
  // count=2 -> 1 value + 1 other
  // count=3 -> 2 values + 1 other (ceiling to favor values)
  // count=4 -> 2 values + 2 others
  const valueCount = Math.ceil(count / 2);
  const otherCount = count - valueCount;

  const selected: CultureQuestion[] = [];
  const usedValueRefs = new Set<string>();
  const usedPillars = new Set<string>();

  // Select VALUE questions first (priority - 50% of questions)
  const shuffledValues = [...valueQuestions].sort(() => Math.random() - 0.5);
  for (const q of shuffledValues) {
    if (selected.length >= valueCount) break;
    // Avoid repeating the same value (by reference_text)
    if (!usedValueRefs.has(q.reference_text)) {
      selected.push(q);
      usedValueRefs.add(q.reference_text);
    }
  }

  // Select OTHER PILLAR questions (diversity across pillars)
  const shuffledOthers = [...otherQuestions].sort(() => Math.random() - 0.5);
  for (const q of shuffledOthers) {
    if (selected.length >= count) break;
    // Prioritize pillars not yet used
    if (!usedPillars.has(q.pillar_type)) {
      selected.push(q);
      usedPillars.add(q.pillar_type);
    }
  }

  // Fill remaining if needed (from any available question)
  const remaining = [...shuffledValues, ...shuffledOthers].filter(q => !selected.includes(q));
  for (const q of remaining) {
    if (selected.length >= count) break;
    selected.push(q);
  }

  logStep('Culture questions selected', {
    accountId,
    requested: count,
    selected: selected.length,
    valueCount: selected.filter(q => q.pillar_type === 'value').length,
    otherCount: selected.filter(q => q.pillar_type !== 'value').length,
  });

  return selected;
}

// deno-lint-ignore no-explicit-any
async function generatePulseForAccount(
  supabase: any,
  accountId: string,
  targetDate: string,
  regularQuestionsCount: number = 3,
  cultureQuestionsCount: number = 2
): Promise<{ 
  success: boolean; 
  assignment_id?: string; 
  questions_count?: number; 
  culture_questions_count?: number;
  error?: string 
}> {
  
  // Get schedule rules
  let rules: ScheduleRules = {
    daily_questions_count: regularQuestionsCount,
    must_include_driver_keys: ['mood_energy'],
    prefer_driver_keys: ['culture_values', 'purpose'],
    rotation_pool_driver_keys: [],
    max_repeat_block_days: 7,
    anonymous_driver_keys: ['mood_energy', 'workload', 'work_environment'],
  };

  const { data: customRules } = await supabase
    .from('pulse_schedule_rules')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_active', true)
    .maybeSingle();

  const cultureBlockDays = Number(customRules?.culture_max_repeat_block_days ?? 14);
  const cultureRotationEnabled = Boolean(customRules?.culture_rotation_enabled ?? true);
  const cultureRotationPillar = normalizeCultureRotationPillar(customRules?.culture_rotation_next_pillar);

  if (customRules) {
    rules = {
      daily_questions_count: customRules.daily_questions_count || regularQuestionsCount,
      must_include_driver_keys: customRules.must_include_driver_keys || ['mood_energy'],
      prefer_driver_keys: customRules.prefer_driver_keys || ['culture_values', 'purpose'],
      rotation_pool_driver_keys: customRules.rotation_pool_driver_keys || [],
      max_repeat_block_days: customRules.max_repeat_block_days || 7,
      anonymous_driver_keys: customRules.anonymous_driver_keys || ['mood_energy', 'workload'],
    };
  }

  // Get all active questions with driver info (account-specific OR global questions)
  const { data: allQuestions, error: questionsError } = await supabase
    .from('pulse_questions')
    .select(`
      id,
      driver_id,
      question_text,
      max_repeat_per_month,
      is_anonymous,
      pulse_drivers!inner(key)
    `)
    .or(`account_id.eq.${accountId},account_id.is.null`)
    .eq('is_active', true);

  if (questionsError) {
    return { success: false, error: `Error fetching questions: ${questionsError.message}` };
  }

  if (!allQuestions || allQuestions.length === 0) {
    return { success: false, error: 'No active questions found' };
  }

  // deno-lint-ignore no-explicit-any
  const questions: Question[] = allQuestions.map((q: any) => ({
    id: q.id,
    driver_id: q.driver_id,
    question_text: q.question_text,
    driver_key: (q.pulse_drivers as { key: string }).key,
    max_repeat_per_month: q.max_repeat_per_month,
    is_anonymous: q.is_anonymous,
  }));

  // Get question usage history for this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: historyThisMonth } = await supabase
    .from('pulse_question_history')
    .select('question_id')
    .eq('account_id', accountId)
    .gte('used_date', startOfMonth.toISOString().split('T')[0]);

  const questionUsageCount: Record<string, number> = {};
  // deno-lint-ignore no-explicit-any
  historyThisMonth?.forEach((h: any) => {
    questionUsageCount[h.question_id] = (questionUsageCount[h.question_id] || 0) + 1;
  });

  // Get recent questions to avoid
  const blockDate = new Date();
  blockDate.setDate(blockDate.getDate() - rules.max_repeat_block_days);

  const { data: recentHistory } = await supabase
    .from('pulse_question_history')
    .select('question_id')
    .eq('account_id', accountId)
    .gte('used_date', blockDate.toISOString().split('T')[0]);

  // deno-lint-ignore no-explicit-any
  const recentQuestionIds = new Set(recentHistory?.map((h: any) => h.question_id) || []);

  // Filter available questions
  const availableQuestions = questions.filter(q => {
    const usedThisMonth = questionUsageCount[q.id] || 0;
    if (usedThisMonth >= q.max_repeat_per_month) return false;
    if (recentQuestionIds.has(q.id)) return false;
    return true;
  });

  // Select regular questions based on rules
  const selectedQuestions: Question[] = [];
  const usedDriverKeys = new Set<string>();

  // 1. Must include
  for (const driverKey of rules.must_include_driver_keys) {
    if (selectedQuestions.length >= rules.daily_questions_count) break;
    const driverQuestions = availableQuestions.filter(
      q => q.driver_key === driverKey && !selectedQuestions.includes(q)
    );
    if (driverQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * driverQuestions.length);
      selectedQuestions.push(driverQuestions[randomIndex]);
      usedDriverKeys.add(driverKey);
    }
  }

  // 2. Prefer drivers
  for (const driverKey of rules.prefer_driver_keys) {
    if (selectedQuestions.length >= rules.daily_questions_count) break;
    if (usedDriverKeys.has(driverKey)) continue;
    const driverQuestions = availableQuestions.filter(
      q => q.driver_key === driverKey && !selectedQuestions.includes(q)
    );
    if (driverQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * driverQuestions.length);
      selectedQuestions.push(driverQuestions[randomIndex]);
      usedDriverKeys.add(driverKey);
    }
  }

  // 3. Fill remaining
  while (selectedQuestions.length < rules.daily_questions_count) {
    const availableForRotation = availableQuestions.filter(
      q => !selectedQuestions.includes(q)
    );
    if (availableForRotation.length === 0) break;
    
    const unusedDriverQuestions = availableForRotation.filter(
      q => !usedDriverKeys.has(q.driver_key)
    );
    const poolToUse = unusedDriverQuestions.length > 0 ? unusedDriverQuestions : availableForRotation;
    const randomIndex = Math.floor(Math.random() * poolToUse.length);
    const selected = poolToUse[randomIndex];
    
    selectedQuestions.push(selected);
    usedDriverKeys.add(selected.driver_key);
  }

  // Select culture questions
  const cultureQuestions = await selectCultureQuestions(
    supabase, 
    accountId, 
    cultureQuestionsCount,
    cultureBlockDays,
    cultureRotationEnabled,
    cultureRotationPillar
  );

  const totalQuestions = selectedQuestions.length + cultureQuestions.length;

  if (totalQuestions === 0) {
    return { success: false, error: 'Could not select any questions' };
  }

  // Create assignment
  const { data: assignment, error: assignmentError } = await supabase
    .from('pulse_daily_assignments')
    .insert({
      account_id: accountId,
      date: targetDate,
      generated_by: 'system',
      notes: `Auto-generated with ${selectedQuestions.length} regular + ${cultureQuestions.length} culture questions`
    })
    .select()
    .single();

  if (assignmentError) {
    return { success: false, error: `Error creating assignment: ${assignmentError.message}` };
  }

  // Create assignment items for regular questions
  const regularItems = selectedQuestions.map((q, index) => ({
    assignment_id: assignment.id,
    order_index: index + 1,
    question_id: q.id,
    is_culture_question: false,
    culture_pillar: null,
    culture_question_id: null,
  }));

  // Create assignment items for culture questions
  const cultureItems = cultureQuestions.map((q, index) => ({
    assignment_id: assignment.id,
    order_index: selectedQuestions.length + index + 1,
    question_id: null, // Culture questions don't use pulse_questions
    is_culture_question: true,
    culture_pillar: q.pillar_type,
    culture_question_id: q.id,
  }));

  const allItems = [...regularItems, ...cultureItems];

  const { error: itemsError } = await supabase
    .from('pulse_daily_assignment_items')
    .insert(allItems);

  if (itemsError) {
    await supabase.from('pulse_daily_assignments').delete().eq('id', assignment.id);
    return { success: false, error: `Error creating items: ${itemsError.message}` };
  }

  // Record history for regular questions
  if (selectedQuestions.length > 0) {
    const historyRecords = selectedQuestions.map(q => ({
      account_id: accountId,
      question_id: q.id,
      used_date: targetDate,
    }));
    await supabase.from('pulse_question_history').insert(historyRecords);
  }

  // Update last_used_at for culture questions
  if (cultureQuestions.length > 0) {
    const cultureIds = cultureQuestions.map(q => q.id);
    await supabase
      .from('pulse_culture_questions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', cultureIds);
  }

  // Advance culture rotation pillar (stateful per account) AFTER successful generation
  if (cultureRotationEnabled && cultureQuestionsCount > 0) {
    const nextPillar = getNextCultureRotationPillar(cultureRotationPillar);
    await supabase
      .from('pulse_schedule_rules')
      .update({
        culture_rotation_next_pillar: nextPillar,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId);
  }

  return { 
    success: true, 
    assignment_id: assignment.id,
    questions_count: totalQuestions,
    culture_questions_count: cultureQuestions.length
  };
}

// deno-lint-ignore no-explicit-any
async function createPulseNotifications(
  supabase: any,
  accountId: string,
  assignmentId: string,
  questionsCount: number
): Promise<number> {
  try {
    // Get all active members of the account
    const { data: members, error: membersError } = await supabase
      .from('account_members')
      .select('user_id')
      .eq('account_id', accountId);

    if (membersError || !members || members.length === 0) {
      logStep('No members found for notifications', { accountId });
      return 0;
    }

    const appUrl = 'https://gentia.lovable.app';
    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const dateKey = new Date().toISOString().split('T')[0];

    // Create a notification for EACH member (user_id is required - NOT NULL)
    // deno-lint-ignore no-explicit-any
    const notifications = members.map((m: any) => ({
      user_id: m.user_id,  // REQUIRED - NOT NULL field
      account_id: accountId,
      org_id: accountId,
      type: 'pulse_daily',
      title: '💫 Seu Pulso Diário está disponível!',
      message: `Responda ${questionsCount} perguntas rápidas sobre o pulso de ${today}`,
      target_url: '/retencao/pulse',
      link: `${appUrl}/retencao/pulse`,
      priority: 'high',
      entity_type: 'pulse_assignment',
      entity_id: assignmentId,
      dedupe_key: `pulse_daily_${m.user_id}_${dateKey}` // Per user deduplication
    }));

    const { data: insertedNotifications, error: notifError } = await supabase
      .from('notifications')
      .upsert(notifications, { 
        onConflict: 'dedupe_key',
        ignoreDuplicates: true 
      })
      .select();

    if (notifError) {
      logStep('Error creating notifications', { error: notifError.message });
      return 0;
    }

    logStep('Notifications created', { 
      accountId, 
      count: insertedNotifications?.length || 0
    });

    return insertedNotifications?.length || 0;

  } catch (error) {
    logStep('Error in createPulseNotifications', { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    return 0;
  }
}

async function sendDiscordNotification(
  accountsProcessed: number,
  notificationsCreated: number,
  cultureQuestionsAdded: number
): Promise<void> {
  const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
  
  if (!webhookUrl) {
    logStep('Discord webhook URL not configured, skipping notification');
    return;
  }

  const appUrl = 'https://gentia.lovable.app';
  const pulseUrl = `${appUrl}/retencao/pulse`;

  try {
    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });

    const embed = {
      title: '💫 Pulso Diário Disponível!',
      description: `@here O pulso de **${today}** está pronto para ser respondido!\n\n**[👉 Clique aqui para responder](${pulseUrl})**`,
      color: 0x6366F1, // Indigo color
      fields: [
        {
          name: '📊 Perguntas',
          value: `3 regulares + ${cultureQuestionsAdded > 0 ? cultureQuestionsAdded + ' de cultura' : '0 de cultura'}`,
          inline: true
        },
        {
          name: '🏢 Contas',
          value: `${accountsProcessed} processadas`,
          inline: true
        },
        {
          name: '⏰ Tempo estimado',
          value: '< 3 minutos',
          inline: true
        },
        {
          name: '🔗 Responder Agora',
          value: `**[Abrir Pulse Diário](${pulseUrl})**`,
          inline: false
        }
      ],
      footer: {
        text: 'Responda agora e mantenha seu streak! 🔥'
      },
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: '@here 🔔 **Novo pulso disponível!**',
        embeds: [embed]
      }),
    });

    if (response.ok) {
      logStep('Discord notification sent successfully');
    } else {
      const errorText = await response.text();
      logStep('Failed to send Discord notification', { 
        status: response.status, 
        error: errorText 
      });
    }
  } catch (error) {
    logStep('Error sending Discord notification', { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
  }
}
