#!/bin/sh
set -e

echo "[web] starting Next.js..."
cd /app/apps/web
exec npx next start -p 3000
