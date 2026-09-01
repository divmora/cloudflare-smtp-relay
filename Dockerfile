FROM node:26-alpine

WORKDIR /app

# Enable Corepack for pnpm management
RUN corepack enable

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy application source code
COPY . .

# Expose the SMTP port
EXPOSE 587

# Start the application
CMD ["node", "index.js"]

