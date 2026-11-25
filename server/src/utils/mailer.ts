import { env, isProd } from '../config/env.ts';

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Emails "sent" while NODE_ENV=test, so tests can read reset links. */
export const sentEmails: Email[] = [];

/**
 * Sends an email through Resend's HTTP API when RESEND_API_KEY is set.
 * Without a key, development prints the email to the console so the flow can be tried locally.
 */
export async function sendEmail(email: Email): Promise<void> {
  if (env.nodeEnv === 'test') {
    sentEmails.push(email);
    return;
  }

  if (!env.resendApiKey) {
    if (isProd) {
      console.warn(`[mailer] RESEND_API_KEY is not set, so the "${email.subject}" email was not sent.`);
    } else {
      console.log(`\n[mailer] To: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
  });
  if (!res.ok) {
    // Log and carry on: the API response must not reveal whether the email exists or sending failed.
    console.error(`[mailer] Resend rejected the email (${res.status}): ${await res.text()}`);
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function passwordResetEmail(to: string, name: string, link: string): Email {
  const first = name.split(' ')[0] ?? name;
  return {
    to,
    subject: 'Reset your RemoteHire password',
    text: `Hi ${first},\n\nSomeone asked to reset the password for your RemoteHire account. If it was you, open this link within 30 minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email. Your password won't change.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 12px">Reset your password</h2>
  <p>Hi ${escapeHtml(first)},</p>
  <p>Someone asked to reset the password for your RemoteHire account. If it was you, click the button below within 30 minutes.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#1f63e0;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Choose a new password</a></p>
  <p style="color:#5b6577;font-size:14px">If you didn't ask for this, you can ignore this email. Your password won't change.</p>
</div>`,
  };
}

export function passwordChangedEmail(to: string, name: string): Email {
  const first = name.split(' ')[0] ?? name;
  return {
    to,
    subject: 'Your RemoteHire password was changed',
    text: `Hi ${first},\n\nThe password for your RemoteHire account was just changed, and you were signed out on your other devices.\n\nIf this wasn't you, reset your password right away using "Forgot password?" on the sign-in page.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 12px">Your password was changed</h2>
  <p>Hi ${escapeHtml(first)},</p>
  <p>The password for your RemoteHire account was just changed, and you were signed out on your other devices.</p>
  <p style="color:#5b6577;font-size:14px">If this wasn't you, reset your password right away using "Forgot password?" on the sign-in page.</p>
</div>`,
  };
}
