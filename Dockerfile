# --- Stage 1: Dependencies ---
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

# --- Stage 2: Build ---
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

# better-sqlite3 needs build tools for native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN pnpm prisma:generate

# Build Next.js (standalone output)
RUN pnpm build

# --- Stage 3: Production ---
FROM node:22-slim AS runner

# better-sqlite3 native module needs libstdc++ at runtime
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema and migrations for runtime migration
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy the generated Prisma client (needed by the standalone server)
COPY --from=builder /app/app/generated ./app/generated

# Copy node_modules needed for Prisma CLI migrations at runtime
# (standalone doesn't include devDependencies like prisma CLI)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Copy entrypoint script
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
