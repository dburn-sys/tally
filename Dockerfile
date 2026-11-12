# Tally API and migration job (architecture Section E).
#
# E-1 wants the base image pinned by digest, so a rebuild can't silently pick up
# a different image. Run scripts/pin-images.sh once (it needs Docker and registry
# access) to replace the tag below with tag@sha256:<digest>, and again whenever
# you deliberately move to a newer Node image. CI fails until it's pinned.
FROM node:22.23.4-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY scripts ./scripts
RUN npx tsc -p tsconfig.build.json && npm prune --omit=dev

FROM node:22.23.4-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY migrations ./dist/migrations
COPY package.json ./
# The image's built-in unprivileged user (E-1).
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://localhost:3000/healthz').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/src/server.js"]
