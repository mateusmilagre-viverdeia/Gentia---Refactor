import { sendEmailViaResend, type SendEmailParams } from './resend-email.ts';

export interface OutreachEmailParams {
  supabase: any;
  to: string;
  candidateName: string;
  message: string;
  subject: string;
  companyName: string;
}

export async function sendOutreachEmail(params: OutreachEmailParams): Promise<{ ok: boolean; error?: string }> {
  const { supabase, to, candidateName, message, subject, companyName } = params;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f7f7f7;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${escapeHtml(companyName)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#333333;font-size:15px;line-height:1.6;">
                Olá${candidateName ? ' <strong>' + escapeHtml(candidateName) + '</strong>' : ''},
              </p>
              <div style="margin:0 0 24px;color:#333333;font-size:15px;line-height:1.7;">
                ${escapeHtml(message).replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #eeeeee;background-color:#fafafa;">
              <p style="margin:0;color:#999999;font-size:12px;line-height:1.5;">
                Enviado por ${escapeHtml(companyName)} · Recrutamento
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmailViaResend({ supabase, to, subject, html });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
