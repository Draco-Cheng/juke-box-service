# Frontend Dockerfile for Next.js
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json ./
# Lockfile is copied from monorepo root by CI before docker build
COPY package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Development stage (for docker-compose)
FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm run build

# Production stage - Next.js standalone server
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
