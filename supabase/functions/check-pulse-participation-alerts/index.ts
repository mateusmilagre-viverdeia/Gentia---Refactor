import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts'

const log = createLogger('check-pulse-participation-alerts');

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  log.log(step, details);
};

interface InactiveMember {
  userId: string;
  userName: string;
  teamId: string | null;
  teamName: string | null;
  daysSinceLastResponse: number;
  lastResponseDate: string | null;
}

interface TeamParticipation {
  teamId: string;
  teamName: string;
  totalMembers: number;
  respondedCount: number;
  participationRate: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    logStep("Starting participation alerts check");

    // Get all active accounts with pulse enabled
    const { data: accounts, error: accountsError } = await supabase
      .from('pulse_schedule_rules')
      .select('account_id')
      .eq('is_active', true);

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    const uniqueAccountIds = [...new Set(accounts?.map(a => a.account_id) || [])];
    logStep("Found accounts with pulse enabled", { count: uniqueAccountIds.length });

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let totalAlertsCreated = 0;
    let totalNotificationsSent = 0;

    for (const accountId of uniqueAccountIds) {
      try {
        logStep("Processing account", { accountId });

        // Get active pulse members for this account
        const { data: members, error: membersError } = await supabase
          .from('pulse_user_profiles')
          .select(`
            user_id,
            team_id,
            pulse_teams(id, name, leader_user_id)
          `)
          .eq('account_id', accountId)
          .eq('is_active', true);

        if (membersError) {
          logStep("Error fetching members", { accountId, error: membersError.message });
          continue;
        }

        if (!members || members.length === 0) {
          logStep("No active members found", { accountId });
          continue;
        }

        // Fetch profiles separately
        const memberUserIds = members.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', memberUserIds);

        const profilesMap = new Map<string, { first_name: string | null; last_name: string | null }>();
        profiles?.forEach(p => {
          profilesMap.set(p.id, { first_name: p.first_name, last_name: p.last_name });
        });

        // Get last response date for each member
        const memberIds = members.map(m => m.user_id);
        const { data: responses, error: responsesError } = await supabase
          .from('pulse_responses')
          .select('respondent_user_id, created_at')
          .eq('account_id', accountId)
          .in('respondent_user_id', memberIds)
          .order('created_at', { ascending: false });

        if (responsesError) {
          logStep("Error fetching responses", { accountId, error: responsesError.message });
          continue;
        }

        // Build map of last response per user
        const lastResponseMap = new Map<string, Date>();
        responses?.forEach(r => {
          if (!lastResponseMap.has(r.respondent_user_id)) {
            lastResponseMap.set(r.respondent_user_id, new Date(r.created_at));
          }
        });

        // Find inactive members (>7 days without response)
        const inactiveMembers: InactiveMember[] = [];
        const teamParticipation = new Map<string, TeamParticipation>();

        members.forEach(member => {
          const profile = profilesMap.get(member.user_id) || { first_name: null, last_name: null };
          const teamData = member.pulse_teams as unknown;
          const team = teamData as { id: string; name: string; leader_user_id: string | null } | null;
          
          const lastResponse = lastResponseMap.get(member.user_id);
          const daysSinceLastResponse = lastResponse
            ? Math.floor((today.getTime() - lastResponse.getTime()) / (1000 * 60 * 60 * 24))
            : 999; // Never responded

          // Track for team participation
          if (team) {
            if (!teamParticipation.has(team.id)) {
              teamParticipation.set(team.id, {
                teamId: team.id,
                teamName: team.name,
                totalMembers: 0,
                respondedCount: 0,
                participationRate: 0,
              });
            }
            const tp = teamParticipation.get(team.id)!;
            tp.totalMembers++;
            if (daysSinceLastResponse <= 7) {
              tp.respondedCount++;
            }
          }

          // Check if inactive
          if (daysSinceLastResponse > 7) {
            inactiveMembers.push({
              userId: member.user_id,
              userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuário',
              teamId: team?.id || null,
              teamName: team?.name || null,
              daysSinceLastResponse,
              lastResponseDate: lastResponse?.toISOString() || null,
            });
          }
        });

        logStep("Found inactive members", { accountId, count: inactiveMembers.length });

        // Calculate team participation rates
        teamParticipation.forEach(tp => {
          tp.participationRate = tp.totalMembers > 0 
            ? Math.round((tp.respondedCount / tp.totalMembers) * 100) 
            : 0;
        });

        // Get existing unresolved alerts to avoid duplicates
        const { data: existingAlerts } = await supabase
          .from('pulse_alerts')
          .select('id, alert_type, related_user_id, related_team_id')
          .eq('account_id', accountId)
          .eq('is_resolved', false)
          .eq('alert_type', 'low_participation');

        const existingMemberAlerts = new Set(
          existingAlerts?.filter(a => a.related_user_id !== null).map(a => a.related_user_id) || []
        );
        const existingTeamAlerts = new Set(
          existingAlerts?.filter(a => a.related_user_id === null && a.related_team_id !== null).map(a => a.related_team_id) || []
        );

        // Create alerts for inactive members
        const newMemberAlerts = inactiveMembers.filter(m => !existingMemberAlerts.has(m.userId));
        
        for (const member of newMemberAlerts) {
          const severity = member.daysSinceLastResponse > 14 ? 'critical' : 'warning';
          
          const { error: alertError } = await supabase
            .from('pulse_alerts')
            .insert({
              account_id: accountId,
              alert_type: 'low_participation',
              severity,
              title: `${member.userName} inativo há ${member.daysSinceLastResponse} dias`,
              description: member.teamName 
                ? `Membro do time ${member.teamName} não responde ao Pulse há ${member.daysSinceLastResponse} dias.`
                : `Colaborador não responde ao Pulse há ${member.daysSinceLastResponse} dias.`,
              related_user_id: member.userId,
              related_team_id: member.teamId,
            });

          if (alertError) {
            logStep("Error creating member alert", { error: alertError.message });
          } else {
            totalAlertsCreated++;

            // Create notification for team leader if exists
            if (member.teamId) {
              const foundMember = members.find(m => m.team_id === member.teamId);
              const teamData = foundMember?.pulse_teams as unknown as { leader_user_id: string | null } | null;
              if (teamData?.leader_user_id) {
                const { error: notifError } = await supabase
                  .from('notifications')
                  .insert({
                    type: 'pulse_inactive_member',
                    title: `Membro inativo: ${member.userName}`,
                    message: `${member.userName} não responde ao Pulse há ${member.daysSinceLastResponse} dias. Considere uma conversa individual.`,
                    target_url: '/retencao/pulse/dashboard?tab=participation',
                    priority: severity === 'critical' ? 'high' : 'normal',
                    metadata: {
                      user_id: member.userId,
                      days_inactive: member.daysSinceLastResponse,
                    },
                  });

                if (!notifError) {
                  // Add recipient
                  const { data: notif } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('title', `Membro inativo: ${member.userName}`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  if (notif) {
                    await supabase
                      .from('notification_recipients')
                      .insert({
                        notification_id: notif.id,
                        user_id: teamData.leader_user_id,
                      });
                    totalNotificationsSent++;
                  }
                }
              }
            }
          }
        }

        // Create alerts for teams with low participation (<50%)
        for (const [teamId, tp] of teamParticipation) {
          if (tp.participationRate < 50 && !existingTeamAlerts.has(teamId)) {
            const { error: alertError } = await supabase
              .from('pulse_alerts')
              .insert({
                account_id: accountId,
                alert_type: 'low_participation',
                severity: tp.participationRate < 30 ? 'critical' : 'warning',
                title: `Participação baixa no time ${tp.teamName}`,
                description: `Apenas ${tp.participationRate}% do time ${tp.teamName} respondeu ao Pulse nos últimos 7 dias.`,
                related_team_id: teamId,
              });

            if (!alertError) {
              totalAlertsCreated++;
            }
          }
        }

      } catch (error) {
        logStep("Error processing account", { accountId, error: String(error) });
      }
    }

    logStep("Completed participation alerts check", {
      alertsCreated: totalAlertsCreated,
      notificationsSent: totalNotificationsSent,
    });

    return new Response(JSON.stringify({
      success: true,
      alertsCreated: totalAlertsCreated,
      notificationsSent: totalNotificationsSent,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error in participation alerts check", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
