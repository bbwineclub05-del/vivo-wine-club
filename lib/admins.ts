export const ADMIN_EMAILS = [
  'cristianomichelotti@gmail.com',
  'filippo.lombardi513@gmail.com',
  'giacomogallo1310@gmail.com',
  'riccardo.consalvo@icloud.com',
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}
