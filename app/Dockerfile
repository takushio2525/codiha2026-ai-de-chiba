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

# 投稿写真の置き場。named volume を /app/uploads にマウントするが、
# **ボリュームが空のときは、この位置にあるディレクトリの中身と所有者を引き継ぐ**。
# ここで node 所有にしておかないとボリュームが root 所有になり、
# USER node で書けなくなる（.agent/architecture.md「投稿写真の保存」）。
RUN mkdir -p /app/uploads && chown node:node /app/uploads

# デモ投稿の写真。db/init/003_seed_demo_reports.sql が report_photos に
# ファイル名だけを登録してあり、その実体がこれになる。**上の mkdir より後に置くこと**
# （空のボリュームは、この時点のディレクトリの中身をそのまま引き継ぐ）。
# 手元で npm run dev するときは app/uploads/ に自分でコピーする（app/README.md）。
COPY --chown=node:node db/seed-photos/ ./uploads/

USER node
EXPOSE 3000
CMD ["node", "server.js"]
