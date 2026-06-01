import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generic email domains to ignore for duplicate checking
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

// Normalize company name for comparison
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\b(ltda|s\.?a\.?|me|epp|eireli|s\/s|ss|sociedade|limitada|empresa|individual|comercio|comercial|industria|servicos|assessoria|consultoria|solucoes|solutions)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate similarity between two strings (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(' ').filter(w => w.length > 1));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 1));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Extract domain from email
function extractDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  
  const domain = parts[1].toLowerCase();
  if (GENERIC_DOMAINS.includes(domain)) return null;
  
  return domain;
}

interface DuplicateMatch {
  org_id: string;
  org_name: string;
  match_type: 'cnpj' | 'email_domain' | 'name';
  confidence: 'high' | 'medium';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, cnpj, user_email } = await req.json();

    if (!name || !user_email) {
      return new Response(
        JSON.stringify({ error: "Name and user_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const matches: DuplicateMatch[] = [];
    const seenOrgIds = new Set<string>();

    // 1. Check by CNPJ if provided
    if (cnpj) {
      const cnpjDigits = cnpj.replace(/\D/g, '');
      if (cnpjDigits.length >= 11) {
        const { data: cnpjMatches } = await supabase
          .from('companies')
          .select('id, name')
          .eq('cnpj_digits', cnpjDigits)
          .limit(5);

        if (cnpjMatches) {
          for (const match of cnpjMatches) {
            if (!seenOrgIds.has(match.id)) {
              seenOrgIds.add(match.id);
              matches.push({
                org_id: match.id,
                org_name: match.name,
                match_type: 'cnpj',
                confidence: 'high',
              });
            }
          }
        }
      }
    }

    // 2. Check by email domain (only for corporate emails)
    const emailDomain = extractDomain(user_email);
    if (emailDomain) {
      console.log(`Checking email domain: ${emailDomain}`);
      
      // Find users with same domain that are members/owners of companies
      const { data: domainUsers } = await supabase
        .from('profiles')
        .select('id, email, account_id')
        .ilike('email', `%@${emailDomain}`)
        .not('account_id', 'is', null)
        .limit(20);

      if (domainUsers && domainUsers.length > 0) {
        // Get unique account IDs
        const accountIds = [...new Set(domainUsers.map(u => u.account_id).filter(Boolean))];
        
        if (accountIds.length > 0) {
          const { data: companies } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', accountIds);

          if (companies) {
            for (const company of companies) {
              if (!seenOrgIds.has(company.id)) {
                seenOrgIds.add(company.id);
                matches.push({
                  org_id: company.id,
                  org_name: company.name,
                  match_type: 'email_domain',
                  confidence: 'high',
                });
              }
            }
          }
        }
      }

      // Also check account_members table for owners/admins with same domain
      const { data: memberDomainUsers } = await supabase
        .from('account_members')
        .select('account_id, user_id, role')
        .in('role', ['owner', 'admin'])
        .limit(100);

      if (memberDomainUsers && memberDomainUsers.length > 0) {
        // Get profiles for these users
        const userIds = memberDomainUsers.map(m => m.user_id);
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds)
          .ilike('email', `%@${emailDomain}`);

        if (memberProfiles && memberProfiles.length > 0) {
          const matchingUserIds = new Set(memberProfiles.map(p => p.id));
          const matchingAccountIds = memberDomainUsers
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
                  matches.push({
                    org_id: company.id,
                    org_name: company.name,
                    match_type: 'email_domain',
                    confidence: 'high',
                  });
                }
              }
            }
          }
        }
      }
    }

    // 3. Check by normalized name similarity
    const normalizedInput = normalizeName(name);
    if (normalizedInput.length >= 3) {
      // Get all companies and check similarity
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('id, name')
        .limit(500);

      if (allCompanies) {
        for (const company of allCompanies) {
          if (seenOrgIds.has(company.id)) continue;
          
          const normalizedCompany = normalizeName(company.name);
          const similarity = calculateSimilarity(normalizedInput, normalizedCompany);
          
          // High confidence for >90% similarity, medium for 75-90%
          if (similarity >= 0.9) {
            seenOrgIds.add(company.id);
            matches.push({
              org_id: company.id,
              org_name: company.name,
              match_type: 'name',
              confidence: 'high',
            });
          } else if (similarity >= 0.75) {
            seenOrgIds.add(company.id);
            matches.push({
              org_id: company.id,
              org_name: company.name,
              match_type: 'name',
              confidence: 'medium',
            });
          }
        }
      }
    }

    console.log(`Found ${matches.length} potential duplicates for "${name}"`);

    // Determine if creation should be blocked (high confidence matches exist)
    const hasHighConfidenceMatch = matches.some(m => m.confidence === 'high');
    const hasMediumConfidenceMatch = matches.some(m => m.confidence === 'medium');

    return new Response(
      JSON.stringify({
        has_duplicates: matches.length > 0,
        matches: matches.slice(0, 5), // Limit to top 5 matches
        can_create: !hasHighConfidenceMatch, // Block if high confidence match exists
        requires_confirmation: !hasHighConfidenceMatch && hasMediumConfidenceMatch, // Require confirmation for medium confidence only
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking duplicates:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
