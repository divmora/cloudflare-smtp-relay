FROM node:26-alpine

WORKDIR /app

# Install and enable Corepack for pnpm management
RUN npm install -g corepack && corepack enable

# Copy package files and install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy only the application code
COPY index.js ./
COPY src ./src

# Run as the unprivileged user shipped with the Node image
USER node

# SMTP and healthcheck ports
EXPOSE 587 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "index.js"]
