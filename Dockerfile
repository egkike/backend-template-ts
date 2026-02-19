# Etapa 1: Construcción (builder)
FROM node:22-slim AS builder
RUN apt-get update && apt-get upgrade -y

WORKDIR /app

# Instalar pnpm (node 22 ya trae un npm moderno)
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./

RUN pnpm install --frozen-lockfile

COPY src/ ./src/

# Compila el proyecto
RUN pnpm build

# Verificamos que dist exista (debug opcional)
RUN ls -la dist || echo "dist no generado!"

# Etapa 2: Imagen final
FROM node:22-alpine
# FIX SEGURIDAD: Actualiza los paquetes internos de Alpine (como ssl o musl)
# apk upgrade aplica los parches de seguridad más recientes disponibles
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]