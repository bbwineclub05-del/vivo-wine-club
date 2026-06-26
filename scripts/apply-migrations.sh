#!/bin/bash
# Usage: ./scripts/apply-migrations.sh YOUR_DB_PASSWORD
# Applies all pending Supabase migrations directly via psql.
# DB password can be found in Supabase dashboard → Settings → Database

DB_PASSWORD="${1:-}"
PROJECT_REF="vjgwzhinjfvlspdcpukl"
DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

if [ -z "$DB_PASSWORD" ]; then
  echo "Usage: ./scripts/apply-migrations.sh YOUR_DB_PASSWORD"
  echo ""
  echo "Find your DB password at:"
  echo "https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database"
  exit 1
fi

PSQL_BIN=""
for p in /usr/local/opt/postgresql@16/bin/psql /opt/homebrew/opt/postgresql@16/bin/psql /usr/bin/psql psql; do
  if command -v "$p" &>/dev/null || [ -x "$p" ]; then
    PSQL_BIN="$p"
    break
  fi
done

if [ -z "$PSQL_BIN" ]; then
  echo "psql not found. Install with: brew install postgresql@16"
  exit 1
fi

echo "Using psql: $PSQL_BIN"
echo ""

MIGRATIONS=(
  "supabase/migrations/20260624_referral.sql"
  "supabase/migrations/20260624_crm_influencers.sql"
  "supabase/migrations/20260625_event_partners.sql"
)

for f in "${MIGRATIONS[@]}"; do
  echo "▶ Applying $f ..."
  "$PSQL_BIN" "$DB_URL" -f "$f" -v ON_ERROR_STOP=1
  if [ $? -eq 0 ]; then
    echo "✓ $f applied"
  else
    echo "✗ $f FAILED — stopping"
    exit 1
  fi
  echo ""
done

echo "✓ All migrations applied successfully"
echo ""
echo "Verifying tables..."
"$PSQL_BIN" "$DB_URL" -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('referral_codes','referral_uses','contacts_influencers','event_partners')
ORDER BY table_name;
"
echo ""
echo "Verifying event_guests columns..."
"$PSQL_BIN" "$DB_URL" -c "
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'event_guests'
  AND column_name = 'partner_code';
"
