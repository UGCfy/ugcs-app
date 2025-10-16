FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Install openssl for Prisma
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy application code
COPY . .

# Generate Prisma client and build
RUN pnpm prisma generate
RUN pnpm build

# Start command
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]
