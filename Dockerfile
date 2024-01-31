### STAGE 1: Build ###

# We label our stage as 'builder'
FROM node:21-alpine as builder

RUN npm install -g pnpm

WORKDIR /home/nest-app

RUN chown -R node:node /home/nest-app

USER node

COPY --chown=node:node . .

## Storing node modules on a separate layer will prevent unnecessary npm installs at each build
RUN pnpm i --frozen-lockfile

RUN pnpm uninstall fastify

RUN pnpm install fastify

RUN pnpm run build

### STAGE 2: Setup ###

FROM node:21-alpine

RUN npm install -g pnpm

ENV NODE_ENV production

USER node

WORKDIR /home/nest-app

COPY --from=builder --chown=node:node /home/nest-app/package*.json ./
COPY --from=builder --chown=node:node /home/nest-app/pnpm-lock.yaml ./
COPY --from=builder --chown=node:node /home/nest-app/dist ./dist/

RUN pnpm install --frozen-lockfile --prod

# Expose the port the app runs in
EXPOSE 3000

CMD ["node", "dist/main.js"]