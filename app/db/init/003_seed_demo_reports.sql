-- デモ投稿の初期データ
--
-- **審査員が `docker compose up` した直後から、投稿機能が動いている状態を見せる**ための
-- データ。空の地図では F-2〜F-7 の価値が伝わらないため、住民の投稿・行政の公式投稿・
-- コメント・対応状況が最初から入っている状態にしてある。
--
-- 001 / 002 と同じく **データボリュームが空のときだけ**流れる。つまり
-- `docker compose up` を 2 回目に実行しても二重には入らない。
-- 入れ直したいときは `docker compose down -v && docker compose up`。
--
-- ここで作る投稿は、審査員が自分で投稿したものと同じ扱いで表示・コメント・
-- 絞り込みができる。**消せるのは投稿者本人だけ**という規則（interfaces.md I-5）は
-- そのままなので、下のデモユーザーの投稿は画面からは消せない。
--
-- ===== 守っていること（**変更するときも崩さない**）================================
--
--   1. **実際の被害を特定の場所に結び付けない。** 2026 年 8 月の千葉豪雨をはじめ、
--      実際に起きた災害の被害を「ここで起きた」と書いた投稿は 1 件も無い。
--      場所は市内に散らした架空の地点で、本文にも毎回デモである旨を書いている
--   2. **本文の末尾に必ずデモである断り書きを入れる**（画面のバッジと二重で示す）
--   3. **浸水投稿の雨量はダミー値**。details に "demo": true を入れてあり、
--      画面は気象庁の実測値ではなくデモ値として表示する（src/lib/weather.ts の
--      isDemoDetails / components/FloodRainfall.tsx）
--   4. 写真は再利用が許されたものだけ。**防災の写真は市外で撮られた参考写真**で、
--      市川市の被害写真ではない（data/wikimedia-commons/SOURCE.md）
--
-- 写真の実体は app/db/seed-photos/ に置いてあり、Dockerfile が /app/uploads へ
-- 配る（named volume は空のときイメージ側の中身を引き継ぐ）。ファイル名と
-- byte_size は実物と合わせること。

-- ===== デモ用のユーザー =====================================================
-- provider_uid を 'seed:' で始めているのは、**デモログインが作る uid と衝突させない**ため。
-- デモログインは `<ロール>/<表示名>`（src/lib/auth.ts）なので、この形とはぶつからない。
-- 表示名を「デモ住民」「デモ市役所」にしてあるのも、実在の人物・部署と取り違えられないため。
INSERT INTO users (provider, provider_uid, display_name, role, gov_city_code) VALUES
    ('demo', 'seed:resident:01', 'デモ住民A',          'user', NULL),
    ('demo', 'seed:resident:02', 'デモ住民B',          'user', NULL),
    ('demo', 'seed:resident:03', 'デモ住民C',          'user', NULL),
    ('demo', 'seed:resident:04', 'デモ住民D',          'user', NULL),
    ('demo', 'seed:resident:05', 'デモ住民E',          'user', NULL),
    ('demo', 'seed:gov:01',      'デモ市役所 道路担当', 'gov',  '12203'),
    ('demo', 'seed:gov:02',      'デモ市役所 観光担当', 'gov',  '12203');

-- ===== 投稿 =================================================================
-- VALUES を users に繋いで一気に入れる。**投稿者は provider_uid で指す**ので、
-- id を直接書かずに済む（連番に依存しない）。
--
-- age_hours … 何時間前の投稿として見せるか。`now()` からの相対なので、
--             審査員がいつ起動しても「最近の投稿」に見える。
--             **最大でも 10 日前まで**にしてある（実際の災害の日付と重ならないように）。
INSERT INTO reports (category, title, body, lat, lon, city_code, user_id, status, details, created_at, updated_at)
SELECT
    v.category, v.title, v.body, v.lat, v.lon, '12203', u.id, v.status, v.details::jsonb,
    now() - v.age_hours * interval '1 hour',
    now() - v.age_hours * interval '1 hour'
