#!/bin/sh
set -e

echo "[api] running database migrations..."
cd /app/packages/prisma
npx prisma migrate deploy

echo "[api] seeding mock data (skipped if demo shop already exists)..."
if [ "$(node -e "
  const { PrismaClient } = require('@orderwise/prisma');
  const p = new PrismaClient();
  p.shop.count({ where: { slug: 'demo-shop' } })
    .then(n => console.log(n))
    .catch(() => console.log(0));
")" = "0" ]; then
  npx tsx prisma/seed.ts
else
  echo "[api] demo shop exists, skipping seed."
fi

echo "[api] starting NestJS..."
cd /app/apps/api
exec node dist/main.js
