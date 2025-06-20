# .env.example - Copy this to .env and fill in your API keys
# =============================================================

# Server Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:3000

# API Keys
ANTHROPIC_API_KEY=your_claude_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# JWT Secret for authentication
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Database Configuration (for future use)
DATABASE_URL=mongodb://localhost:27017/aura_soulmate
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Ready Player Me (for avatar integration)
RPM_SUBDOMAIN=your_subdomain
RPM_APP_ID=your_app_id

# =============================================================
# Dockerfile
# =============================================================
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3001

CMD ["npm", "start"]

# =============================================================
# docker-compose.yml
# =============================================================
version: '3.8'

services:
  aura-backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - .env
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  aura-frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
    depends_on:
      - aura-backend
    restart: unless-stopped

  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=aura_soulmate
    volumes:
      - mongodb_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - aura-frontend
      - aura-backend
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:

# =============================================================
# Client Dockerfile (client/Dockerfile)
# =============================================================
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]