# 市川市オープンデータマップ
#
# Docker 公式イメージ（DOI）の node を使い、multi-stage で
# 「依存の取得 → ビルド → 実行」を分ける。実行イメージには
# next.config.ts の output: "standalone" が出した最小構成だけを入れる。
#
#   docker compose up          起動（http://localhost:3000）
#
# タグは固定する（latest を使わない）。node 22 は LTS。

# ---- 1. 依存の取得 ------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# package-lock.json に linux 版のバイナリも記録してあるので、
# 開発機が macOS でもここで linux 版が入る（ソースからのビルドは起きない）。
RUN npm ci --no-audit --no-fund

# ---- 2. ビルド ----------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. 実行 ------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# public/ には市川市オープンデータから作った GeoJSON が入っている
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
