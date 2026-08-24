"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";

import type { SessionView } from "@/lib/auth";
import { nearestDestination, type LngLat } from "@/lib/geo";
import { initialHazardOpacity, initialHazardVisibility, type HazardId } from "@/lib/hazards";
import { LAYERS, type FacilityProps, type LayerId } from "@/lib/layers";
import {
  EMPTY_REPORT_COLLECTION,
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportCollection,
} from "@/lib/reports";
import { fetchReports } from "@/lib/reportsApi";
import { fetchWalkingRoute, type RouteTarget, type WalkingRoute } from "@/lib/routing";
import ControlPanel, { type Busy } from "./ControlPanel";
import MapView, { type LayerData, type PanelBox } from "./MapView";
import ReportForm from "./ReportForm";
import ReportPanel from "./ReportPanel";
import Toast, { type ToastMessage } from "./Toast";

/** 市川市のだいたいの範囲。現在地がここから外れたときに一言添えるために使う。 */
const CITY_BOUNDS = { lat: [35.58, 35.84], lng: [139.82, 140.04] } as const;

/** P3 で投稿できるのは危険箇所（F-2）だけ。浸水（F-3）と観光おすすめ（F-6）は
 *  カテゴリ定義を共有したまま、それぞれ P4・P5 で入り口を足す。 */
const POSTABLE_CATEGORY: ReportCategory = "hazard";

/** 地図の上で何を指定させているか。出発地点と投稿位置で同じクリックを使い分ける。 */
type PickTarget = "origin" | "report";

function initialReportVisibility(): Record<ReportCategory, boolean> {
  return Object.fromEntries(
    REPORT_CATEGORIES.map((category) => [category.id, category.defaultVisible]),
  ) as Record<ReportCategory, boolean>;
}

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

type Props = {
  /** ログイン状態と認証モード（interfaces.md I-8）。サーバー側で 1 回決めたものを受け取る */
  session: SessionView;
  /** 表示する市町村（JIS X 0402 の 5 桁）。全域対応のため定数を埋め込まない */
  cityCode: string;
};

