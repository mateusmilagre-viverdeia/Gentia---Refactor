import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeEncoding(text: string): string {
  let cleaned = text;
  // Strip BOM (UTF-8 or UTF-16)
  if (cleaned.charCodeAt(0) === 0xFEFF || cleaned.charCodeAt(0) === 0xFFFE) {
    cleaned = cleaned.slice(1);
  }
  // Remove null bytes from UTF-16 misread
  cleaned = cleaned.replace(/\0/g, '');
  return cleaned;
}

function detectDelimiter(headerLine: string): string {
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  if (tabCount >= commaCount && tabCount >= semiCount) return '\t';
  if (semiCount >= commaCount) return ';';
  return ',';
}

function parseCSVRecords(csvText: string): string[][] {
  const normalized = normalizeEncoding(csvText).trim();
  if (!normalized) return [];

  // First, detect delimiter from the first line (up to the first unquoted newline)
  let firstLine = '';
  {
    let inQ = false;
    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      if (ch === '"') inQ = !inQ;
      if (!inQ && (ch === '\n' || ch === '\r')) break;
      firstLine += ch;
    }
  }
  const delimiter = detectDelimiter(firstLine);

  // Parse character by character, respecting quoted fields with internal newlines
  const records: string[][] = [];
  let currentField = '';
  let currentRecord: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < normalized.length && normalized[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (ch === '\r') {
        // skip, handle \n next
      } else if (ch === '\n') {
        currentRecord.push(currentField.trim());
        currentField = '';
        if (currentRecord.some(f => f.length > 0)) {
          records.push(currentRecord);
        }
        currentRecord = [];
      } else {
        currentField += ch;
      }
    }
  }
  // Last field/record
  currentRecord.push(currentField.trim());
  if (currentRecord.some(f => f.length > 0)) {
    records.push(currentRecord);
  }

  return records;
}

function parseCSV(csvText: string): Record<string, string>[] {
  const records = parseCSVRecords(csvText);
  if (records.length < 2) return [];

  const headers = records[0];
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

// Normalize column names for flexible matching — returns first NON-EMPTY value
function findColumn(row: Record<string, string>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const found = keys.find(k => k.toLowerCase().replace(/[_\s-]/g, '') === lower.replace(/[_\s-]/g, ''));
    if (found && row[found]?.trim()) return row[found];
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { csv_text, search_id, job_id, query } = await req.json();

    if (!csv_text || typeof csv_text !== 'string') {
      return new Response(JSON.stringify({ error: 'csv_text é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get account_id from user membership
    const { data: member } = await supabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Conta não encontrada' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accountId = member.account_id;

    // Parse CSV
    const rows = parseCSV(csv_text);
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'CSV vazio ou inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (rows.length > 500) {
      return new Response(JSON.stringify({ error: 'Máximo de 500 leads por importação' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve or create search
    let searchId = search_id;

    if (!searchId) {
      if (!job_id) {
        return new Response(JSON.stringify({ error: 'search_id ou job_id é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const searchQuery = query || `Importação Evaboot - ${new Date().toLocaleDateString('pt-BR')}`;
      const { data: newSearch, error: searchErr } = await supabase
        .from('recruitment_hunting_searches')
        .insert({
          account_id: accountId,
          job_id,
          query: searchQuery,
          sources: ['linkedin'],
          status: 'completed',
          results_count: 0,
        })
        .select('id')
        .single();

      if (searchErr || !newSearch) {
        console.error('[evaboot-csv] Error creating search:', searchErr);
        return new Response(JSON.stringify({ error: 'Erro ao criar busca' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      searchId = newSearch.id;
    }

    // Verify search exists and belongs to account
    const { data: searchRecord } = await supabase
      .from('recruitment_hunting_searches')
      .select('id, account_id, results_count')
      .eq('id', searchId)
      .eq('account_id', accountId)
      .single();

    if (!searchRecord) {
      return new Response(JSON.stringify({ error: 'Busca não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let newCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const linkedinUrl = findColumn(row,
        'LinkedIn URL', 'Linkedin URL Public', 'Linkedin URL Unique ID',
        'linkedinUrl', 'linkedin_url', 'profile_url', 'LinkedIn Profile URL'
      );

      if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
        skippedCount++;
        continue;
      }

      // Dedup
      const { data: existing } = await supabase
        .from('recruitment_hunting_results')
        .select('id')
        .eq('search_id', searchId)
        .eq('source_url', linkedinUrl)
        .maybeSingle();

      if (existing) {
        duplicateCount++;
        continue;
      }

      const fullName = findColumn(row, 'Full Name', 'full_name', 'Name', 'name')
        || `${findColumn(row, 'First Name', 'first_name', 'firstName')} ${findColumn(row, 'Last Name', 'last_name', 'lastName')}`.trim();
      const jobTitle = findColumn(row, 'Job Title', 'Current Job', 'job_title', 'Title', 'title', 'Headline', 'headline');
      const company = findColumn(row, 'Company Name', 'company_name', 'Company', 'company', 'Current Company');
      const location = findColumn(row, 'Location', 'location', 'City', 'city', 'Company Location');
      const email = findColumn(row, 'Email', 'email', 'Professional Email', 'professional_email');
      const phone = findColumn(row, 'Phone', 'phone', 'Phone Number', 'phone_number');
      const salesNavUrl = findColumn(row, 'Sales Navigator URL');

      const { data: inserted, error: insertErr } = await supabase
        .from('recruitment_hunting_results')
        .insert({
          search_id: searchId,
          source: 'linkedin',
          source_url: linkedinUrl,
          extracted_data: {
            name: fullName,
            title: `${fullName} - ${jobTitle} at ${company}`,
            company,
            location,
            email,
            phone,
            evaboot_source: true,
            sales_navigator_url: salesNavUrl || null,
            apollo_data: {
              name: fullName,
              title: jobTitle,
              organization_name: company,
              email: email || null,
              phone: phone || null,
              linkedin_url: linkedinUrl,
            },
          },
          status: 'pending',
          score_source: 'pending',
          qualified: false,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('[evaboot-csv] Insert error:', insertErr);
        continue;
      }

      newCount++;

      // Fire-and-forget scrape
      if (inserted) {
        fetch(`${supabaseUrl}/functions/v1/hunting-scrape-profile`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          },
          body: JSON.stringify({
            result_id: inserted.id,
            url: linkedinUrl,
          }),
        }).catch(err => console.error('[evaboot-csv] Scrape trigger error:', err));
      }
    }

    // Update search results count
    await supabase
      .from('recruitment_hunting_searches')
      .update({
        results_count: (searchRecord.results_count || 0) + newCount,
      })
      .eq('id', searchId);

    console.log(`[evaboot-csv] Done: ${newCount} new, ${duplicateCount} duplicates, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        search_id: searchId,
        new_candidates: newCount,
        duplicates: duplicateCount,
        skipped: skippedCount,
        total_rows: rows.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[evaboot-csv] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
