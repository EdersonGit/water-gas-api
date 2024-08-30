# Estágio de desenvolvimento
FROM node:16 AS development
WORKDIR /app

# Copia o package.json e package-lock.json
COPY package*.json ./
RUN npm install

# Copia o restante dos arquivos
COPY . .

# Estágio de produção
FROM node:16-alpine AS production
WORKDIR /app

# Copia apenas os arquivos necessários do estágio de desenvolvimento
COPY --from=development /app/dist ./dist
COPY --from=development /app/node_modules ./node_modules
COPY --from=development /app/package*.json ./

# Define o comando padrão para produção
CMD ["node", "dist/server.js"]
