# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set strict-dep-builds false && pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# для сборки нужны только публичные переменные; БД при сборке не используется
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_COMPANY_SHORT
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_COMPANY_SHORT=$NEXT_PUBLIC_COMPANY_SHORT
ENV PAYLOAD_SECRET=build-only DATABASE_URI=postgres://build:build@127.0.0.1:5432/build
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
RUN mkdir -p /app/media && chown -R node:node /app/media
USER node
EXPOSE 3000
CMD ["node", "server.js"]
