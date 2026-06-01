# --- STAGE 1: Build React static assets ---
FROM node:18-alpine as build-stage

WORKDIR /app

# Copy lock files and install dependencies via ci (clean install)
COPY package*.json ./
RUN npm ci

# Copy code and build production bundle
COPY . .
RUN npm run build

# --- STAGE 2: Lightweight Nginx Serve ---
FROM nginx:stable-alpine

# Copy compiled assets from Stage 1
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Replace default Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
