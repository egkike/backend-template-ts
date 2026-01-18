# Etapa 1: Construcción (builder)
FROM node:22 AS builder

# Actualiza npm a la versión más reciente (elimina el aviso)
RUN npm install -g npm@latest

WORKDIR /app

# Fuerza DNS estable (por si acaso)
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf && \
    echo "nameserver 8.8.4.4" >> /etc/resolv.conf

RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./
#COPY .env ./

RUN pnpm install --frozen-lockfile

COPY src/ ./src/

# Usa el tsconfig específico para build (genera dist/)
RUN pnpm tsc --build tsconfig.build.json

# Etapa 2: Imagen final
FROM node:22

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]