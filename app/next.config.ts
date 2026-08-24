import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker のランタイムイメージを小さくするため、必要なファイルだけを .next/standalone に出す。
  // Dockerfile の runner ステージはこの出力をそのままコピーして `node server.js` で起動する。
  output: "standalone",

  // Next 16 は app/AGENTS.md と app/CLAUDE.md を自動生成する。
  // このリポジトリはルートの AGENTS.md を入口にする規約なので生成させない。
  agentRules: false,
};

export default nextConfig;
