"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, useState } from "react";
import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  MapLayerMouseEvent,
  PaddingOptions,
  MapLibreMap,
  MapMouseEvent,
  Popup,
} from "maplibre-gl";

import { GSI_ATTRIBUTION, ICHIKAWA_CENTER, INITIAL_ZOOM, basemapStyle } from "@/lib/basemap";
import { MAP_ATTRIBUTION } from "@/lib/credits";
import { UNNAMED_PLACE, type LngLat } from "@/lib/geo";
import {
  HAZARDS,
  HAZARD_RENDER_MINZOOM,
  hazardLayerId,
  hazardSourceId,
  type HazardId,
} from "@/lib/hazards";
import { LAYERS, pointLayerId, type FacilityProps, type LayerDef, type LayerId } from "@/lib/layers";
import {
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportCollection,
} from "@/lib/reports";
import type { RouteTarget, WalkingRoute } from "@/lib/routing";
import {
  SCENIC_CATEGORIES,
  SCENIC_FALLBACK_COLOR,
  SCENIC_LABEL,
  SCENIC_POINT_LAYER,
  SCENIC_SOURCE,
  scenicCategories,
  scenicColor,
  type ScenicProps,
} from "@/lib/scenic";
import { scenicPhoto, scenicPhotoSrc, type ScenicPhoto } from "@/lib/scenicPhotos";

export type LayerData = Record<LayerId, FeatureCollection<Point, FacilityProps>>;

