/**
 * Import contacts from Excel files into Supabase.
 * Run: node scripts/import-contacts.mjs
 *
 * Requires:
 *   - xlsx package (npm install xlsx)
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map((s, i) => i === 0 ? s.trim() : s.trim()))
);

const supabaseUrl  = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey   = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

/* ── General Contacts ── */
async function importWine() {
  const wb = XLSX.readFile(join(__dirname, '..', 'data', 'VIVO_General_Contacts.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const records = rows.map(r => ({
    applied: r['Applied:'] ? XLSX.SSF.format('yyyy-mm-dd', r['Applied:']) : null,
    people:  String(r['People']   || '').trim(),
    company: String(r['Company']  || '').trim(),
    source:  String(r['Source:']  || '').trim(),
    place:   String(r['Place:']   || '').trim(),
    role:    String(r['Role:']    || '').trim(),
    notes:   String(r['Notes:']   || '').trim(),
  })).filter(r => r.company || r.people);

  console.log(`Importing ${records.length} wine contacts…`);

  const { error } = await supabase.from('contacts_wine').insert(records);
  if (error) {
    console.error('contacts_wine import error:', error.message);
    process.exit(1);
  }
  console.log('✓ contacts_wine imported successfully');
}

/* ── Bordeaux Contacts ── */
async function importBordeaux() {
  const wb = XLSX.readFile(join(__dirname, '..', 'data', 'VIVO_Contacts_Bordeaux.xlsx'));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // First row is headers row, skip it
  const records = rows.slice(1).map(r => ({
    company:        String(r['__EMPTY_1'] || '').trim(),
    name:           String(r['__EMPTY_2'] || '').trim(),
    email:          String(r['__EMPTY_3'] || '').trim(),
    phone:          String(r['__EMPTY_4'] || '').trim(),
    last_follow_up: String(r['__EMPTY_5'] || '').trim() || null,
    note:           String(r['__EMPTY_6'] || '').trim(),
  })).filter(r => r.company);

  console.log(`Importing ${records.length} Bordeaux contacts…`);

  const { error } = await supabase.from('contacts_bordeaux').insert(records);
  if (error) {
    console.error('contacts_bordeaux import error:', error.message);
    process.exit(1);
  }
  console.log('✓ contacts_bordeaux imported successfully');
}

await importWine();
await importBordeaux();
console.log('\nAll done!');
