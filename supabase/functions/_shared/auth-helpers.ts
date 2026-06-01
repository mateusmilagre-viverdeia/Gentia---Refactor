import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  supabase: SupabaseClient;
}

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
  status?: number;
}

/**
 * Authenticate user from request and return auth context
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'No authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    console.error('[auth-helpers] Auth error:', authError);
    return { success: false, error: 'Unauthorized', status: 401 };
  }

  return {
    success: true,
    context: {
      user: {
        id: user.id,
        email: user.email,
      },
      supabase,
    },
  };
}

/**
 * Verify that the authenticated user has access to the specified account
 * Returns true if user is a member of the account OR has EP consultant access
 */
export async function verifyAccountAccess(
  supabase: SupabaseClient,
  userId: string,
  accountId: string
): Promise<boolean> {
  if (!accountId || !userId) {
    return false;
  }

  // Check 0: EP internal roles (super_admin/head_cs) have access to all accounts
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (rolesError) {
    console.error('[auth-helpers] Error checking user roles:', rolesError);
  }

  const roles = Array.isArray(rolesData) ? rolesData : rolesData ? [rolesData] : [];
  const roleSet = new Set(roles.map((r: any) => r?.role).filter(Boolean));

  if (roleSet.has('super_admin') || roleSet.has('head_cs')) {
    return true;
  }

  // Check 1: Direct account membership
  const { data: member, error: memberError } = await supabase
    .from('account_members')
    .select('id, role, is_active')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('is_active', true)
    .maybeSingle();

  if (memberError) {
    console.error('[auth-helpers] Error checking account access:', memberError);
  }

  if (member) {
    return true;
  }

  // Check 2: EP Consultant with active assignment to this account
  const { data: consultant, error: consultantError } = await supabase
    .from('ep_consultants')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (consultantError) {
    console.error('[auth-helpers] Error checking consultant:', consultantError);
  }

  if (consultant) {
    const { data: assignment, error: assignmentError } = await supabase
      .from('consultant_assignments')
      .select('id')
      .eq('consultant_id', consultant.id)
      .eq('account_id', accountId)
      .eq('active', true)
      .maybeSingle();

    if (assignmentError) {
      console.error('[auth-helpers] Error checking assignment:', assignmentError);
    }

    if (assignment) {
      console.log(`[auth-helpers] EP Consultant ${userId} has access to account ${accountId} via assignment`);
      return true;
    }
  }

  // Check 3: EP Partner with grant to this account
  const { data: partner, error: partnerError } = await supabase
    .from('ep_partners')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (partnerError) {
    console.error('[auth-helpers] Error checking partner:', partnerError);
  }

  if (partner) {
    const { data: grant, error: grantError } = await supabase
      .from('partner_client_grants')
      .select('id')
      .eq('partner_id', partner.id)
      .eq('org_id', accountId)
      .maybeSingle();

    if (grantError) {
      console.error('[auth-helpers] Error checking partner grant:', grantError);
    }

    if (grant) {
      console.log(`[auth-helpers] EP Partner ${userId} has access to account ${accountId} via grant`);
      return true;
    }
  }

  return false;
}

/**
 * Get the account membership details for a user
 */
export async function getAccountMembership(
  supabase: SupabaseClient,
  userId: string,
  accountId: string
): Promise<{ id: string; role: string; isActive: boolean } | null> {
  if (!accountId || !userId) {
    return null;
  }

  const { data: member, error } = await supabase
    .from('account_members')
    .select('id, role, is_active')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .maybeSingle();

  if (error || !member) {
    return null;
  }

  return {
    id: member.id,
    role: member.role,
    isActive: member.is_active ?? false,
  };
}

/**
 * Response helper for unauthorized account access
 */
export function forbiddenResponse(corsHeaders: Record<string, string>, message?: string) {
  return new Response(
    JSON.stringify({ 
      error: 'forbidden', 
      message: message || 'Você não tem acesso a esta organização.' 
    }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Response helper for authentication errors
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message?: string) {
  return new Response(
    JSON.stringify({ 
      error: 'unauthorized', 
      message: message || 'Autenticação necessária. Faça login para continuar.' 
    }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
