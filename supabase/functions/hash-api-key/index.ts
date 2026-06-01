import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use Web Crypto API for hashing since Deno's bcrypt has issues
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyApiKey(plainKey: string, storedHash: string): Promise<boolean> {
  const hash = await hashApiKey(plainKey);
  return hash === storedHash;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, account_id, api_key, key_name } = await req.json();

    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to this account
    const { data: member, error: memberError } = await supabase
      .from('account_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('account_id', account_id)
      .eq('is_active', true)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only admins and owners can manage API keys
    if (!['admin', 'owner'].includes(member.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      // Generate a new API key
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let plainKey = 'ep_';
      for (let i = 0; i < 32; i++) {
        plainKey += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const keyPrefix = plainKey.substring(0, 11); // "ep_" + 8 chars
      
      // Hash the API key using SHA-256
      const keyHash = await hashApiKey(plainKey);
      
      console.log(`[hash-api-key] Creating new API key for account ${account_id}`);
      
      const { error: insertError } = await supabase.from('organization_api_keys').insert({
        account_id,
        name: key_name || 'New API Key',
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });
      
      if (insertError) {
        console.error('[hash-api-key] Insert error:', insertError);
        throw insertError;
      }
      
      // Return the plain key ONLY during creation - it won't be stored
      return new Response(JSON.stringify({ 
        success: true, 
        api_key: plainKey,
        key_prefix: keyPrefix,
        message: 'API key created. Save this key now - it cannot be retrieved later.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      if (!api_key) {
        return new Response(JSON.stringify({ error: 'api_key is required for verification' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find all active keys for this account and verify against each
      const { data: keys, error: keysError } = await supabase
        .from('organization_api_keys')
        .select('id, key_hash, account_id')
        .eq('account_id', account_id);
      
      if (keysError) {
        throw keysError;
      }

      for (const key of keys || []) {
        // First check if it's a hashed key (SHA-256 format - 64 chars hex)
        const isHashedFormat = /^[a-f0-9]{64}$/.test(key.key_hash);
        
        if (isHashedFormat) {
          const isValid = await verifyApiKey(api_key, key.key_hash);
          if (isValid) {
            // Update last_used_at
            await supabase
              .from('organization_api_keys')
              .update({ last_used_at: new Date().toISOString() })
              .eq('id', key.id);
            
            return new Response(JSON.stringify({ 
              valid: true, 
              key_id: key.id,
              account_id: key.account_id 
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        } else {
          // Legacy plaintext key - check and migrate
          if (key.key_hash === api_key) {
            // Migrate to hashed format
            const newHash = await hashApiKey(api_key);
            await supabase
              .from('organization_api_keys')
              .update({ 
                key_hash: newHash, 
                last_used_at: new Date().toISOString() 
              })
              .eq('id', key.id);
            
            console.log(`[hash-api-key] Migrated legacy key ${key.id} to hashed format`);
            
            return new Response(JSON.stringify({ 
              valid: true, 
              key_id: key.id,
              account_id: key.account_id,
              migrated: true
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "create" or "verify"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[hash-api-key] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
