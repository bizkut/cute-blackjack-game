# Stage 1: Build React Frontend (Vite)
FROM node:18-alpine AS frontend-builder

WORKDIR /usr/src/app

# Copy package.json, yarn.lock (or package-lock.json)
# Also copy build configuration files early if they affect dependency installation
COPY package.json yarn.lock ./
# If you have a .npmrc or other specific config files for install, copy them too.
# COPY vite.config.ts tsconfig.json tsconfig.node.json ./

# Install frontend dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the frontend application code
# This includes src/, public/ (Vite's public asset folder), index.html, vite.config.ts etc.
COPY . .

# Set the public URL (Vite uses PUBLIC_URL or base in vite.config.js)
# For this setup, assets are served from the root of the backend's '/public' dir.
ENV PUBLIC_URL=/
# Vite typically builds to a 'dist' directory
RUN yarn build

# Stage 2: Setup Node.js Backend
FROM node:18-alpine AS backend-server

WORKDIR /usr/src/app

# Copy backend package.json and yarn.lock (or package-lock.json)
COPY backend/package.json backend/yarn.lock* ./backend/
# If backend uses npm and has package-lock.json, adjust accordingly
# COPY backend/package*.json ./backend/

# Install backend dependencies
# Assuming backend also uses yarn. If it uses npm, change to 'npm install --only=production'
# and ensure backend/package-lock.json is copied.
WORKDIR /usr/src/app/backend
RUN yarn install --production --frozen-lockfile
# Switch back to app root for copying built frontend
WORKDIR /usr/src/app

# Copy the built frontend assets from the frontend-builder stage
# Vite builds to 'dist', so we copy from /usr/src/app/dist
COPY --from=frontend-builder /usr/src/app/dist ./public

# Copy the backend application code (excluding its node_modules)
COPY backend/ ./backend/

# Application listens on port 3001
EXPOSE 3001

# Command to run the application from the backend directory
CMD [ "node", "./backend/server.js" ]