type Props = {
  data: LayerData;
  visible: Record<LayerId, boolean>;
  /** ハザードマップ（浸水想定）の重ね。レイヤーごとに ON/OFF と不透明度を持つ */
  hazardVisible: Record<HazardId, boolean>;
  hazardOpacity: Record<HazardId, number>;
  origin: LngLat | null;
  route: WalkingRoute | null;
  /** true のあいだは、地図のどこをクリックしても出発地点の指定になる */
  pickMode: boolean;
  onPickOrigin: (point: LngLat) => void;
  onNavigate: (destination: RouteTarget) => void;
  /** 景観スポット（F-5）。読み込めていないあいだ・失敗したときは null */
  scenic: FeatureCollection<Point, ScenicProps> | null;
  /** 景観スポットの表示 ON/OFF */
  scenicVisible: boolean;
  /** 住民・行政の投稿（GeoJSON）。静的レイヤーと同じ形で受け取る */
  reports: ReportCollection;
  /** 投稿のカテゴリごとの表示 ON/OFF */
  reportVisible: Record<ReportCategory, boolean>;
  /** 詳細パネルで開いている投稿。地図の上で強調する */
  selectedReportId: number | null;
  /** 注意案内（F-4）が出ているか。過去の浸水報告の地点に輪を描く */
  floodAlert: boolean;
  onSelectReport: (id: number) => void;
  /** 指定した地点へ地図を寄せる。同じ地点でも押し直せるよう毎回新しい値を渡す */
  focus: { coords: LngLat; nonce: number } | null;
  /** 現在地ボタンで位置が取れたとき。徒歩ナビの出発地点に使う。
   *  **拒否されたときは呼ばれない**（MapLibre のコントロールが自分でボタンを無効にする） */
  onGeolocate: (coords: LngLat) => void;
  /** 操作パネルの実寸。地図の余白に反映する */
  panel: PanelBox;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** GeoJSON ソースの中身を差し替える。
 *  MapLibre の `getSource` は種類の違うソースもまとめて返すので、
 *  `setData` を持つものとして受け取る（ここで扱うのはすべて geojson ソース）。 */
function setSourceData(map: MapLibreMap, id: string, data: unknown): void {
  const source = map.getSource(id) as { setData: (d: unknown) => void } | undefined;
  source?.setData(data);
}

/** 投稿のソースとレイヤー。施設の点とは別に持つ（色と形を変えて区別するため）。 */
const REPORT_SOURCE = "reports";
/** 行政（公式）を表す色。**`components/OfficialBadge.tsx` の青と同じ値にすること。**
 *  向こうは Tailwind の任意値（`bg-[#0072b2]`）で class に直書きしないと拾われないので、
 *  この定数を共有できない。片方を変えたらもう片方も変える */
const OFFICIAL_COLOR = "#0072b2";
const REPORT_HALO_LAYER = "report-halo";
const REPORT_POINT_LAYER = "report-points";
/** 注意案内（F-4）のとき、過去の浸水報告の地点に描く輪。点の下に敷く */
const REPORT_ALERT_LAYER = "report-flood-alert";

/** 景観スポットのカテゴリごとの色。定義は lib/scenic.ts が正本。
 *  **配列プロパティは MapLibre が文字列に畳んでしまう**ので、主カテゴリの文字列を見る。 */
function scenicColorExpression(): unknown[] {
  const expression: unknown[] = ["match", ["get", "categoryPrimary"]];
  for (const category of SCENIC_CATEGORIES) expression.push(category.raw, category.color);
  expression.push(SCENIC_FALLBACK_COLOR);
  return expression;
}

/** カテゴリごとの色。定義は lib/reports.ts が正本。 */
function reportColorExpression(): unknown[] {
  const expression: unknown[] = ["match", ["get", "category"]];
  for (const category of REPORT_CATEGORIES) expression.push(category.id, category.color);
  expression.push("#7b818b"); // 知らないカテゴリ（将来の追加）は灰色で出す
  return expression;
}

/** 投稿を囲む輪の色。**行政（`role = 'gov'`）の投稿だけ公式色の輪**にして、
 *  住民の投稿（白い輪）と地図の上で見分けられるようにする。
 *  一覧と詳細パネルの「行政」バッジと同じ色を使う（F-7）。 */
function reportHaloColorExpression(): unknown[] {
  return ["case", ["==", ["get", "authorRole"], "gov"], OFFICIAL_COLOR, "#ffffff"];
}

/** 表示 ON のカテゴリだけを描く。全部 OFF なら 1 つも描かない。 */
function reportFilterExpression(visible: Record<ReportCategory, boolean>): unknown[] {
  const shown = REPORT_CATEGORIES.filter((c) => visible[c.id]).map((c) => c.id);
  return ["in", ["get", "category"], ["literal", shown]];
}

/** 選んでいる投稿だけ縁を太くする。 */
function reportStrokeExpression(selectedId: number | null): unknown[] {
  return ["case", ["==", ["get", "id"], selectedId ?? -1], 4, 1.8];
}

/** 操作パネルの見た目の大きさ。地図の余白に反映する。 */
export type PanelBox = { width: number; height: number };

/**
 * 操作パネルが地図に重なっているぶんを余白として扱う。
 * これを入れると、初期表示も経路のフィットも「実際に見えている範囲」の中央にそろう。
 * 幅の広い画面ではパネルは左、狭い画面では下にあるので、向きを切り替える。
 * パネルの大きさは実測値を使う（スマホでは開閉で高さが大きく変わるため）。
 */
function overlayPadding(panel: PanelBox): PaddingOptions {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const gap = 24;
  return wide
    ? { top: gap, right: gap, bottom: gap, left: Math.round(panel.width) + gap * 2 }
    : { top: gap, right: gap, bottom: Math.round(panel.height) + gap, left: gap };
}

// ---- ポップアップの共通部品 ----------------------------------------------------
// 施設（オープンデータ）と景観スポットで中身は違うが、**枠は同じ**でなければ
// 「地図の点を押したら出るもの」として読めなくなる。骨組みをここに集める。

/**
 * ポップアップの外枠。返す `scroll` に中身を入れ、`root` に footer を足す。
 *
 * **背の高いポップアップが画面をはみ出さないようにする。**
 * MapLibre はポップアップを点の上か下に置くだけで、入りきらなくても縮めない。
 * 地図の高さの半分（スマホでおよそ 40dvh）に収めておけば、点がどこにあっても
 * 地図の中に必ず入る。あふれる中身は縦にスクロールさせ、
 * 「ここへナビ」だけは下に固定して、スクロールせずに押せるようにする。
 *
 * @param size 幅の指定だけを渡す（中身の量が違うので施設と景観で変える）
 */
function popupShell(size: string): { root: HTMLElement; scroll: HTMLElement } {
  const root = document.createElement("div");
  root.className = `flex max-h-[40dvh] ${size} flex-col text-ink md:max-h-[62dvh]`;
  const scroll = document.createElement("div");
  scroll.className = "min-h-0 flex-1 overflow-y-auto overscroll-contain";
  return { root, scroll };
}

/** 種別の見出し（色チップ ＋ 「指定緊急避難場所」などの名前）。 */
function popupHead(color: string, label: string): HTMLElement {
  const head = document.createElement("div");
  head.className = "flex items-center gap-2 px-4 pt-3.5 pb-1";
  const chip = document.createElement("span");
  chip.className = "size-2.5 shrink-0 rounded-full";
  chip.style.backgroundColor = color;
  const kind = document.createElement("span");
  kind.className = "text-[11px] font-medium tracking-wide text-ink-muted";
  kind.textContent = label;
  head.append(chip, kind);
  return head;
}

/** 地点の名前。 */
function popupTitle(name: string): HTMLElement {
  const title = document.createElement("h3");
  title.className = "px-4 text-[15px] leading-snug font-semibold text-ink";
  title.textContent = name;
  return title;
}

/** 「ラベル: 値」の 1 行。**値は textContent で入れる**ので中身がそのまま表示される
 *  （オープンデータの中の記号や山かっこが markup として解釈されない）。 */
function popupRow(label: string, value: string, labelWidth: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "flex gap-2";
  const dt = document.createElement("dt");
  dt.className = `${labelWidth} shrink-0 text-ink-muted`;
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.className = "flex-1 text-ink-sub break-words";
  dd.textContent = value;
  row.append(dt, dd);
  return row;
}

/** 下に固定する「ここへナビ」。**スクロールせずに押せる**ことがこの位置の理由。 */
function navFooter(target: RouteTarget, onNavigate: Props["onNavigate"]): HTMLElement {
  const footer = document.createElement("div");
  footer.className = "shrink-0 border-t border-line bg-[#fafafa] px-4 py-2.5";
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "w-full rounded-lg bg-ink px-3 py-2.5 text-[12.5px] font-semibold text-white " +
    "transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  button.textContent = "ここへナビ";
  button.addEventListener("click", () => onNavigate(target));
  footer.append(button);
  return footer;
}

/** 施設（オープンデータ）のポップアップ。 */
function buildPopup(
  layer: LayerDef,
  props: FacilityProps,
  coords: LngLat,
  onNavigate: Props["onNavigate"],
): HTMLElement {
  const { root, scroll } = popupShell("w-[16.5rem] max-w-[80vw]");
  const name = props.name ?? UNNAMED_PLACE;

  const body = document.createElement("dl");
  body.className = "mt-2 space-y-1 px-4 text-[12.5px] leading-relaxed";
  const addRow = (label: string, value: string) =>
    body.append(popupRow(label, value, "w-[5.5rem]"));

  if (props.address) addRow("所在地", props.address);
  for (const field of layer.popupFields) {
    const raw = props[field.key];
    const value = Array.isArray(raw) ? raw.join("、") : raw;
    if (value) addRow(field.label, String(value));
  }

  // 本文の下端が footer にくっつかないよう、スクロールする側に余白を持たせる
  body.classList.add("pb-3");
  scroll.append(popupHead(layer.color, layer.label), popupTitle(name), body);
  root.append(
    scroll,
    navFooter({ name, coords, kind: layer.label, color: layer.color }, onNavigate),
  );
  return root;
}

/** 景観スポットの写真（ウィキメディア・コモンズ）。**写真があるスポットだけ**に付く。
 *
 * **CC BY と CC BY-SA は作者の表示が条件**なので、作者名とライセンスを写真の上に重ねて
 * 必ず一緒に出す。作者名からコモンズの説明ページ（＝出典）へ、ライセンス名からその条文へ飛ぶ。
 * 54 枚ぶんの一覧は `/about` の「景観100選のスポット写真」節にある。
 *
 * 高さを固定しているのは、**ポップアップ全体がスマホで 40dvh しか無い**ため
 * （`.agent/conventions.md` のモバイルファースト）。写真に高さを預けると解説が読めなくなる。
 */
function buildScenicPhoto(photo: ScenicPhoto, spotName: string): HTMLElement {
  const figure = document.createElement("figure");
  figure.className =
    "relative m-0 h-[104px] w-full shrink-0 overflow-hidden bg-[#eceef1] md:h-[132px]";

  const img = document.createElement("img");
  img.src = scenicPhotoSrc(photo);
  // 装飾ではなく中身なので alt を入れる。読み上げで「〜の写真」と分かるようにする
  img.alt = `${spotName}の写真`;
  img.loading = "lazy";
  img.decoding = "async";
  img.className = "h-full w-full object-cover";

  const caption = document.createElement("figcaption");
  caption.className =
    "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/45 to-transparent " +
    "px-3 pt-5 pb-1.5 text-[10px] leading-tight text-white";

  // 撮影地が市川市の外のものだけ、先に断りを出す（いまは三番瀬だけ）
  if (photo.placeNote) {
    const note = document.createElement("span");
    note.className = "block font-medium text-white/95";
    note.textContent = photo.placeNote;
    caption.append(note);
  }

  const credit = document.createElement("span");
  credit.className = "block text-white/90";
  const linkClass =
    "underline decoration-white/40 underline-offset-2 hover:decoration-white";

  // 作者名 → コモンズの説明ページ（＝出典）
  const artistLink = document.createElement("a");
  artistLink.href = photo.page;
  artistLink.target = "_blank";
  artistLink.rel = "noreferrer";
  artistLink.className = linkClass;
  artistLink.textContent = photo.artist;
  credit.append(document.createTextNode("撮影: "), artistLink, document.createTextNode(" / "));

  // ライセンス名 → その条文。パブリックドメインには条文が無いので文字だけ出す
  if (photo.licenseUrl) {
    const licenseLink = document.createElement("a");
    licenseLink.href = photo.licenseUrl;
    licenseLink.target = "_blank";
    licenseLink.rel = "noreferrer";
    licenseLink.className = linkClass;
    licenseLink.textContent = photo.license;
    credit.append(licenseLink);
  } else {
    credit.append(document.createTextNode(photo.license));
  }
  caption.append(credit);

  figure.append(img, caption);
  return figure;
}

/** 景観スポットのポップアップ（F-5）。**日本語と英語の解説を切り替えられる**。
 *
 * 元データは 100 件すべてに日英の解説を持っている。日本語は 1〜2 文のキャプション、
 * 英語はそれより長い文章で、内容も 1 対 1 の訳ではない。どちらも「そのまま出す」
 * だけにして、機械翻訳や要約はしない（出典のデータを改変しないため）。
 *
 * 画像列は配信先が見つからないので使わない（data/ichikawa-city/SOURCE.md）。
 */
function buildScenicPopup(
  props: ScenicProps,
  coords: LngLat,
  onNavigate: Props["onNavigate"],
): HTMLElement {
  const categories = scenicCategories(props.categories);
  const color = scenicColor(props.categoryPrimary ?? categories[0]);

  // 施設のポップアップと同じ枠に載せる（中身はスクロール・ナビのボタンは下に固定）。
  // 景観スポットは英語の解説が 365 字あるものまであり、そのままだと縦に伸び続ける。
  const { root, scroll } = popupShell("w-[18rem] max-w-[82vw]");
  const spotName = props.name ?? UNNAMED_PLACE;
  const head = popupHead(color, SCENIC_LABEL);
  const name = popupTitle(spotName);

  const nameEn = document.createElement("p");
  nameEn.className = "px-4 text-[11.5px] leading-snug text-ink-muted";
  nameEn.textContent = props.nameEn ?? "";

  // カテゴリは 1 件が最大 3 つ持つ。全部を小さなラベルで並べる
  const tags = document.createElement("ul");
  tags.className = "mt-1.5 flex flex-wrap gap-1 px-4";
  for (const raw of categories) {
    const tag = document.createElement("li");
    tag.className = "rounded-full px-2 py-0.5 text-[10.5px] font-medium text-white";
    tag.style.backgroundColor = scenicColor(raw);
    tag.textContent = raw;
    tags.append(tag);
  }

  // 言語の切り替え。解説と項目名だけを差し替える（名称は日英とも常に出す）
  const switcher = document.createElement("div");
  switcher.className =
    "mt-2.5 mx-4 inline-flex overflow-hidden rounded-lg border border-line text-[11px]";
  const jaButton = document.createElement("button");
  const enButton = document.createElement("button");
  const body = document.createElement("div");
  body.className = "mt-2 px-4";

  const LABELS = {
    ja: { access: "アクセス", address: "所在地", tel: "電話", link: "関連ページ", none: "解説がありません。" },
    en: { access: "Access", address: "Location", tel: "Tel", link: "Website", none: "No description available." },
  } as const;

  function render(lang: "ja" | "en") {
    const isJa = lang === "ja";
    for (const [button, active] of [[jaButton, isJa], [enButton, !isJa]] as const) {
      button.className = active
        ? "px-2.5 py-1 font-semibold bg-ink text-white"
        : "px-2.5 py-1 font-medium text-ink-sub transition hover:bg-[#f1f2f4]";
      button.setAttribute("aria-pressed", String(active));
    }

    const labels = LABELS[lang];
    body.replaceChildren();

    const text = (isJa ? props.description : props.descriptionEn) ?? "";
    const description = document.createElement("p");
    description.className = text
      ? "text-[12.5px] leading-relaxed text-ink-sub"
      : "text-[12.5px] leading-relaxed text-ink-muted";
    description.textContent = text || labels.none;
    description.lang = lang;
    body.append(description);

    const list = document.createElement("dl");
    list.className = "mt-2 space-y-1 text-[12px] leading-relaxed";
    const addRow = (label: string, value: string) =>
      list.append(popupRow(label, value, "w-[4.5rem]"));
    // アクセス方法は 100 件中 73 件にしか無い。無い項目は行ごと出さない
    if (props.access) addRow(labels.access, props.access);
    if (props.address) addRow(labels.address, props.address);
    if (props.tel) addRow(labels.tel, props.tel);
    if (list.childElementCount > 0) body.append(list);

    if (props.url) {
      const link = document.createElement("a");
      link.href = props.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.className =
        "mt-2 inline-block text-[12px] font-medium text-ink underline decoration-line underline-offset-2 transition hover:decoration-ink";
      link.textContent = labels.link;
      body.append(link);
    }
  }

  jaButton.type = "button";
  jaButton.textContent = "日本語";
  jaButton.addEventListener("click", () => render("ja"));
  enButton.type = "button";
  enButton.textContent = "English";
  enButton.addEventListener("click", () => render("en"));
  switcher.append(jaButton, enButton);

  const footer = navFooter({ name: spotName, coords, kind: SCENIC_LABEL, color }, onNavigate);

  render("ja");
  body.classList.add("pb-3");
  // 写真があるスポットだけ先頭に帯を足す。無ければ今までどおりの並び
  const photo = scenicPhoto(props.name);
  if (photo) scroll.append(buildScenicPhoto(photo, props.name ?? "この場所"));
  scroll.append(head, name, nameEn, tags, switcher, body);
  root.append(scroll, footer);
  return root;
}

export default function MapView({
  data,
  visible,
  hazardVisible,
  hazardOpacity,
  origin,
  route,
  pickMode,
  onPickOrigin,
  onNavigate,
  scenic,
  scenicVisible,
  reports,
  reportVisible,
  selectedReportId,
  floodAlert,
  onSelectReport,
  focus,
  onGeolocate,
  panel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false);

  // イベントハンドラは地図の生成時に 1 度だけ登録するので、
  // そこから見える props は ref 経由にして常に最新を読む。
  const latest = useRef({ pickMode, onPickOrigin, onNavigate, onSelectReport, onGeolocate, panel });
  useEffect(() => {
    latest.current = { pickMode, onPickOrigin, onNavigate, onSelectReport, onGeolocate, panel };
  });

  // ---- 地図の生成（マウント時に 1 度だけ）----
  useEffect(() => {
    let disposed = false;

    (async () => {
      // maplibre-gl はブラウザ専用なので、サーバ側で評価されないよう動的に読み込む。
      // v6 で default export が無くなったので名前空間ごと受け取る。
      const maplibregl = await import("maplibre-gl");
      if (disposed || !containerRef.current) return;

      // v6 の worker はバンドラ経由だと自力で自分の場所を見つけられない。
      // public/maplibre/ に置いたものを使わせる（scripts/copy-maplibre-worker.mjs が配置）。
      // これを忘れると、背景地図は出るのに GeoJSON が永久に読み込み中になる。
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: basemapStyle,
        // 地図のコントロールも日本語にする。既定は英語で、画面のほかの部分と
        // 言葉が混ざる（読み上げにもそのまま出る）
        locale: {
          "NavigationControl.ZoomIn": "拡大",
          "NavigationControl.ZoomOut": "縮小",
          "GeolocateControl.FindMyLocation": "現在地を表示",
          "GeolocateControl.LocationNotAvailable": "現在地を取得できません",
        },
        center: ICHIKAWA_CENTER,
        zoom: INITIAL_ZOOM,
        // 回転すると北がどちらか分からなくなるので、傾け・回転は無効にする
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: false,
      });
      mapRef.current = map;
      map.touchZoomRotate.disableRotation();

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // 現在地ボタン。**MapLibre の GeolocateControl をそのまま使う**ので、
      // 位置情報を拒否されたときはコントロール自身がボタンを無効にする（＝静かに使えなくなる）。
      // 取れた位置は徒歩ナビの出発地点として使い回す。
      const geolocate = new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true, timeout: 10_000 },
        // 追従は切る。歩きながら使う想定ではなく、1 回寄せられれば足りる
        trackUserLocation: false,
        showAccuracyCircle: true,
      });
      map.addControl(geolocate, "top-right");
      geolocate.on("geolocate", (event) => {
        const coords = (event as unknown as GeolocationPosition).coords;
        latest.current.onGeolocate([coords.longitude, coords.latitude]);
      });
      // Evented は error に聞き手がいないとコンソールへ吐くので、明示的に受けて黙らせる。
      // 画面に出すことは何もない（ボタンが無効になるので、押せないこと自体が答え）
      geolocate.on("error", () => {});

      map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: [GSI_ATTRIBUTION, ...MAP_ATTRIBUTION],
        }),
        "bottom-right",
      );

      map.on("load", () => {
        if (disposed) return;

        /** 点の上に来たらカーソルを指の形にする。
         *  **場所を指定してもらっている最中は変えない**（そちらは十字のまま）。 */
        const bindPointerCursor = (layerId: string) => {
          map.on("mouseenter", layerId, () => {
            if (!latest.current.pickMode) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = latest.current.pickMode ? "crosshair" : "";
          });
        };

        /** ポップアップを開く。**開いていたものは必ず閉じる**（2 つ並ばないように）。 */
        const openPopup = (coords: LngLat, content: HTMLElement) => {
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({
            offset: 14,
            maxWidth: "none",
            closeButton: true,
          })
            .setLngLat(coords)
            .setDOMContent(content)
            .addTo(map);
        };

        // ハザードの重ねは背景地図のすぐ上（経路と施設の点より下）に敷く。
        // 想定区域が無い場所のタイルは 404 になるが、MapLibre は黙って描かないだけなので
        // エラー処理は要らない。「白紙 = 危険なし」ではないことは凡例の注意書きで伝える。
        for (const hazard of HAZARDS) {
          map.addSource(hazardSourceId(hazard.id), {
            type: "raster",
            tiles: [hazard.tiles],
            tileSize: 256,
            minzoom: hazard.minzoom,
            maxzoom: hazard.maxzoom,
          });
          map.addLayer({
            id: hazardLayerId(hazard.id),
            type: "raster",
            source: hazardSourceId(hazard.id),
            // 引きすぎた縮尺では描かない（タイルの要求も止まる）
            minzoom: HAZARD_RENDER_MINZOOM,
            layout: { visibility: hazardVisible[hazard.id] ? "visible" : "none" },
            paint: {
              "raster-opacity": hazardOpacity[hazard.id],
              // 浸水深は段階ごとの色なので、拡大時に中間色を作らせない
              "raster-resampling": "nearest",
            },
          });
        }

        // 経路は施設の点より下に敷く（点が線に隠れないように）
        map.addSource("route-line", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route-line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": 12 },
        });
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route-line",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#16181d", "line-width": 5 },
        });

        for (const layer of LAYERS) {
          map.addSource(layer.id, { type: "geojson", data: data[layer.id] });
          map.addLayer({
            id: pointLayerId(layer.id),
            type: "circle",
            source: layer.id,
            layout: { visibility: visible[layer.id] ? "visible" : "none" },
            paint: {
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 3, 13, 5, 16, 8.5, 18, 12,
              ],
              "circle-color": layer.color,
              "circle-opacity": 0.9,
              "circle-stroke-width": 1.2,
              "circle-stroke-color": "#ffffff",
            },
          });

          map.on("click", pointLayerId(layer.id), (event: MapLayerMouseEvent) => {
            if (latest.current.pickMode) return; // 出発地点の指定が優先
            const feature = event.features?.[0];
            if (!feature) return;
            const coords = (feature.geometry as Point).coordinates as LngLat;
            openPopup(
              coords,
              buildPopup(layer, feature.properties as FacilityProps, coords, (destination) =>
                latest.current.onNavigate(destination),
              ),
            );
          });

          bindPointerCursor(pointLayerId(layer.id));
        }

        // 景観スポット（F-5）。施設の点より上、投稿より下に置く。
        // **塗りを白・縁をカテゴリ色の太線**にして、施設の点（色の塗り + 白い細縁）とは
        // 色ではなく形で見分けられるようにする。読み込みは非同期なので空で作る。
        map.addSource(SCENIC_SOURCE, { type: "geojson", data: EMPTY });
        map.addLayer({
          id: SCENIC_POINT_LAYER,
          type: "circle",
          source: SCENIC_SOURCE,
          layout: { visibility: scenicVisible ? "visible" : "none" },
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 4, 13, 6.5, 16, 10, 18, 13.5,
            ],
            "circle-color": "#ffffff",
            "circle-opacity": 0.95,
            "circle-stroke-width": [
              "interpolate", ["linear"], ["zoom"],
              10, 2, 13, 2.6, 16, 3.4, 18, 4,
            ],
            "circle-stroke-color": scenicColorExpression() as never,
          },
        });

        map.on("click", SCENIC_POINT_LAYER, (event: MapLayerMouseEvent) => {
          if (latest.current.pickMode) return; // 出発地点・投稿位置の指定が優先
          const feature = event.features?.[0];
          if (!feature) return;
          const coords = (feature.geometry as Point).coordinates as LngLat;
          openPopup(
            coords,
            buildScenicPopup(feature.properties as ScenicProps, coords, (destination) =>
              latest.current.onNavigate(destination),
            ),
          );
        });
        bindPointerCursor(SCENIC_POINT_LAYER);

        // 住民・行政の投稿。施設の点より上に置き、**白い縁取り + 濃い輪郭**で
        // オープンデータの点（白い細縁）と見分けられるようにする。
        map.addSource(REPORT_SOURCE, { type: "geojson", data: reports });
        // 注意案内（F-4）のとき、過去の浸水報告に輪を描いて位置を分かるようにする。
        // **予測ではない**ので、危険を煽る赤ではなく浸水カテゴリと同じ色を使う。
        map.addLayer({
          id: REPORT_ALERT_LAYER,
          type: "circle",
          source: REPORT_SOURCE,
          filter: ["==", ["get", "category"], "flood"] as never,
          layout: { visibility: "none" },
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 13, 13, 18, 16, 26, 18, 34,
            ],
            "circle-color": "#56b4e9",
            "circle-opacity": 0.18,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#56b4e9",
            "circle-stroke-opacity": 0.65,
          },
        });
        map.addLayer({
          id: REPORT_HALO_LAYER,
          type: "circle",
          source: REPORT_SOURCE,
          filter: reportFilterExpression(reportVisible) as never,
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 6, 13, 8.5, 16, 12.5, 18, 16,
            ],
            "circle-color": reportHaloColorExpression() as never,
            "circle-opacity": 0.95,
          },
        });
        map.addLayer({
          id: REPORT_POINT_LAYER,
          type: "circle",
          source: REPORT_SOURCE,
          filter: reportFilterExpression(reportVisible) as never,
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 4, 13, 6, 16, 9.5, 18, 13,
            ],
            "circle-color": reportColorExpression() as never,
            "circle-stroke-width": reportStrokeExpression(selectedReportId) as never,
            "circle-stroke-color": "#16181d",
          },
        });

        map.on("click", REPORT_POINT_LAYER, (event: MapLayerMouseEvent) => {
          if (latest.current.pickMode) return; // 出発地点・投稿位置の指定が優先
          const feature = event.features?.[0];
          const id = feature?.properties?.id;
          if (typeof id !== "number" && typeof id !== "string") return;
          popupRef.current?.remove();
          latest.current.onSelectReport(Number(id));
        });
        bindPointerCursor(REPORT_POINT_LAYER);

        // 出発地点と目的地。色ではなく塗りの向き（濃/白）で見分けられるようにする
        map.addSource("route-points", { type: "geojson", data: EMPTY });
        map.addLayer({
          id: "route-points",
          type: "circle",
          source: "route-points",
          paint: {
            "circle-radius": 8,
            "circle-color": ["match", ["get", "role"], "origin", "#16181d", "#ffffff"],
            "circle-stroke-width": 3,
            "circle-stroke-color": ["match", ["get", "role"], "origin", "#ffffff", "#16181d"],
          },
        });

        map.setPadding(overlayPadding(latest.current.panel));
        setReady(true);
      });

      map.on("resize", () => map.setPadding(overlayPadding(latest.current.panel)));

      map.on("click", (event: MapMouseEvent) => {
        if (!latest.current.pickMode) return;
        latest.current.onPickOrigin([event.lngLat.lng, event.lngLat.lat]);
      });
    })();

    return () => {
      disposed = true;
      popupRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // データは初回に渡ってきたものを使い続ける（読み直しが起きない設計）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 操作パネルの大きさに合わせて余白を更新 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPadding(overlayPadding(panel));
  }, [ready, panel]);

  // ---- レイヤーの表示切り替え ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const layer of LAYERS) {
      map.setLayoutProperty(
        pointLayerId(layer.id),
        "visibility",
        visible[layer.id] ? "visible" : "none",
      );
    }
  }, [ready, visible]);

  // ---- ハザードの重ねの表示切り替え ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const hazard of HAZARDS) {
      map.setLayoutProperty(
        hazardLayerId(hazard.id),
        "visibility",
        hazardVisible[hazard.id] ? "visible" : "none",
      );
    }
  }, [ready, hazardVisible]);

  // ---- ハザードの重ねの不透明度 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const hazard of HAZARDS) {
      map.setPaintProperty(hazardLayerId(hazard.id), "raster-opacity", hazardOpacity[hazard.id]);
    }
  }, [ready, hazardOpacity]);

  // ---- 景観スポットの中身（読み込みが終わってから届く）----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setSourceData(map, SCENIC_SOURCE, scenic ?? EMPTY);
  }, [ready, scenic]);

  // ---- 景観スポットの表示切り替え ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setLayoutProperty(SCENIC_POINT_LAYER, "visibility", scenicVisible ? "visible" : "none");
  }, [ready, scenicVisible]);

  // ---- 投稿の中身 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setSourceData(map, REPORT_SOURCE, reports);
  }, [ready, reports]);

  // ---- 投稿のカテゴリごとの表示 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const filter = reportFilterExpression(reportVisible) as never;
    map.setFilter(REPORT_HALO_LAYER, filter);
    map.setFilter(REPORT_POINT_LAYER, filter);
  }, [ready, reportVisible]);

  // ---- 注意案内（F-4）の輪 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    // 浸水のピン自体を消しているときは輪も出さない（地図の情報が食い違わないように）
    const show = floodAlert && reportVisible.flood;
    map.setLayoutProperty(REPORT_ALERT_LAYER, "visibility", show ? "visible" : "none");
  }, [ready, floodAlert, reportVisible]);

  // ---- 詳細パネルで開いている投稿の強調 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty(
      REPORT_POINT_LAYER,
      "circle-stroke-width",
      reportStrokeExpression(selectedReportId) as never,
    );
  }, [ready, selectedReportId]);

  // ---- 指定された地点へ寄せる（投稿一覧から開いたときなど）----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.easeTo({ center: focus.coords, zoom: Math.max(map.getZoom(), 15), duration: 700 });
  }, [ready, focus]);

  // ---- 経路と、出発地点・目的地の点 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    setSourceData(
      map,
      "route-line",
      route ? { type: "Feature", geometry: route.geometry, properties: {} } : EMPTY,
    );

    const points: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: [
        ...(origin
          ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: origin }, properties: { role: "origin" } }]
          : []),
        ...(route
          ? [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: route.destination.coords }, properties: { role: "destination" } }]
          : []),
      ],
    };
    setSourceData(map, "route-points", points);

    if (route) {
      const coords = (route.geometry as LineString).coordinates;
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        // 余白は setPadding で地図に伝えてあるので、ここでは線が縁に触れない程度だけ足す
        { padding: 48, maxZoom: 16, duration: 700 },
      );
    }
  }, [ready, route, origin]);

  // ---- 出発地点の指定モード ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getCanvas().style.cursor = pickMode ? "crosshair" : "";
    if (pickMode) popupRef.current?.remove();
  }, [ready, pickMode]);

  // maplibre-gl.css が .maplibregl-map に position: relative を当てるので、
  // absolute inset-0 だと高さが 0 になる。親（h-dvh）に対して h-full で広げる。
  return <div ref={containerRef} className="h-full w-full" aria-label="市川市の地図" />;
}
