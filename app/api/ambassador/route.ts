import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getClientIp, PRIVACY_POLICY_VERSION } from '@/lib/consent';
import {
  AMBASSADOR_AREA_OTHER,
  AMBASSADOR_EVENT_TYPES,
  AMBASSADOR_LIMITS as L,
  AMBASSADOR_RATE_LIMIT,
  ambassadorAreaLabel,
  isAmbassadorArea,
  normalizeAmbassadorLocale,
  type AmbassadorEventType,
} from '@/lib/ambassador';
import { ambassadorConfirmationEmail, ambassadorStaffEmailHtml } from '@/lib/ambassador-email';

const resend = new Resend(process.env.RESEND_API_KEY);

const TABLE = 'ambassador_applications';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class InvalidInput extends Error {}

/**
 * Reads an optional/required string field: trimmed, length-capped, and —
 * for single-line fields — rejected if it contains line breaks.
 */
function field(
  body: Record<string, unknown>,
  key: string,
  max: number,
  { required = false, multiline = false } = {},
): string | null {
  const raw = body[key];
  if (raw === undefined || raw === null) {
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

/** https:// only, host linkedin.com or any subdomain of it. */
function linkedinUrl(value: string | null): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidInput('linkedin_url');
  }
  const host = url.hostname.toLowerCase();
  const isLinkedin = host === 'linkedin.com' || host.endsWith('.linkedin.com');
  if (url.protocol !== 'https:' || !isLinkedin || url.username || url.password) {
    throw new InvalidInput('linkedin_url');
  }
  return url.href;
}

function parse(body: Record<string, unknown>) {
  const first_name = field(body, 'first_name', L.name, { required: true })!;
  const last_name  = field(body, 'last_name',  L.name, { required: true })!;

  const email = field(body, 'email', L.email, { required: true })!.toLowerCase();
  if (!EMAIL_RE.test(email)) throw new InvalidInput('email');

  const area = field(body, 'area', 40, { required: true })!;
  if (!isAmbassadorArea(area)) throw new InvalidInput('area');
  const area_other = area === AMBASSADOR_AREA_OTHER
    ? field(body, 'area_other', L.areaOther, { required: true })
    : null;

  if (!Array.isArray(body.event_types)) throw new InvalidInput('event_types');
  const event_types = [...new Set(body.event_types)] as AmbassadorEventType[];
  if (
    event_types.length === 0 ||
    !event_types.every((v) => (AMBASSADOR_EVENT_TYPES as readonly unknown[]).includes(v))
  ) {
    throw new InvalidInput('event_types');
  }

  if (body.consent_privacy !== true || body.consent_age !== true) {
    throw new InvalidInput('consent');
  }

  return {
    first_name,
    last_name,
    email,
    phone:          field(body, 'phone', L.phone),
    area,
    area_other,
    event_types,
    experience:     field(body, 'experience',     L.longText,   { required: true, multiline: true })!,
    local_contacts: field(body, 'local_contacts', L.mediumText, { multiline: true }),
    community:      field(body, 'community',      L.mediumText, { multiline: true }),
    linkedin_url:   linkedinUrl(field(body, 'linkedin_url', L.linkedin)),
    social_links:   field(body, 'social_links',   L.social,     { multiline: true }),
    motivation:     field(body, 'motivation',     L.longText,   { required: true, multiline: true })!,
    availability:   field(body, 'availability',   L.availability, { required: true, multiline: true })!,
    languages:      field(body, 'languages',      L.languages,  { required: true })!,
    locale:         normalizeAmbassadorLocale(body.locale),
  };
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

  // Honeypot: real users never see this field. Pretend success, store nothing.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  let data: ReturnType<typeof parse>;
  try {
    data = parse(input);
  } catch (err) {
    if (err instanceof InvalidInput) {
      return NextResponse.json({ error: 'invalid_input', field: err.message }, { status: 400 });
    }
    throw err;
  }

  const ip = getClientIp(request);
  const db = getSupabaseAdmin() as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Rate limit, counted on the applications table itself (works across
  // serverless instances without extra infrastructure).
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [byIp, byEmail] = await Promise.all([
    ip
      ? db.from(TABLE).select('id', { count: 'exact', head: true }).eq('consent_ip', ip).gte('created_at', hourAgo)
      : Promise.resolve({ count: 0, error: null }),
    db.from(TABLE).select('id', { count: 'exact', head: true }).eq('email', data.email).gte('created_at', dayAgo),
  ]);
  // HEAD count queries can fail with error === null and count === null
  // (e.g. missing table) — treat a null count as a failure so the limit
  // fails closed instead of silently counting as zero.
  if (byIp.error || byEmail.error || byIp.count === null || byEmail.count === null) {
    console.error('[ambassador] rate-limit query error:', (byIp.error ?? byEmail.error)?.message ?? 'null count');
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
  if (byIp.count >= AMBASSADOR_RATE_LIMIT.perIpPerHour || byEmail.count >= AMBASSADOR_RATE_LIMIT.perEmailPerDay) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const { error: dbError } = await db.from(TABLE).insert({
    ...data,
    status:                      'new',
    consent_privacy_accepted_at: new Date().toISOString(),
    consent_privacy_version:     PRIVACY_POLICY_VERSION,
    consent_age_confirmed:       true,
    consent_ip:                  ip,
  });
  if (dbError) {
    console.error('[ambassador] insert error:', dbError.message);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }

  const confirmation = ambassadorConfirmationEmail(data.locale);
  // Subject uses only the config value ("other" for a free-text area), never user input.
  const subjectArea = data.area.replace(/[\r\n]+/g, ' ');

  await Promise.allSettled([
    resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: 'info@vivowineclub.com',
      to:      data.email,
      subject: confirmation.subject,
      html:    confirmation.html,
    }),
    resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: data.email,
      to:      'info@vivowineclub.com',
      subject: `New ambassador application — ${subjectArea}`,
      html: ambassadorStaffEmailHtml([
        ['Name',           `${data.first_name} ${data.last_name}`],
        ['Email',          data.email],
        ['Phone',          data.phone],
        ['Area',           data.area === AMBASSADOR_AREA_OTHER ? `Other: ${data.area_other}` : ambassadorAreaLabel(data.area, 'en')],
        ['Event types',    data.event_types.join(', ')],
        ['Experience',     data.experience],
        ['Local contacts', data.local_contacts],
        ['Community',      data.community],
        ['LinkedIn',       data.linkedin_url],
        ['Other socials',  data.social_links],
        ['Why apply',      data.motivation],
        ['Availability',   data.availability],
        ['Languages',      data.languages],
        ['Page language',  data.locale],
      ]),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
