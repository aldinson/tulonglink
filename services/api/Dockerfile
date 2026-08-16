# Lightweight enough to run on a Raspberry Pi (spec §6).
#
# Runs via `tsx` rather than a `tsc` build step. npm workspaces has no
# built-in topological build ordering (that's what Turborepo/Nx solve,
# and Milestone 1 deliberately skips them — see root README's decision
# log), so a plain `tsc` build of services/api would need
# packages/shared|protocol|sync built first with no tool enforcing that
# order. tsx transpiles TS on demand at import time instead, for both
# `dev` and this container — sidestepping the ordering problem entirely.
# Revisit if/when a real bundler-based build is added.
FROM node:20-alpine
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/protocol/package.json packages/protocol/package.json
COPY packages/sync/package.json packages/sync/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci --omit=dev

COPY tsconfig.base.json ./
COPY packages/shared/src packages/shared/src
COPY packages/protocol/src packages/protocol/src
COPY packages/sync/src packages/sync/src
COPY services/api/src services/api/src
COPY services/api/tsconfig.json services/api/tsconfig.json

WORKDIR /repo/services/api
EXPOSE 4000
CMD ["npx", "tsx", "src/server.ts"]
