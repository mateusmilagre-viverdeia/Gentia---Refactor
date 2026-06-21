import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'
import { RESEND_DEFAULT_FROM_EMAIL, sendEmailViaResend } from '../_shared/resend-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-lovable-signature, x-lovable-timestamp, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

// Template mapping
const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Configuration
const SITE_NAME = "gentia"
const ROOT_DOMAIN = "ecpmais.com.br"
const EP_PARTNERS_ACCOUNT_ID = '67f66f7a-d9a8-455e-8820-ee836cfe7401'
const RECOVERY_COOLDOWN_MS = 2 * 60 * 1000
const recoveryCooldown = new Map<string, number>()

function normalizeEmail(email: unknown) {
  return String(email || '').toLowerCase().trim()
}

// Sample data for preview mode ONLY (not used in actual email sending).
// URLs are baked in at scaffold time from the project's real data.
// The sample email uses a fixed placeholder (RFC 6761 .test TLD) so the Go backend
// can always find-and-replace it with the actual recipient when sending test emails,
// even if the project's domain has changed since the template was scaffolded.
const SAMPLE_PROJECT_URL = "https://gentia.lovable.app"
const SAMPLE_EMAIL = "user@example.test"
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

// Preview endpoint handler - returns rendered HTML without sending email
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]

  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// Webhook handler - verifies signature and sends email
async function handleWebhook(req: Request): Promise<Response> {
  // Desacoplado do Lovable: verifica o webhook nativo do Supabase Auth ("Send Email Hook")
  // com standardwebhooks + SEND_EMAIL_HOOK_SECRET (formato "v1,whsec_..." gerado no painel).
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')
  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const rawBody = await req.text()
  const headers = Object.fromEntries(req.headers)
  const run_id = headers['webhook-id'] || crypto.randomUUID()

  let user: any
  let email_data: any
  try {
    const wh = new Webhook(hookSecret.replace('v1,whsec_', ''))
    const verified = wh.verify(rawBody, headers) as { user: any; email_data: any }
    user = verified.user
    email_data = verified.email_data
  } catch (error) {
    console.error('Invalid webhook signature/payload', {
      error: error instanceof Error ? error.message : String(error),
    })
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!user || !email_data) {
    console.error('Webhook payload missing user/email_data', { run_id })
    return new Response(
      JSON.stringify({ error: 'Invalid webhook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // email_action_type nativo: signup, recovery, invite, magiclink, reauthentication,
  // email_change (e variantes email_change_current/new -> mapeadas p/ 'email_change').
  const rawAction = String(email_data.email_action_type || '')
  const emailType = rawAction.startsWith('email_change') ? 'email_change' : rawAction
  const recipientEmail = normalizeEmail(user.email)
  console.log('Received auth event', { emailType, email: recipientEmail, run_id })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType, run_id })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Monta a URL de confirmação a partir do payload NATIVO do Supabase (token_hash +
  // verify endpoint do projeto). Antes o Lovable entregava a URL pronta (payload.data.url).
  const verifyBase = (Deno.env.get('SUPABASE_URL') || email_data.site_url || `https://${ROOT_DOMAIN}`).replace(/\/$/, '')
  const redirectTo = email_data.redirect_to || email_data.site_url || `https://${ROOT_DOMAIN}`
  const confirmationUrl =
    `${verifyBase}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}` +
    `&redirect_to=${encodeURIComponent(redirectTo)}`

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: `https://${ROOT_DOMAIN}`,
    recipient: user.email,
    confirmationUrl,
    token: email_data.token,
    email: user.email,
    newEmail: user.new_email ?? email_data.new_email,
  }

  // Render React Email to HTML and plain text
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  // Auth emails are intentionally sent via Resend to keep the legacy operational flow.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (emailType === 'recovery') {
    const now = Date.now()
    const localCooldownUntil = recoveryCooldown.get(recipientEmail) || 0
    const cooldownSince = new Date(now - RECOVERY_COOLDOWN_MS).toISOString()
    const { data: recentRecovery } = await supabase
      .from('recruitment_communications_log')
      .select('id, created_at, status, provider_message_id')
      .eq('recipient', recipientEmail)
      .eq('message_type', 'auth_recovery')
      .in('status', ['sent', 'blocked_by_cooldown'])
      .gte('created_at', cooldownSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (localCooldownUntil > now || recentRecovery) {
      await supabase.from('recruitment_communications_log').insert({
        account_id: EP_PARTNERS_ACCOUNT_ID,
        message_type: 'auth_recovery',
        channel: 'email',
        recipient: recipientEmail,
        subject: EMAIL_SUBJECTS.recovery,
        status: 'blocked_by_cooldown',
        provider: 'internal_guard',
        provider_message_id: null,
        error_code: 'RECOVERY_COOLDOWN_ACTIVE',
        error_message: 'Já existe um link de recuperação recente para este e-mail.',
        metadata: { run_id, email_type: emailType, recent_recovery_id: recentRecovery?.id ?? null },
      })

      console.log('Recovery email blocked by cooldown', { email: recipientEmail, run_id })
      return new Response(JSON.stringify({ success: true, blocked_by_cooldown: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    recoveryCooldown.set(recipientEmail, now + RECOVERY_COOLDOWN_MS)
  }

  const messageId = crypto.randomUUID()
  const subject = EMAIL_SUBJECTS[emailType] || 'Notification'
  const sendResult = await sendEmailViaResend({
    to: recipientEmail,
    subject,
    html,
    text,
    fromName: SITE_NAME,
    fromEmail: RESEND_DEFAULT_FROM_EMAIL,
    tags: [{ name: 'email_type', value: `auth_${emailType}` }],
  })

  await supabase.from('recruitment_communications_log').insert({
    account_id: EP_PARTNERS_ACCOUNT_ID,
    message_type: `auth_${emailType}`,
    channel: 'email',
    recipient: recipientEmail,
    subject,
    body: html,
    status: sendResult.ok ? 'sent' : 'failed',
    provider: 'resend',
    provider_message_id: sendResult.id ?? null,
    error_code: sendResult.ok ? null : 'RESEND_SEND_FAILED',
    error_message: sendResult.error ?? null,
    metadata: { run_id, message_id: messageId, email_type: emailType },
  })

  if (!sendResult.ok) {
    console.error('Failed to send auth email via Resend', { error: sendResult.error, run_id, emailType })
    return new Response(JSON.stringify({ error: 'Failed to send email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('Auth email sent via Resend', { emailType, email: recipientEmail, run_id, messageId: sendResult.id })

  return new Response(
    JSON.stringify({ success: true, provider: 'resend', message_id: sendResult.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // Handle CORS preflight for main endpoint
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
