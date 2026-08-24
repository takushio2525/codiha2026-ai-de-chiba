-- 市町村マスタの初期データ
--
-- 対応は千葉県全域だが、デモデータとデモシナリオは市川市に集中させる
-- （docs/design/requirements.md 1 章）。
--
-- **市町村を増やすときはここに 1 行足すだけでよい。** コードの変更は要らない
-- （.agent/architecture.md「千葉県全域対応の建付け」）。足したあとは
-- `docker compose down -v && docker compose up` で流し直す。
--
-- 値の出どころ:
--   center_lat / center_lon / zoom … app/src/lib/basemap.ts の初期表示と同じ
--   bbox_*                        … data/scripts/build_geojson.py の BBOX と同じ
--                                   （市域を覆うおおよその箱。市外の座標を弾くのに使う）

INSERT INTO municipalities
    (code,    name,     center_lat, center_lon, zoom, bbox_west, bbox_south, bbox_east, bbox_north)
VALUES
    ('12203', '市川市',    35.7226,   139.9312, 12.4,    139.84,      35.60,    140.02,      35.82);