export default function MapExplorer({ session, cityCode }: Props) {
  const [data, setData] = useState<LayerData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [visible, setVisible] = useState<Record<LayerId, boolean>>({
    evacuation: true,
    aed: true,
    childcare: true,
  });
  // ハザードマップ（浸水想定）の重ね。初期値は定義側（lib/hazards.ts）が持つ
  const [hazardVisible, setHazardVisible] =
    useState<Record<HazardId, boolean>>(initialHazardVisibility);
  const [hazardOpacity, setHazardOpacity] =
    useState<Record<HazardId, number>>(initialHazardOpacity);
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [busy, setBusy] = useState<Busy>("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // ---- 投稿（F-2）----
  const [reports, setReports] = useState<ReportCollection>(EMPTY_REPORT_COLLECTION);
  const [reportVisible, setReportVisible] =
    useState<Record<ReportCategory, boolean>>(initialReportVisibility);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  /** 投稿フォームを開いている状態（位置が決まってから開く） */
  const [composing, setComposing] = useState<{ category: ReportCategory; coords: LngLat } | null>(
    null,
  );
  /** 地図を寄せる指示。同じ地点でも押し直せるよう nonce を添える */
  const [focus, setFocus] = useState<{ coords: LngLat; nonce: number } | null>(null);
  const focusNonce = useRef(0);

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

  /** 投稿を読み直す。**DB が落ちていても地図は出す**ので、失敗しても空のまま続ける。 */
  const loadReports = useCallback(
    async (options?: { quiet?: boolean }) => {
      const result = await fetchReports({ city: cityCode });
      if (result.ok) {
        setReports(result.value);
        return;
      }
      if (!options?.quiet) setToast({ kind: "warning", text: result.reason });
    },
    [cityCode],
  );

  useEffect(() => {
    void loadReports({ quiet: true });
  }, [loadReports]);

  // 投稿一覧（/reports）から「地図で見る」で来たときは、その投稿を開く
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("report");
    if (!requested) return;
    const id = Number(requested);
    if (Number.isSafeInteger(id) && id > 0) setSelectedReportId(id);
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
        setPickTarget("origin");
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
        setPickTarget("origin");
        setCollapsed(false);
        setToast({
          kind: "warning",
          text: `${(error as Error).message} 地図をクリックして出発地点を指定してください。`,
        });
      }
    })();
  }, [data, origin, visible, routeFrom, runRoute]);

  /** 地図のクリック。今なにを指定させているかで振り分ける。 */
  const handleMapPick = useCallback(
    (point: LngLat) => {
      if (pickTarget === "report") {
        setPickTarget(null);
        setComposing({ category: POSTABLE_CATEGORY, coords: point });
        return;
      }

      setOrigin(point);
      setPickTarget(null);
      if (!data) return;
      const pending = pendingRef.current;
      pendingRef.current = null;
      const destination = pending ?? toTarget(nearestDestination(point, data, LAYERS, visible));
      if (destination) void runRoute(point, destination);
      else setToast({ kind: "info", text: "出発地点を設定しました。" });
    },
    [pickTarget, data, visible, runRoute],
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

  const toggleHazard = useCallback((id: HazardId) => {
    setHazardVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const changeHazardOpacity = useCallback((id: HazardId, value: number) => {
    setHazardOpacity((prev) => ({ ...prev, [id]: value }));
  }, []);

  const toggleReportCategory = useCallback((id: ReportCategory) => {
    setReportVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /** 投稿の場所を地図で指定してもらう。 */
  const startComposing = useCallback(() => {
    setComposing(null);
    setSelectedReportId(null);
    setPickTarget("report");
    setCollapsed(false);
    setToast({ kind: "info", text: "地図をクリックして、投稿する場所を指定してください。" });
  }, []);

  const locate = useCallback((coords: LngLat) => {
    focusNonce.current += 1;
    setFocus({ coords, nonce: focusNonce.current });
  }, []);

  const reportCounts = REPORT_CATEGORIES.reduce(
    (counts, category) => {
      counts[category.id] = reports.features.filter(
        (feature) => feature.properties.category === category.id,
      ).length;
      return counts;
    },
    {} as Record<ReportCategory, number>,
  );

  return (
    <main className="relative h-full w-full overflow-hidden bg-canvas">
      {data ? (
        <MapView
          data={data}
          visible={visible}
          hazardVisible={hazardVisible}
          hazardOpacity={hazardOpacity}
          origin={origin}
          route={route}
          pickMode={pickTarget !== null}
          onPickOrigin={handleMapPick}
          onNavigate={handleNavigateTo}
          reports={reports}
          reportVisible={reportVisible}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
          focus={focus}
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
          hazardVisible={hazardVisible}
          hazardOpacity={hazardOpacity}
          onToggleHazard={toggleHazard}
          onChangeHazardOpacity={changeHazardOpacity}
          origin={origin}
          pickMode={pickTarget === "origin"}
          onTogglePickMode={() => {
            pendingRef.current = null;
            setPickTarget((prev) => (prev === "origin" ? null : "origin"));
          }}
          onNavigateNearest={handleNavigateNearest}
          busy={busy}
          route={route}
          onClearRoute={() => setRoute(null)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((prev) => !prev)}
          reportCounts={reportCounts}
          reportVisible={reportVisible}
          onToggleReportCategory={toggleReportCategory}
          postableCategory={POSTABLE_CATEGORY}
          canPost={session.user !== null}
          picking={pickTarget === "report"}
          onStartComposing={startComposing}
        />
      ) : null}

      {selectedReportId !== null ? (
        <ReportPanel
          reportId={selectedReportId}
          user={session.user}
          onClose={() => setSelectedReportId(null)}
          onChanged={() => void loadReports({ quiet: true })}
          onDeleted={() => {
            setSelectedReportId(null);
            setToast({ kind: "info", text: "投稿を削除しました。" });
          }}
          onLocate={locate}
        />
      ) : null}

      {composing ? (
        <ReportForm
          category={composing.category}
          coordinates={composing.coords}
          onRepick={() => {
            setComposing(null);
            startComposing();
          }}
          onClose={() => setComposing(null)}
          onSubmitted={(report) => {
            setComposing(null);
            // 投稿したカテゴリが非表示のままだと、投稿が地図に出ない
            setReportVisible((prev) => ({ ...prev, [report.category]: true }));
            setSelectedReportId(report.id);
            setToast({ kind: "info", text: "投稿しました。地図にピンが追加されます。" });
            void loadReports({ quiet: true });
          }}
        />
      ) : null}

      {toast ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-40 mx-auto max-w-md md:left-auto md:right-4 md:mx-0 md:w-[22rem]">
          <Toast toast={toast} onDismiss={() => setToast(null)} />
        </div>
      ) : null}
    </main>
  );
}
