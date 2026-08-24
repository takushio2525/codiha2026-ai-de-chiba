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
import { LAYERS, pointLayerId, type FacilityProps, type LayerDef, type LayerId } from "@/lib/layers";
import type { RouteTarget, WalkingRoute } from "@/lib/routing";

export type LayerData = Record<LayerId, FeatureCollection<Point, FacilityProps>>;

type Props = {
  data: LayerData;
  visible: Record<LayerId, boolean>;
  origin: LngLat | null;
  route: WalkingRoute | null;
  /** true のあいだは、地図のどこをクリックしても出発地点の指定になる */
  pickMode: boolean;
  onPickOrigin: (point: LngLat) => void;
  onNavigate: (destination: RouteTarget) => void;
  /** 操作パネルの実寸。地図の余白に反映する */
  panel: PanelBox;
};

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

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
  origin,
  route,
  pickMode,
  onPickOrigin,
  onNavigate,
  panel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false);

  // イベントハンドラは地図の生成時に 1 度だけ登録するので、
  // そこから見える props は ref 経由にして常に最新を読む。
  const latest = useRef({ pickMode, onPickOrigin, onNavigate, panel });
  useEffect(() => {
    latest.current = { pickMode, onPickOrigin, onNavigate, panel };
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
