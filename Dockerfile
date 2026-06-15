# Build stage
FROM node:lts-alpine AS builder

USER node
WORKDIR /home/node

COPY --chown=node:node package*.json .
RUN npm ci --no-audit

COPY --chown=node:node . .
RUN npm run build && npm prune --omit=dev


# Production stage
FROM node:lts-alpine

ENV NODE_ENV=production
USER node
WORKDIR /home/node

COPY --from=builder --chown=node:node /home/node/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/dist ./dist

ARG PORT
EXPOSE ${PORT:-3000}

CMD ["node", "dist/main.js"]
