# Install dependencies in a full image, run in the slim one.
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
USER bun
EXPOSE 3000
# API only; the dashboard is the separate frontend/ image.
CMD ["bun", "src/server/index.ts"]
