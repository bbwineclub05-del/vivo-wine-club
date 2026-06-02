export const ADMIN_EMAILS = [
  'cristianomichelotti@gmail.com',
  'filippo.lombardi890@gmail.com',
  'giacomogallo1310@gmail.com',
  'riccardo.consalvo@icloud.com',
];

export const SUPER_ADMIN_EMAIL = 'giacomogallo1310@gmail.com';

export const FOUNDERS: { name: string; email: string }[] = [
  { name: 'Giacomo Gallo',        email: 'giacomogallo1310@gmail.com'    },
  { name: 'Cristiano Michelotti', email: 'cristianomichelotti@gmail.com'  },
  { name: 'Filippo Lombardi',     email: 'filippo.lombardi890@gmail.com'  },
  { name: 'Riccardo Consalvo',    email: 'riccardo.consalvo@icloud.com'   },
];

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email);
}

export function isSuperAdmin(email: string): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

// Finance section — explicit whitelist, independent of role
// TODO: add Marcello Abbadati's real email once confirmed (check team_members table in Supabase)
export const FINANCE_EMAILS = [
  'giacomogallo1310@gmail.com',
  'filippo.lombardi890@gmail.com',
  'cristianomichelotti@gmail.com',
  'riccardo.consalvo@icloud.com',
  // 'marcello@example.com', // TODO: replace with Marcello Abbadati's real email
] as const;

export function isFinanceUser(email: string): boolean {
  return (FINANCE_EMAILS as readonly string[]).includes(email);
}
