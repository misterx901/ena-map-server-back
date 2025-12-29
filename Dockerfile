# --- STAGE 1: Build & Setup stage ---
# Use the specific base image you require (Node 16 with Bullseye)
FROM node:16-bullseye AS build
WORKDIR /app

# Install necessary system dependencies (Python/Pip/other libs)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 python3-pip \
        # Add any other required build dependencies here
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir numpy pillow lxml fastapi

# Create necessary directories
RUN mkdir -p /app/assets/xml /app/assets/maps /app/assets/thumbs /app/uploads


# Install Node dependencies
COPY package*.json ./
COPY prisma ./prisma
# 'npm ci --omit=dev' is excellent for production
RUN npm ci --omit=dev || npm install --force

# Generate Prisma client
RUN npm run prisma:gen

# Build the application (e.g., TypeScript compilation)
COPY . .
RUN npm run build

# --- STAGE 2: Production Run stage ---
# Use a smaller/more secure runtime if possible (e.g., Node 16 slim/alpine, but careful with native modules)
# Stick to the same base for maximum compatibility since we installed system libs
FROM node:16-bullseye
WORKDIR /ena-map-server-back

# Install *only* runtime dependencies if necessary (e.g., python/pip/libs needed at runtime)
# Re-install system packages necessary for runtime:
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 python3-pip \
        # Add any other required runtime dependencies here
    && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir numpy pillow lxml fastapi

# Copy only the necessary files from the build stage
# Note: /app is the build directory, /ena-map-server-back is the final working directory
COPY --from=build /app /ena-map-server-back

EXPOSE 8888

# Set environment variables (optional, better in docker-compose)
# ENV NODE_ENV production

# The final production start command
CMD ["npm", "start"]