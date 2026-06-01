import { createClient } from "npm:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  userId: string | null;
}

export async function checkRateLimit(
  req: Request,
  functionName: string,
  dailyLimit: number = 50
): Promise<RateLimitResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { allowed: false, remaining: 0, userId: null };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get user from token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('Auth error:', authError);
    return { allowed: false, remaining: 0, userId: null };
  }

  // Check and increment rate limit
  const { data: allowed, error: rlError } = await supabase.rpc('check_and_increment_rate_limit', {
    p_user_id: user.id,
    p_function_name: functionName,
    p_daily_limit: dailyLimit
  });

  if (rlError) {
    console.error('Rate limit check error:', rlError);
    // Allow on error to not block users due to DB issues
    return { allowed: true, remaining: dailyLimit, userId: user.id };
  }

  // Get remaining calls
  const { data: remaining } = await supabase.rpc('get_remaining_calls', {
    p_user_id: user.id,
    p_function_name: functionName,
    p_daily_limit: dailyLimit
  });

  return {
    allowed: allowed === true,
    remaining: remaining || 0,
    userId: user.id
  };
}

export function unauthorizedResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      error: 'unauthorized', 
      message: 'Autenticação necessária. Faça login para continuar.' 
    }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

export function rateLimitExceededResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ 
      error: 'rate_limit_exceeded', 
      message: 'Limite diário de 50 chamadas de IA atingido. Tente novamente amanhã.' 
    }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
