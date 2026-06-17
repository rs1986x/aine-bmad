# syntax=docker/dockerfile:1

# --- build stage: compile TypeScript to dist/ ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

# --- runtime stage: production-only deps, non-root, run compiled dist/ ---
FROM node:24-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
