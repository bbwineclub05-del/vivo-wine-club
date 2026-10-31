import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, PRIVACY_POLICY_VERSION } from '@/lib/consent';

const resend = new Resend(process.env.RESEND_API_KEY);

const TABLE = 'brand_leads';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROJECT_TYPES = ['single', 'campaign', 'ongoing', 'event', 'other'] as const;

const LIMITS = {
  company: 160,
  contactName: 120,
  email: 200,
  phone: 40,
  message: 3000,
} as const;

class InvalidInput extends Error {}

function field(
  body: Record<string, unknown>,
  key: string,
  max: number,
  { required = false, multiline = false } = {},
): string | null {
  const raw = body[key];
  if (raw === undefined || raw === null || raw === '') {
    if (required) throw new InvalidInput(key);
    return null;
  }
  if (typeof raw !== 'string') throw new InvalidInput(key);
  const value = raw.trim();
  if (!value) {
    if (required) throw new InvalidInput(key);
    return null;
  }
  if (value.length > max) throw new InvalidInput(key);
  if (!multiline && /[\r\n]/.test(value)) throw new InvalidInput(key);
  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function notificationHtml(rows: [string, string | null][]) {
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:8px 12px;background:#F4EDEB;font-weight:600;width:150px;text-transform:uppercase;font-size:12px;">${label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #E4D6D3;white-space:pre-wrap;">${escapeHtml(value as string)}</td>
    </tr>`,
    )
    .join('');

  return `
<div style="font-family:sans-serif;max-width:620px;margin:0 auto;color:#1A0505;">
  <h2 style="font-size:18px;">New brand enquiry</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">${body}</table>
</div>`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  // Honeypot: real people never see this field.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  let data;
  try {
    const email = field(input, 'email', LIMITS.email, { required: true })!.toLowerCase();
    if (!EMAIL_RE.test(email)) throw new InvalidInput('email');

    const projectType = field(input, 'project_type', 40, { required: true })!;
    if (!(PROJECT_TYPES as readonly string[]).includes(projectType)) {
      throw new InvalidInput('project_type');
    }

    if (input.consent_privacy !== true) throw new InvalidInput('consent');

    data = {
      company: field(input, 'company', LIMITS.company, { required: true })!,
      contact_name: field(input, 'contact_name', LIMITS.contactName, { required: true })!,
      email,
      phone: field(input, 'phone', LIMITS.phone),
      project_type: projectType,
      message: field(input, 'message', LIMITS.message, { required: true, multiline: true })!,
      locale: field(input, 'locale', 5),
    };
  } catch (err) {
    if (err instanceof InvalidInput) {
      return NextResponse.json({ error: 'invalid_input', field: err.message }, { status: 400 });
    }
    throw err;
  }

  const ip = getClientIp(request);

  // The row is the record; the email is the alert. If the table is not in
  // place yet the enquiry must still reach the inbox rather than be lost,
  // so a failed insert is logged and the request carries on.
  let stored = false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getSupabaseAdmin() as any;
    const { error } = await db.from(TABLE).insert({
      ...data,
      consent_privacy_accepted_at: new Date().toISOString(),
      consent_privacy_version: PRIVACY_POLICY_VERSION,
      consent_ip: ip,
    });
    if (error) console.error('[brand-leads] insert error:', error.message);
    else stored = true;
  } catch (err) {
    console.error('[brand-leads] insert threw:', err instanceof Error ? err.message : err);
  }

  const result = await Promise.allSettled([
    resend.emails.send({
      from: 'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: data.email,
      to: 'info@vivowineclub.com',
      subject: `New brand enquiry: ${data.company}`,
      html: notificationHtml([
        ['Company', data.company],
        ['Contact', data.contact_name],
        ['Email', data.email],
        ['Phone', data.phone],
        ['Project type', data.project_type],
        ['Message', data.message],
        ['Page language', data.locale],
        ['Saved to database', stored ? 'yes' : 'NO, table missing: this email is the only record'],
      ]),
    }),
  ]);

  // Only a lead that reached neither the table nor the inbox is a failure.
  const mailed = result[0].status === 'fulfilled';
  if (!stored && !mailed) {
    console.error('[brand-leads] lead lost: neither stored nor mailed');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
