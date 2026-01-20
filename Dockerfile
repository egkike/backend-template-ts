# Etapa 1: Construcción (builder)
FROM node:22 AS builder

WORKDIR /app

RUN npm install -g npm@latest pnpm@latest

COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json ./

RUN pnpm install --frozen-lockfile

COPY src/ ./src/

# Compila con tsconfig.build.json
#RUN pnpm tsc --build tsconfig.build.json
RUN pnpm build

# Verificamos que dist exista (debug opcional)
RUN ls -la dist || echo "dist no generado!"

# Etapa 2: Imagen final
FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# CMD con resolución de módulos sin extensión (Node 22+ con bundler debería funcionar)
#CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"]
CMD ["node", "dist/index.js"]