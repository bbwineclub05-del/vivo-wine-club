// Version tags for the currently-live legal documents. Bump these (and add a
// new placeholder page) whenever the Privacy Policy / Terms of Service text
// changes materially, so existing consent records keep pointing at the
// version the user actually accepted.
export const PRIVACY_POLICY_VERSION = 'privacy-v1';
export const TERMS_OF_SERVICE_VERSION = 'terms-v1';

export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}
