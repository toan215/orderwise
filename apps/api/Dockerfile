# --- Build stage: install all workspace deps, generate Prisma client, compile the API ---
# Context must be the repo root (monorepo):  docker build -f apps/api/Dockerfile .
FROM node:20-slim AS build
WORKDIR /app

# pnpm via corepack (version pinned in package.json -> packageManager)
RUN corepack enable

# 1) Install deps first (layer-cached). Need every workspace manifest for resolution.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/prisma/package.json packages/prisma/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

# 2) Whole source (dockerignore excludes node_modules/.next/dist)
COPY . .

# build stage needs openssl so `prisma generate` detects openssl-3.0.x and downloads the
# matching native query engine (without it, prisma defaults to openssl-1.1.x whose .so.node
# cannot dlopen on Debian bookworm — only libssl3 is present, libssl.so.1.1 is not).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 3) Generate the Prisma client, build @orderwise/shared (its dist/ provides types + runtime),
#    then compile NestJS to dist/
#
# Prisma's generated client locates its native query engine at <pkgroot>/.prisma/client/.
# pnpm (with @prisma/engines postinstall disabled in pnpm-workspace.yaml) leaves the engine
# only inside @prisma/engines, so copy the .so.node there or the runtime client throws
# "could not find query engine" (migrate CLI works because it reads @prisma/engines directly).
RUN pnpm --filter @orderwise/prisma db:generate \
 && mkdir -p packages/prisma/.prisma/client \
 && cp node_modules/.pnpm/@prisma+engines@*/node_modules/@prisma/engines/libquery_engine-*.so.node packages/prisma/.prisma/client/
RUN pnpm --filter @orderwise/shared build
RUN pnpm --filter @orderwise/api build

# --- Runtime stage: minimal slice with compiled output + node_modules + prisma (for migrate/seed) ---
FROM node:20-slim AS runtime
ENV NODE_ENV=production \
    PORT=4010
WORKDIR /app

# Prisma's migration/query engines need libssl — node:20-slim doesn't ship it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Full node_modules keeps pnpm workspace symlinks (@orderwise/prisma, @orderwise/shared) + prisma engines + CLI.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api /app/apps/api
COPY apps/api/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4010
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
