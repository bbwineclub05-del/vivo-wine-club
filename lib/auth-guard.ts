import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase-admin';
import { isAdminEmail } from './admins';

interface AuthOk {
  ok: true;
  userId: string;
  email: string;
  isAdmin: boolean;
  isStaff: boolean;
  isCollaborator: boolean;
}

interface AuthFail {
  ok: false;
  response: NextResponse;
}

type AuthResult = AuthOk | AuthFail;

/** Validates the Bearer token and returns the authenticated user with role flags. */
export async function getAuthUser(request: Request): Promise<AuthResult> {
  const authHeader  = request.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '').trim();

  if (!accessToken) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (error || !user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const email          = user.email ?? '';
  const isAdmin        = isAdminEmail(email);
  const isStaff        = user.app_metadata?.role === 'staff';
  const isCollaborator = user.app_metadata?.role === 'collaborator';

  return { ok: true, userId: user.id, email, isAdmin, isStaff, isCollaborator };
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
export async function requireAdminOrStaff(request: Request): Promise<AuthOk | AuthFail> {
  const result = await getAuthUser(request);
  if (!result.ok) return result;
  if (!result.isAdmin && !result.isStaff) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return result;
}
