FROM node:22.13-alpine

WORKDIR /app

# Копируем workspace конфиги
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./

# Копируем только domiki-tower (не api-server чтобы не тащить его зависимости)
COPY artifacts/domiki-tower ./artifacts/domiki-tower

# Устанавливаем pnpm
RUN npm install -g pnpm@9 --ignore-scripts

# Устанавливаем зависимости только для domiki-tower
RUN pnpm install --filter @workspace/domiki-tower --ignore-scripts

# Собираем
RUN pnpm --filter @workspace/domiki-tower run build

# Для раздачи статики используем serve
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "artifacts/domiki-tower/dist", "-l", "3000"]
