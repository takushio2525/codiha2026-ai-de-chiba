/** 市町村マスタ。**サーバー側からしか読み込まないこと**（db.ts を経由するため）。
 *
 * 対応は千葉県全域で、市町村は 5 桁のコード（JIS X 0402）で識別する。
 * 座標やズームをコードに書かず、このテーブルから引くのが全域対応の建付け
 * （.agent/architecture.md「千葉県全域対応の建付け」）。
 */
import { query } from "./db";

/** 既定の市町村。未指定なら市川市（docs/design/requirements.md 7-4）。 */
export const DEMO_CITY_CODE = "12203";

export type Municipality = {
  code: string;
  name: string;
  centerLat: number;
  centerLon: number;
  zoom: number;
  /** 市域のおおよその範囲 `[西, 南, 東, 北]`。投稿の座標から市町村を決めるのに使う。 */
  bbox: [number, number, number, number];
};

type MunicipalityRow = {
  code: string;
  name: string;
  center_lat: number;
  center_lon: number;
  zoom: number;
  bbox_west: number;
  bbox_south: number;
  bbox_east: number;
  bbox_north: number;
};

const SELECT_COLUMNS = `
  code, name, center_lat, center_lon, zoom,
  bbox_west, bbox_south, bbox_east, bbox_north
`;

function toMunicipality(row: MunicipalityRow): Municipality {
  return {
    code: row.code,
    name: row.name,
    centerLat: row.center_lat,
    centerLon: row.center_lon,
    zoom: row.zoom,
    bbox: [row.bbox_west, row.bbox_south, row.bbox_east, row.bbox_north],
  };
}

/** 市町村コードで 1 件引く。無ければ null。 */
export async function findMunicipality(code: string): Promise<Municipality | null> {
  const rows = await query<MunicipalityRow>(
    `SELECT ${SELECT_COLUMNS} FROM municipalities WHERE code = $1`,
    [code],
  );
  return rows.length > 0 ? toMunicipality(rows[0]) : null;
}
