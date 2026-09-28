FROM node:20-trixie-slim
WORKDIR /app

# Backend package files
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN npm ci

# Copy backend source code
WORKDIR /app
COPY backend ./backend

# Copy master data files
COPY data ./data

# Backend working directory
WORKDIR /app/backend

EXPOSE 5000

CMD ["npm", "start"]