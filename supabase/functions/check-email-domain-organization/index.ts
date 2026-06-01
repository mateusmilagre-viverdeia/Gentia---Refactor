import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic email domains to ignore
const GENERIC_DOMAINS = [
  'gmail.com', 'gmail.com.br',
  'hotmail.com', 'hotmail.com.br',
  'outlook.com', 'outlook.com.br',
  'yahoo.com', 'yahoo.com.br',
  'live.com', 'msn.com',
  'icloud.com', 'me.com',
  'protonmail.com', 'proton.me',
  'uol.com.br', 'bol.com.br',
  'terra.com.br', 'ig.com.br',
  'globo.com', 'globomail.com',
  'mail.com', 'aol.com',
  'yandex.com', 'zoho.com',
];

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  
  if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now });
    return false;
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  entry.count++;
  return false;
}

function extractDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return null;
  
  const domain = parts[1];
  if (GENERIC_DOMAINS.includes(domain)) return null;
  
  return domain;
}

interface OrganizationMatch {
  id: string;
  name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = extractDomain(email);
    
    // If generic email, no organization check needed
    if (!domain) {
      return new Response(
        JSON.stringify({ 
          has_organization: false, 
          organizations: [],
          is_generic_domain: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking organizations for domain: ${domain}`);
    
    const organizations: OrganizationMatch[] = [];
    const seenOrgIds = new Set<string>();

    // 1. Check profiles with matching domain that have account_id
    const { data: profilesWithOrg } = await supabase
      .from('profiles')
      .select('account_id')
      .ilike('email', `%@${domain}`)
      .not('account_id', 'is', null)
      .limit(20);

    if (profilesWithOrg && profilesWithOrg.length > 0) {
      const accountIds = [...new Set(profilesWithOrg.map(p => p.account_id).filter(Boolean))];
      
      if (accountIds.length > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', accountIds);

        if (companies) {
          for (const company of companies) {
            if (!seenOrgIds.has(company.id)) {
              seenOrgIds.add(company.id);
              organizations.push({ id: company.id, name: company.name });
            }
          }
        }
      }
    }

    // 2. Check account_members for owners/admins with same domain
    const { data: adminMembers } = await supabase
      .from('account_members')
      .select('account_id, user_id')
      .in('role', ['owner', 'admin', 'admin_rh'])
      .limit(200);

    if (adminMembers && adminMembers.length > 0) {
      const userIds = adminMembers.map(m => m.user_id);
      
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds)
        .ilike('email', `%@${domain}`);

      if (adminProfiles && adminProfiles.length > 0) {
        const matchingUserIds = new Set(adminProfiles.map(p => p.id));
        const matchingAccountIds = adminMembers
          .filter(m => matchingUserIds.has(m.user_id))
          .map(m => m.account_id);

        if (matchingAccountIds.length > 0) {
          const { data: memberCompanies } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', matchingAccountIds);

          if (memberCompanies) {
            for (const company of memberCompanies) {
              if (!seenOrgIds.has(company.id)) {
                seenOrgIds.add(company.id);
                organizations.push({ id: company.id, name: company.name });
              }
            }
          }
        }
      }
    }

    console.log(`Found ${organizations.length} organizations for domain ${domain}`);

    return new Response(
      JSON.stringify({
        has_organization: organizations.length > 0,
        organizations: organizations.slice(0, 5), // Limit to 5
        is_generic_domain: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking email domain:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
