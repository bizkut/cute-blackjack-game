# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /usr/src/frontend

# Copy frontend package.json and package-lock.json (or yarn.lock)
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend application code
COPY frontend/ ./

# Set the public URL for React Router (if needed, otherwise assets might be served from root)
# Ensure your REACT_APP_API_URL is set appropriately for your backend if it's not proxied by this server itself
# For this setup, API calls will be to the same origin but /api path.
ENV PUBLIC_URL=/
RUN npm run build

# Stage 2: Setup Node.js Backend
FROM node:18-alpine AS backend-server

WORKDIR /usr/src/app

# Copy backend package.json and package-lock.json (or yarn.lock)
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install --only=production # Install only production dependencies for smaller image

# Copy the built frontend assets from the frontend-builder stage
COPY --from=frontend-builder /usr/src/frontend/build ./public

# Copy the rest of the backend application code
COPY backend/ ./

# Application listens on port 3001 (or any other port you prefer)
EXPOSE 3001

# Command to run the application
CMD [ "node", "server.js" ]
