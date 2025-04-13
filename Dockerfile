# Base stage for both development and test
FROM node:18-alpine AS base
WORKDIR /app

# Install curl for health checks
RUN apk --no-cache add curl

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Development stage
FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Test stage for e2e tests
FROM base AS testing
ENV NODE_ENV=test
EXPOSE 3001
CMD ["npm", "run", "test-in-container:e2e"]

# Production stage
FROM base AS production
ENV NODE_ENV=production
CMD ["npm", "start"] 