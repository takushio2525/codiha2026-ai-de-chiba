/**
 * MapLibre GL JS の Web Worker を public/ にコピーする（npm run build / dev の前に自動で走る）。
 *
 * v6 から worker は本体と別の .mjs になり、`import.meta.url` を基準に
 * `./maplibre-gl-worker.mjs` を読みに行く実装に変わった。
 * バンドルすると import.meta.url はバンドル済みチャンクの URL になるため、
 * MapLibre は存在しない `/_next/static/chunks/maplibre-gl-worker.mjs` を読もうとして
 * 無言で失敗する（ラスタタイルは出るが GeoJSON が永久に読み込み中のままになる）。
 *
 * そこで worker を自前で配信し、`setWorkerUrl()` でそこを指す（MapView.tsx）。
 * worker は `./maplibre-gl-shared.mjs` を import するので、2 つ並べて置く必要がある。
 *
 * node_modules からコピーするので、maplibre-gl を更新すれば中身も自動で追従する。
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(dist, file), join(outDir, file));
  console.log(`copied public/maplibre/${file}`);
}
