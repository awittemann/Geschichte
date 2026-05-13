# syntax=docker/dockerfile:1.7
# Multi-Stage-Build für die Lernkarten-Web-App.
# Erzeugt ein schlankes Production-Image (~200 MB) auf Basis des Next.js
# Standalone-Outputs. Keine externen Dependencies zur Laufzeit, kein Persistent
# Volume nötig — der Lernfortschritt liegt im localStorage des Browsers.
#
# Build-Context-Annahme: REPO-ROOT (nicht lernkarten-app/), damit die Sliplane-
# Default-Konfiguration (Dockerfile-Pfad = lernkarten-app/Dockerfile,
# Context = Repo-Root) ohne Anpassung funktioniert.
#
# Lokal aus dem Repo-Root bauen:
#   docker build -f lernkarten-app/Dockerfile -t lernkarten-app .

ARG NODE_VERSION=22-alpine

# ---- Stage 1: Dependencies ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY lernkarten-app/package.json lernkarten-app/package-lock.json ./
RUN npm ci --ignore-scripts

# ---- Stage 2: Builder ----
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY lernkarten-app/ ./
RUN npm run build

# ---- Stage 3: Runner ----
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Nicht-Root-User für die Laufzeit.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone-Output enthält den minimalen server.js + benötigte node_modules.
# public/ und .next/static/ müssen separat hinüberkopiert werden.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
