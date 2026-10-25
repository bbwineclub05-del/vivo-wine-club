import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase-admin';
import { isAdminEmail } from './admins';
import { resolveAccess, type PermissionKey, type TeamRow } from './access';

interface AuthOk {
  ok: true;
  userId: string;
  email: string;
  isAdmin: boolean;
  isStaff: boolean;
  isCollaborator: boolean;
  /** False quando la riga in Team Management è spenta. */
  active: boolean;
  /** Se questa persona può usare una funzionalità, secondo Team Management. */
  can: (key: PermissionKey) => boolean;
}

interface AuthFail {
  ok: false;
  response: NextResponse;
}

type AuthResult = AuthOk | AuthFail;

/**
 * Il token della richiesta.
 *
 * Di norma arriva nell'intestazione `Authorization`. I pulsanti che
 * scaricano un file lo mandano invece dentro un modulo, perche' un
 * modulo e' una navigazione vera e il nome del file lo decide il
 * server con `Content-Disposition`: un `fetch` quel nome lo butta
 * via, e alcuni browser salvano l'id del blob al posto suo.
 */
export function tokenDellaRichiesta(request: Request, fromForm?: string | null): string {
  const authHeader = request.headers.get('Authorization');
  const header = authHeader?.replace('Bearer ', '').trim();
  return header || (fromForm ?? '').trim();
}

/** Validates the Bearer token and returns the authenticated user with role flags. */
export async function getAuthUser(request: Request, tokenEsplicito?: string): Promise<AuthResult> {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = tokenEsplicito?.trim() || authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const email          = user.email ?? '';
  const isAdmin        = isAdminEmail(email);
  let isStaff          = user.app_metadata?.role === 'staff' || user.app_metadata?.role === 'admin';
  const isCollaborator = user.app_metadata?.role === 'collaborator';

  // Team Management è la fonte: `app_metadata` viene timbrato solo
  // all'invito o quando il ruolo cambia, quindi da solo non sa se una
  // persona è stata spenta o le è stata tolta una sezione.
  let teamRow: TeamRow | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabaseAdmin() as any)
      .from('team_members')
      .select('role, active, permissions')
      .eq('email', email)
      .maybeSingle();
    teamRow = (data as TeamRow | null) ?? null;
  } catch (err) {
    // Una lettura fallita non deve chiudere l'area a tutti: si resta
    // sulle regole di prima.
    console.error('[auth-guard] team_members:', err instanceof Error ? err.message : err);
  }

  if (!isAdmin && !isStaff && teamRow?.active && (teamRow.role === 'staff' || teamRow.role === 'admin')) {
    isStaff = true;
  }

  const access = resolveAccess(email, teamRow);

  return {
    ok: true,
    userId: user.id,
    email,
    isAdmin,
    isStaff,
    isCollaborator,
    active: access.active,
    can: (key: PermissionKey) => access.can(key),
  };
}

/** Requires admin role (email in ADMIN_EMAILS). Returns 401/403 or the user. */
export async function requireAdmin(request: Request): Promise<AuthOk | AuthFail> {
  const result = await getAuthUser(request);
  if (!result.ok) return result;
  if (!result.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

/** Requires admin OR staff role. Returns 401/403 or the user. */
export async function requireAdminOrStaff(
  request: Request,
  tokenEsplicito?: string,
): Promise<AuthOk | AuthFail> {
  const result = await getAuthUser(request, tokenEsplicito);
  if (!result.ok) return result;
  // Spento in Team Management vuol dire spento anche qui: prima le API
  // rispondevano lo stesso a chi era stato disattivato.
  if (!result.active || (!result.isAdmin && !result.isStaff)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

/**
 * Richiede una funzionalità precisa, come l'ha decisa Team Management.
 *
 * Serve dove la sezione non è una pagina dell'area riservata — lo
 * scanner, per esempio — e in generale dove spegnere un interruttore
 * deve chiudere anche la porta di servizio, non solo nascondere la
 * voce dal menù.
 */
export async function requirePermission(
  request: Request,
  key: PermissionKey,
): Promise<AuthOk | AuthFail> {
  const result = await requireAdminOrStaff(request);
  if (!result.ok) return result;
  if (!result.can(key)) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}

/**
 * Requires admin, staff, OR a collaborator assigned to the given event slug.
 * Used for read-only partner data: collaborators can view, but not mutate.
 */
export async function requireAdminStaffOrAssignedCollaborator(
  request: Request,
  eventSlug: string,
): Promise<AuthOk | AuthFail> {
  const result = await getAuthUser(request);
  if (!result.ok) return result;
  if (result.isAdmin || result.isStaff) return result;
  if (result.isCollaborator) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (getSupabaseAdmin() as any)
      .from('collaborator_events')
      .select('id')
      .eq('user_id', result.userId)
      .eq('event_slug', eventSlug)
      .maybeSingle();
    if (data) return result;
  }
  return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}
