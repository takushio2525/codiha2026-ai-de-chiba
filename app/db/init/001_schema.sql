-- CHIZUBA のスキーマ（PostgreSQL 17）
--
-- postgres イメージの /docker-entrypoint-initdb.d に置いてあり、
-- **データボリュームが空のときだけ**ファイル名順に流れる。
-- スキーマを変えたら `docker compose down -v` でボリュームごと作り直すこと。
--
-- 論理モデル（何を持つか）の正本: docs/design/requirements.md 5 章
-- つなぎ目の約束の正本:           docs/design/interfaces.md I-7
--
-- 設計の要点:
--   - 位置は lat / lon の double precision。PostGIS は使わない（requirements.md 7-3）
--   - 投稿は 3 種類（危険箇所・浸水・観光おすすめ）を 1 テーブルに統一し、
--     違いは category とカテゴリ固有の details(jsonb) で吸収する（requirements.md 4 章）
--   - 削除は物理削除。論理削除フラグを持たない
--   - 時刻は timestamptz。表示側で JST に直す

-- ===== このインストールの識別子 =============================================
-- **セッション（JWT）をこのデータベースに縛り付けるための値。**
--
-- JWT は自分の中に uid（users.id）を持っているだけなので、これが無いと
-- 「別の場所で動いている CHIZUBA が発行したトークン」を見分けられない。
-- users.id は単なる連番なので、DB を作り直すと同じ番号が別人に割り当たる。
-- Cookie はポートを区別しないため、同じ localhost の別インスタンス同士でも起きる
-- （実測で再現した。詳細は docs/design/interfaces.md I-8）。
--
-- 行はいつでも 1 行だけ（id = 1 に固定）。install_id はここで 1 度だけ作られ、
-- **ボリュームを消して作り直すと別の値になる**＝それ以前のセッションは無効になる。
CREATE TABLE app_instance (
    id         smallint    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- gen_random_uuid() は PostgreSQL 13 以降の組み込み関数（拡張は要らない）
    install_id uuid        NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_instance (id) VALUES (1);

-- ===== 市町村マスタ =========================================================
-- 千葉県全域対応の要。市町村を 1 つ増やす作業 = このテーブルに 1 行足す、
-- で済むようにコードへ座標を書かない（.agent/architecture.md）。
CREATE TABLE municipalities (
    -- JIS X 0402 の 5 桁コード（市川市 = 12203）
    code       char(5)          PRIMARY KEY CHECK (code ~ '^[0-9]{5}$'),
    name       text             NOT NULL,
    -- 地図の初期表示
    center_lat double precision NOT NULL,
    center_lon double precision NOT NULL,
    zoom       double precision NOT NULL DEFAULT 12,
    -- 市域のおおよその範囲。投稿の座標から city_code を決めるのに使う。
    -- requirements.md では bbox と 1 つで書いてあるが、SQL で範囲比較を
    -- そのまま書けるよう 4 列に分けている（物理スキーマはこのファイルが正本）。
    bbox_west  double precision NOT NULL,
    bbox_south double precision NOT NULL,
    bbox_east  double precision NOT NULL,
    bbox_north double precision NOT NULL,
    CONSTRAINT municipalities_bbox_order
        CHECK (bbox_west < bbox_east AND bbox_south < bbox_north)
);

-- ===== ユーザー =============================================================
-- ログインした人。認証は Google（本線）とデモ（キー未設定時）の 2 経路あり、
-- どちらで入っても同じ 1 行になる（requirements.md 8 章）。
CREATE TABLE users (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- 'google' … Google OAuth / 'demo' … デモログイン
    provider      text        NOT NULL CHECK (provider IN ('google', 'demo')),
    -- 認証元での一意な識別子。画面にもレスポンスにも出さない
    provider_uid  text        NOT NULL,
    display_name  text        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 30),
    -- 'user' … 一般ユーザー / 'gov' … 行政ユーザー
    role          text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'gov')),
    -- 行政ユーザーが担当する市町村。他市の投稿を操作させないための鍵になる
    gov_city_code char(5)     REFERENCES municipalities (code),
    created_at    timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_uid),
    -- 行政ユーザーは必ず担当市町村を持つ（requirements.md 5 章）
    CONSTRAINT users_gov_requires_city
        CHECK (role <> 'gov' OR gov_city_code IS NOT NULL)
);

-- ===== 投稿 =================================================================
-- 危険箇所（hazard）・浸水（flood）・観光おすすめ（spot）の共通モデル。
CREATE TABLE reports (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category   text             NOT NULL CHECK (category IN ('hazard', 'flood', 'spot')),
    title      text             NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
    body       text             NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
    -- 千葉県の範囲に収まらない座標は受け付けない（interfaces.md I-4）
    lat        double precision NOT NULL CHECK (lat BETWEEN 34.8 AND 36.2),
    lon        double precision NOT NULL CHECK (lon BETWEEN 139.7 AND 140.9),
    -- クライアントからは受け取らない。サーバーが lat / lon を bbox と突き合わせて決める
    city_code  char(5)          NOT NULL REFERENCES municipalities (code),
    user_id    bigint           NOT NULL REFERENCES users (id),
    -- 行政の対応状況。変えられるのは担当市町村の行政ユーザーだけ
    status     text             NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'ack', 'in_progress', 'done')),
    -- カテゴリ固有の項目（hazardType / depthLevel / rainfallMm など）。
    -- 検索条件には使わない。使いたくなったら列に昇格させる（interfaces.md I-7）
    details    jsonb            NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz      NOT NULL DEFAULT now(),
    -- PATCH（本文の編集・対応状況の更新）で触るので最終更新も持つ
    updated_at timestamptz      NOT NULL DEFAULT now()
);

-- 地図の表示範囲で絞る検索（interfaces.md I-3 の bbox）に効かせる
CREATE INDEX reports_lat_idx        ON reports (lat);
CREATE INDEX reports_lon_idx        ON reports (lon);
CREATE INDEX reports_city_code_idx  ON reports (city_code);
CREATE INDEX reports_category_idx   ON reports (category);
CREATE INDEX reports_created_at_idx ON reports (created_at DESC);

-- ===== 投稿の写真 ===========================================================
-- 実体は uploads ボリュームに置き、ここにはファイル名だけを記録する。
CREATE TABLE report_photos (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id  bigint      NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    file_name  text        NOT NULL,
    mime_type  text        NOT NULL
                           CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    byte_size  integer     NOT NULL CHECK (byte_size > 0 AND byte_size <= 5242880),
    sort_order smallint    NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 2),
    created_at timestamptz NOT NULL DEFAULT now(),
    -- 1 投稿につき写真は 3 枚まで。並び順は重複させない（interfaces.md I-4）
    UNIQUE (report_id, sort_order)
);

-- ===== 投稿へのコメント =====================================================
CREATE TABLE report_comments (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id   bigint      NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    user_id     bigint      NOT NULL REFERENCES users (id),
    body        text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
    -- 行政の公式回答かどうか。クライアントからは受け取らず、
    -- サーバーが投稿者のロールを見て決める（interfaces.md I-5）
    is_official boolean     NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX report_comments_report_id_idx ON report_comments (report_id, created_at);
