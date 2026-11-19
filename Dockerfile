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

# The image runs as root by default so existing deployments keep binding port 587 on any
# runtime. To run as the unprivileged "node" user (uid 1000), set the user in your deployment
# (docker-compose.yml and k8s/deployment.yaml do) and make sure the runtime allows it to bind
# port 587, or set smtp_port to 1024 or higher. See README "Running as non-root".
# SMTP and healthcheck ports
EXPOSE 587 8080

CMD ["node", "index.js"]
