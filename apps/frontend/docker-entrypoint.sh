#!/bin/sh
set -e

# Generate runtime env config for the browser
# This overwrites the placeholder public/env-config.js with actual values
cat <<EOF > /app/public/env-config.js
window.__RUNTIME_CONFIG__ = {
  NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL:-}",
  NEXT_PUBLIC_SUPABASE_URL: "${NEXT_PUBLIC_SUPABASE_URL:-}",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
};
EOF

echo "[entrypoint] Runtime env-config.js generated"

exec node server.js
