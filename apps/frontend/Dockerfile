# Frontend Dockerfile for Vite + React
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (for better caching)
COPY package.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Development stage (for docker-compose)
FROM base AS development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build
RUN npm run build

# Production stage - serve with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80
CMD ["/docker-entrypoint.sh"]
