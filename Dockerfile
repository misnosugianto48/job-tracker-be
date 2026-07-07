# Build Stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts
COPY entrypoint.sh ./entrypoint.sh

RUN npm install

# Dummy URL hanya untuk prisma generate saat build
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
COPY . .
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts
COPY --from=builder /usr/src/app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Hapus --omit=dev agar dotenv tersedia, atau hapus import dotenv dari prisma.config.ts
RUN npm install

# Dummy URL juga diperlukan di runner untuk prisma generate
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/server.js"]
