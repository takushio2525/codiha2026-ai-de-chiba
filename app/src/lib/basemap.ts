/** ベースマップ（背景地図）の定義。
 *
 * 国土地理院の「淡色地図」タイルを使う。認証キーが要らず、出典を明記すれば
 * 自由に利用できるので、審査員の環境でも追加設定なしで表示できる。
 * 利用規約: https://maps.gsi.go.jp/development/ichiran.html
 */
import type { StyleSpecification } from "maplibre-gl";

export const GSI_ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>';

/** 市川市のだいたい中心（市役所付近）。 */
export const ICHIKAWA_CENTER: [number, number] = [139.9312, 35.7226];
export const INITIAL_ZOOM = 12.4;

export const basemapStyle: StyleSpecification = {
  version: 8,
  sources: {
    gsi: {
      type: "raster",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"],
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
      attribution: GSI_ATTRIBUTION,
    },
  },
  layers: [
    // タイルが取得できない環境でも、点が見える下地は残るようにしておく
    { id: "background", type: "background", paint: { "background-color": "#eeece5" } },
    { id: "gsi", type: "raster", source: "gsi" },
  ],
};
