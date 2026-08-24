"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";

import { nearestDestination, type LngLat } from "@/lib/geo";
import { LAYERS, type FacilityProps, type LayerId } from "@/lib/layers";
import { fetchWalkingRoute, type RouteTarget, type WalkingRoute } from "@/lib/routing";
import ControlPanel, { type Busy } from "./ControlPanel";
import MapView, { type LayerData, type PanelBox } from "./MapView";
import Toast, { type ToastMessage } from "./Toast";

/** 市川市のだいたいの範囲。現在地がここから外れたときに一言添えるために使う。 */
const CITY_BOUNDS = { lat: [35.58, 35.84], lng: [139.82, 140.04] } as const;

function inCity([lng, lat]: LngLat): boolean {
  return (
    lat >= CITY_BOUNDS.lat[0] && lat <= CITY_BOUNDS.lat[1] &&
    lng >= CITY_BOUNDS.lng[0] && lng <= CITY_BOUNDS.lng[1]
  );
}

/** 最寄り地点の探索結果を、経路の目的地に変換する。 */
function toTarget(nearest: ReturnType<typeof nearestDestination>): RouteTarget | null {
  return nearest
    ? { name: nearest.name, coords: nearest.coords, kind: nearest.layer.label, color: nearest.layer.color }
    : null;
}

function currentPosition(): Promise<LngLat> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("この環境では位置情報を取得できません。"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
      (err) => reject(new Error(
        err.code === err.PERMISSION_DENIED
          ? "位置情報の利用が許可されませんでした。"
          : "現在地を取得できませんでした。",
      )),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

export default function MapExplorer() {
  const [data, setData] = useState<LayerData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [visible, setVisible] = useState<Record<LayerId, boolean>>({
    evacuation: true,
    aed: true,
    childcare: true,
  });
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [pickMode, setPickMode] = useState(false);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [busy, setBusy] = useState<Busy>("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // 操作パネルは地図に重なっている。実寸を測って地図の余白に渡し、
  // 初期表示も経路のフィットも「パネルに隠れていない範囲」にそろえる。
  const panelRef = useRef<HTMLElement>(null);
  const [panel, setPanel] = useState<PanelBox>({ width: 0, height: 0 });

  // 出発地点が未確定のまま「ここへナビ」を押されたときに覚えておく目的地
  const pendingRef = useRef<RouteTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await Promise.all(
          LAYERS.map(async (layer) => {
            const res = await fetch(layer.file);
            if (!res.ok) throw new Error(layer.file);
            return [layer.id, (await res.json()) as FeatureCollection<Point, FacilityProps>] as const;
          }),
        );
        if (!cancelled) setData(Object.fromEntries(loaded) as LayerData);
      } catch {
        if (!cancelled) setDataError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setPanel((prev) =>
        Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1
          ? prev
          : { width: rect.width, height: rect.height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [data]);

  // 通知は放っておくと邪魔になるので、しばらくしたら自分で消える
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7_000);
    return () => clearTimeout(timer);
  }, [toast]);

  const runRoute = useCallback(async (from: LngLat, destination: RouteTarget) => {
    setBusy("routing");
    try {
      const result = await fetchWalkingRoute(from, destination);
      setRoute(result);
      if (result.estimated) {
        setToast({ kind: "warning", text: `${result.note} 直線距離の概算を表示しています。` });
      }
    } finally {
      setBusy("idle");
    }
  }, []);

  /** 出発地点を用意してから経路を引く。取れなければ地図クリックでの指定に切り替える。 */
  const routeFrom = useCallback(
    async (destination: RouteTarget | null) => {
      if (!destination) {
        setToast({ kind: "info", text: "表示中のデータに地点がありません。" });
        return;
      }
      if (origin) {
        await runRoute(origin, destination);
        return;
      }
      setBusy("locating");
      try {
        const here = await currentPosition();
        setOrigin(here);
        setBusy("idle");
        if (!inCity(here)) {
          setToast({
            kind: "info",
            text: "現在地が市川市の外にあります。市内から試すときは「出発地点を地図で指定する」を使ってください。",
          });
        }
        await runRoute(here, destination);
      } catch (error) {
        setBusy("idle");
        pendingRef.current = destination;
        setPickMode(true);
        setCollapsed(false);
        setToast({
          kind: "warning",
          text: `${(error as Error).message} 地図をクリックして出発地点を指定してください。`,
        });
      }
    },
    [origin, runRoute],
  );

  const handleNavigateNearest = useCallback(() => {
    if (!data) return;
    const from = origin;
    if (from) {
      void routeFrom(toTarget(nearestDestination(from, data, LAYERS, visible)));
      return;
    }
    // 出発地点が無い場合は、位置情報を取ってから最寄りを決め直す必要がある。
    // 目的地は routeFrom の中では決められないので、ここで位置情報を先に取る。
    (async () => {
      setBusy("locating");
      try {
        const here = await currentPosition();
        setOrigin(here);
        setBusy("idle");
        if (!inCity(here)) {
          setToast({
            kind: "info",
            text: "現在地が市川市の外にあります。市内から試すときは「出発地点を地図で指定する」を使ってください。",
          });
        }
        const target = toTarget(nearestDestination(here, data, LAYERS, visible));
        if (!target) {
          setToast({ kind: "info", text: "表示中のデータに地点がありません。" });
          return;
        }
        await runRoute(here, target);
      } catch (error) {
        setBusy("idle");
        pendingRef.current = null;   // 最寄りは出発地点が決まってから選び直す
        setPickMode(true);
        setCollapsed(false);
        setToast({
          kind: "warning",
          text: `${(error as Error).message} 地図をクリックして出発地点を指定してください。`,
        });
      }
    })();
  }, [data, origin, visible, routeFrom, runRoute]);

  const handlePickOrigin = useCallback(
    (point: LngLat) => {
      setOrigin(point);
      setPickMode(false);
      if (!data) return;
      const pending = pendingRef.current;
      pendingRef.current = null;
      const destination = pending ?? toTarget(nearestDestination(point, data, LAYERS, visible));
      if (destination) void runRoute(point, destination);
      else setToast({ kind: "info", text: "出発地点を設定しました。" });
    },
    [data, visible, runRoute],
  );

  const handleNavigateTo = useCallback(
    (destination: RouteTarget) => {
      setCollapsed(false);
      void routeFrom(destination);
    },
    [routeFrom],
  );

  const toggleLayer = useCallback((id: LayerId) => {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-canvas">
      {data ? (
        <MapView
          data={data}
          visible={visible}
          origin={origin}
          route={route}
          pickMode={pickMode}
          onPickOrigin={handlePickOrigin}
          onNavigate={handleNavigateTo}
          panel={panel}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-[13px] text-ink-muted">
            {dataError
              ? "オープンデータの読み込みに失敗しました。ページを再読み込みしてください。"
              : "オープンデータを読み込んでいます…"}
          </p>
        </div>
      )}

      {data ? (
        <ControlPanel
          ref={panelRef}
          counts={Object.fromEntries(
            LAYERS.map((layer) => [layer.id, data[layer.id].features.length]),
          ) as Record<LayerId, number>}
          visible={visible}
          onToggleLayer={toggleLayer}
          origin={origin}
          pickMode={pickMode}
          onTogglePickMode={() => {
            pendingRef.current = null;
            setPickMode((prev) => !prev);
          }}
          onNavigateNearest={handleNavigateNearest}
          busy={busy}
          route={route}
          onClearRoute={() => setRoute(null)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((prev) => !prev)}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 mx-auto max-w-md md:left-auto md:right-4 md:mx-0 md:w-[22rem]">
          <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </main>
  );
}