FROM (VALUES
    -- ---- 危険箇所（F-2）------------------------------------------------------
    ('hazard', '歩道のブロックが割れて段差になっている',
     E'駅前の歩道で、ブロックが割れて 3 cm ほどの段差になっています。ベビーカーだと引っかかりそうです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7195, 139.9265, 'in_progress', '{"hazardType":"road","demo":true}', 52, 'seed:resident:01'),

    ('hazard', '車道に穴があいている',
     E'片側 1 車線の道路で、路肩に近いところが 20 cm ほど陥没しています。自転車だと危ないです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7285, 139.9105, 'ack', '{"hazardType":"road","demo":true}', 30, 'seed:resident:02'),

    ('hazard', '街路灯が消えたままになっている',
     E'通学路の街路灯が 1 週間ほど消えたままです。夜は足元が見えません。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.6865, 139.9165, 'open', '{"hazardType":"light","demo":true}', 20, 'seed:resident:03'),

    ('hazard', '水路沿いのフェンスがゆがんでいる',
     E'水路沿いのフェンスが押されたようにゆがんでいて、隙間ができています。子どもが通り抜けられそうです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7495, 139.9385, 'open', '{"hazardType":"bank","demo":true}', 74, 'seed:resident:04'),

    ('hazard', '公園の遊具の手すりがぐらついている',
     E'すべり台の手すりがぐらついています。小さい子が体重をかけると危ないと思います。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.6749, 139.9017, 'done', '{"hazardType":"playground","demo":true}', 168, 'seed:resident:05'),

    ('hazard', '側溝のふたが外れている',
     E'歩道と車道のあいだの側溝で、ふたが 1 枚外れて溝がむき出しになっています。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7215, 139.9455, 'open', '{"hazardType":"other","demo":true}', 9, 'seed:resident:01'),

    ('hazard', '道路の傷みを見つけたときのお知らせ',
     E'道路のひび割れ・陥没・標識の破損を見つけたら、この地図から場所と写真を添えて投稿してください。現地を確認して対応します。急を要するものは電話でもお受けします。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際のお知らせではありません。',
     35.7226, 139.9312, 'open', '{"hazardType":"other","demo":true}', 96, 'seed:gov:01'),

    -- ---- 浸水（F-3）---------------------------------------------------------
    -- **雨量はダミー値**（"demo": true）。実測値の代わりに置いてあるだけで、
    -- 気象庁の観測値ではない。画面もそう表示する
    ('flood', '道路が冠水しています',
     E'川沿いの道が広い範囲で冠水しています。歩道との境目が分からなくなっているので、歩く人は注意してください。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7345, 139.9275, 'open',
     '{"depthLevel":"ankle","demo":true,"rainfallMm":18.5}', 26, 'seed:resident:02'),

    ('flood', 'アンダーパスの手前まで水がきています',
     E'線路の下をくぐる道で、入口の手前まで水がきています。車は入らないほうがよさそうです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.7255, 139.9195, 'ack',
     '{"depthLevel":"knee","demo":true,"rainfallMm":32.0}', 27, 'seed:resident:03'),

    ('flood', '用水路から水があふれている',
     E'用水路から水があふれて、隣の道に流れ込んでいます。今のところ足首くらいの深さです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.6885, 139.9225, 'open',
     '{"depthLevel":"ankle","demo":true,"rainfallMm":12.0}', 28, 'seed:resident:04'),

    ('flood', '堤防沿いの道が水につかっています',
     E'川の水位が上がって、堤防の内側の道が膝くらいまで水につかっています。近づかないほうがいいです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際の通報ではありません。',
     35.6875, 139.9395, 'open',
     '{"depthLevel":"knee","demo":true,"rainfallMm":41.5}', 25, 'seed:resident:05'),

    ('flood', '土のうステーションを開設しました',
     E'大雨に備えて、公民館の駐車場に土のうを置いています。必要な方は自由にお持ちください。数に限りがあるため、1 世帯 5 袋まででお願いします。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際のお知らせではありません。',
     35.6835, 139.9145, 'open',
     '{"demo":true,"rainfallMm":8.0}', 29, 'seed:gov:01'),

    -- ---- 観光おすすめ（F-6）--------------------------------------------------
    ('spot', '中山法華経寺の五重塔',
     E'木立のあいだから見える五重塔が見事です。朱色が空によく映えるので、晴れた日の午前中がおすすめ。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.72061, 139.94929, 'open', '{"spotType":"scenery","demo":true}', 120, 'seed:resident:01'),

    ('spot', '法華経寺の桜',
     E'春はお堂の前の桜が満開になります。人が少ない朝のうちが静かで気持ちいいです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.72100, 139.94900, 'open', '{"spotType":"scenery","demo":true}', 144, 'seed:resident:02'),

    ('spot', '里見公園の花壇',
     E'季節ごとに花が植え替えられていて、いつ行っても何かしら咲いています。ベンチも多く休憩しやすいです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.74758, 139.89889, 'open', '{"spotType":"scenery","demo":true}', 100, 'seed:resident:03'),

    ('spot', '江戸川ごしの眺め',
     E'橋の上から見る夕方の江戸川がきれいです。川面に対岸の街の明かりが映ります。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.73824, 139.90161, 'open', '{"spotType":"scenery","demo":true}', 76, 'seed:resident:04'),

    ('spot', '葛飾八幡宮の千本イチョウ',
     E'幹が何本にも分かれた大きなイチョウがあります。近くで見上げると迫力があります。随神門もあわせてどうぞ。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.72412, 139.93079, 'open', '{"spotType":"scenery","demo":true}', 60, 'seed:resident:05'),

    ('spot', '真間山弘法寺の仁王門',
     E'石段を上がりきったところにある仁王門が立派です。春は参道の桜も見どころ。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.73989, 139.90747, 'open', '{"spotType":"scenery","demo":true}', 84, 'seed:resident:01'),

    ('spot', '手児奈霊神堂',
     E'万葉集にうたわれた手児奈をまつるお堂です。住宅地の中にあり、静かに歩けます。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.73829, 139.90935, 'open', '{"spotType":"scenery","demo":true}', 130, 'seed:resident:02'),

    ('spot', 'じゅん菜池緑地',
     E'池のまわりを一周できる遊歩道があります。水面に木が映り込んでいて、散歩に向いています。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.75134, 139.90635, 'open', '{"spotType":"scenery","demo":true}', 150, 'seed:resident:03'),

    ('spot', '真間川の桜並木',
     E'川の両側に桜が続きます。花の時期は水面まで枝が垂れて、トンネルのようになります。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。',
     35.73655, 139.92635, 'open', '{"spotType":"scenery","demo":true}', 110, 'seed:resident:04'),

    ('spot', '市川の梨',
     E'市内には梨の直売所が点在しています。8 月から 10 月にかけて品種が移り変わるので、時期を変えて訪ねるのも楽しみ方のひとつです。\n\n※ CHIZUBA の動作確認のために用意したデモ投稿です。実際のお知らせではありません。',
     35.77222, 139.96782, 'open', '{"spotType":"souvenir","demo":true}', 90, 'seed:gov:02')
) AS v(category, title, body, lat, lon, status, details, age_hours, uid)
JOIN users u ON u.provider = 'demo' AND u.provider_uid = v.uid;

-- ===== 投稿の写真 ===========================================================
-- 実体は Dockerfile が /app/uploads に置いた app/db/seed-photos/ の中身。
-- **byte_size は実物と一致させること**（report_photos の CHECK に引っかかる）。
-- 投稿はタイトルで指す（上の 22 件はタイトルが重複しないようにしてある）。
INSERT INTO report_photos (report_id, file_name, mime_type, byte_size, sort_order)
SELECT r.id, v.file_name, 'image/jpeg', v.byte_size, v.sort_order
FROM (VALUES
    -- 防災（市外で撮られた参考写真）
    ('歩道のブロックが割れて段差になっている', 'demo-ref-pothole-1.jpg',      272779, 0),
    ('車道に穴があいている',                   'demo-ref-pothole-2.jpg',      400766, 0),
    ('道路が冠水しています',                   'demo-ref-flooded-road-2.jpg', 190207, 0),
    ('アンダーパスの手前まで水がきています',   'demo-ref-flooded-road-3.jpg', 255279, 0),
    ('用水路から水があふれている',             'demo-ref-sandbag.jpg',        189900, 0),
    ('堤防沿いの道が水につかっています',       'demo-ref-river-swollen.jpg',  112285, 0),
    -- 観光（梨以外は市川市内で撮られたもの）
    ('中山法華経寺の五重塔',       'demo-spot-hokekyoji-pagoda.jpg', 239142, 0),
    ('法華経寺の桜',               'demo-spot-hokekyoji-sakura.jpg', 285461, 0),
    ('里見公園の花壇',             'demo-spot-satomi-park.jpg',      307919, 0),
    ('江戸川ごしの眺め',           'demo-spot-edogawa-bridge.jpg',   123714, 0),
    ('葛飾八幡宮の千本イチョウ',   'demo-spot-hachimangu-icho.jpg',  284927, 0),
    ('葛飾八幡宮の千本イチョウ',   'demo-spot-hachimangu-gate.jpg',  310620, 1),
    ('真間山弘法寺の仁王門',       'demo-spot-guhoji-gate.jpg',      352956, 0),
    ('手児奈霊神堂',               'demo-spot-tekona.jpg',           323486, 0),
    ('じゅん菜池緑地',             'demo-spot-junsaiike.jpg',        142732, 0),
    ('真間川の桜並木',             'demo-spot-mamagawa-sakura.jpg',  319879, 0),
    ('市川の梨',                   'demo-spot-nashi-fruit.jpg',      252468, 0)
) AS v(title, file_name, byte_size, sort_order)
JOIN reports r ON r.title = v.title;

-- ===== コメント =============================================================
-- is_official は本来サーバーが投稿者のロールから決める（interfaces.md I-5）。
-- ここでも同じ規則になるよう、**行政ユーザーのコメントだけ true** にしている。
INSERT INTO report_comments (report_id, user_id, body, is_official, created_at)
SELECT r.id, u.id, v.body, u.role = 'gov',
       r.created_at + v.after_hours * interval '1 hour'
FROM (VALUES
    ('歩道のブロックが割れて段差になっている',
     '現地を確認しました。今週中に補修を行う予定です。ご連絡ありがとうございました。', 8, 'seed:gov:01'),
    ('公園の遊具の手すりがぐらついている',
     '補修が完了しました。ご連絡ありがとうございました。', 30, 'seed:gov:01'),
    ('道路が冠水しています',
     '排水作業を進めています。通行はう回をお願いします。', 3, 'seed:gov:01'),
    ('アンダーパスの手前まで水がきています',
     '先ほど通りましたが、水は引いていました。', 6, 'seed:resident:05'),
    ('中山法華経寺の五重塔',
     '秋の紅葉の時期もきれいでした。', 24, 'seed:resident:02'),
    ('市川の梨',
     '直売所は道沿いにのぼりが立っているので分かりやすいです。', 12, 'seed:resident:04')
) AS v(title, body, after_hours, uid)
JOIN reports r ON r.title = v.title
JOIN users  u ON u.provider = 'demo' AND u.provider_uid = v.uid;
