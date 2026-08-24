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
import type { LngLat } from "@/lib/geo";
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
  /** 操作パネルの実寸。地図の余白に反映する */
  panel: PanelBox;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** 投稿のソースとレイヤー。施設の点とは別に持つ（色と形を変えて区別するため）。 */
const REPORT_SOURCE = "reports";
const REPORT_HALO_LAYER = "report-halo";
const REPORT_POINT_LAYER = "report-points";
/** 注意案内（F-4）のとき、過去の浸水報告の地点に描く輪。点の下に敷く */
const REPORT_ALERT_LAYER = "report-flood-alert";

/** カテゴリごとの色。定義は lib/reports.ts が正本。 */
function reportColorExpression(): unknown[] {
  const expression: unknown[] = ["match", ["get", "category"]];
  for (const category of REPORT_CATEGORIES) expression.push(category.id, category.color);
  expression.push("#7b818b"); // 知らないカテゴリ（将来の追加）は灰色で出す
  return expression;
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

/** ポップアップの中身を組み立てる。値は textContent で入れるので中身がそのまま表示される。 */
function buildPopup(
  layer: LayerDef,
  props: FacilityProps,
  coords: LngLat,
  onNavigate: Props["onNavigate"],
): HTMLElement {
  const root = document.createElement("div");
  root.className = "w-[16.5rem] max-w-[80vw] text-ink";

  const head = document.createElement("div");
  head.className = "flex items-center gap-2 px-4 pt-3.5 pb-1";
  const chip = document.createElement("span");
  chip.className = "size-2.5 shrink-0 rounded-full";
  chip.style.backgroundColor = layer.color;
  const kind = document.createElement("span");
  kind.className = "text-[11px] font-medium tracking-wide text-ink-muted";
  kind.textContent = layer.label;
  head.append(chip, kind);

  const name = document.createElement("h3");
  name.className = "px-4 text-[15px] leading-snug font-semibold text-ink";
  name.textContent = props.name ?? "名称不明の地点";

  const body = document.createElement("dl");
  body.className = "mt-2 space-y-1 px-4 text-[12.5px] leading-relaxed";

  const addRow = (label: string, value: string) => {
    const row = document.createElement("div");
    row.className = "flex gap-2";
    const dt = document.createElement("dt");
    dt.className = "w-[5.5rem] shrink-0 text-ink-muted";
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.className = "flex-1 text-ink-sub break-words";
    dd.textContent = value;
    row.append(dt, dd);
    body.append(row);
  };

  if (props.address) addRow("所在地", props.address);
  for (const field of layer.popupFields) {
    const raw = props[field.key];
    const value = Array.isArray(raw) ? raw.join("、") : raw;
    if (value) addRow(field.label, String(value));
  }

  const footer = document.createElement("div");
  footer.className = "mt-3 border-t border-line bg-[#fafafa] px-4 py-2.5";
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "w-full rounded-lg bg-ink px-3 py-2 text-[12.5px] font-semibold text-white " +
    "transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  button.textContent = "ここへナビ";
  button.addEventListener("click", () => {
    onNavigate({
      name: props.name ?? "名称不明の地点",
      coords,
      kind: layer.label,
      color: layer.color,
    });
  });
  footer.append(button);

  root.append(head, name, body, footer);
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
  reports,
  reportVisible,
  selectedReportId,
  floodAlert,
  onSelectReport,
  focus,
  panel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false);

  // イベントハンドラは地図の生成時に 1 度だけ登録するので、
  // そこから見える props は ref 経由にして常に最新を読む。
  const latest = useRef({ pickMode, onPickOrigin, onNavigate, onSelectReport, panel });
  useEffect(() => {
    latest.current = { pickMode, onPickOrigin, onNavigate, onSelectReport, panel };
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
            popupRef.current?.remove();
            popupRef.current = new maplibregl.Popup({
              offset: 14,
              maxWidth: "none",
              closeButton: true,
            })
              .setLngLat(coords)
              .setDOMContent(
                buildPopup(layer, feature.properties as FacilityProps, coords, (destination) =>
                  latest.current.onNavigate(destination),
                ),
              )
              .addTo(map);
          });

          map.on("mouseenter", pointLayerId(layer.id), () => {
            if (!latest.current.pickMode) map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", pointLayerId(layer.id), () => {
            map.getCanvas().style.cursor = latest.current.pickMode ? "crosshair" : "";
          });
        }

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
            "circle-color": "#ffffff",
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
        map.on("mouseenter", REPORT_POINT_LAYER, () => {
          if (!latest.current.pickMode) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", REPORT_POINT_LAYER, () => {
          map.getCanvas().style.cursor = latest.current.pickMode ? "crosshair" : "";
        });

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

  // ---- 投稿の中身 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource(REPORT_SOURCE) as { setData: (d: unknown) => void } | undefined;
    source?.setData(reports);
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

    const line = map.getSource("route-line") as { setData: (d: unknown) => void } | undefined;
    line?.setData(route ? ({ type: "Feature", geometry: route.geometry, properties: {} }) : EMPTY);

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
    const marks = map.getSource("route-points") as { setData: (d: unknown) => void } | undefined;
    marks?.setData(points);

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
