# Frontend Dockerfile for Vite + React
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Development stage (for docker-compose)
FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
ARG VITE_API_URL=/api
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
