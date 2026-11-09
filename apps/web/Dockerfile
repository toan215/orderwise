# --- Build stage: install workspace deps, generate Prisma client, build Next.js production ---
# Context must be the repo root (monorepo):  docker build -f apps/web/Dockerfile .
FROM node:20-slim AS build
WORKDIR /app

RUN corepack enable

# 1) Deps first (cached). All workspace manifests needed for resolution.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/prisma/package.json packages/prisma/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# 2) Whole source; generate Prisma client, build @orderwise/shared (web typechecks + bundles its
#    dist/), then build Next.
COPY . .
RUN pnpm --filter @orderwise/prisma db:generate
RUN pnpm --filter @orderwise/shared build
RUN pnpm --filter @orderwise/web build

# --- Runtime stage: .next output + node_modules (workspace symlinks: @orderwise/shared) ---
FROM node:20-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/web /app/apps/web
COPY apps/web/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
