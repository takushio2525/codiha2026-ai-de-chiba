"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";

import type { SessionView } from "@/lib/auth";
import {
  facilityCandidates,
  nearestCandidate,
  scenicCandidates,
  type LngLat,
  type NavCandidate,
} from "@/lib/geo";
import { initialHazardOpacity, type HazardId } from "@/lib/hazards";
import { LAYERS, type FacilityProps, type LayerId } from "@/lib/layers";
import {
  DEFAULT_MAP_MODE,
  hazardVisibilityFor,
  layerVisibilityFor,
  mapModeDef,
  reportVisibilityFor,
  type MapMode,
} from "@/lib/mapModes";
import {
  EMPTY_REPORT_COLLECTION,
  REPORT_CATEGORIES,
  reportCategoryDef,
  type ReportCategory,
  type ReportCollection,
} from "@/lib/reports";
import { fetchReports } from "@/lib/reportsApi";
import { fetchWalkingRoute, type RouteTarget, type WalkingRoute } from "@/lib/routing";
import { SCENIC_FILE, type ScenicProps } from "@/lib/scenic";
import {
  buildFloodAlert,
  fetchWeather,
  type WeatherForecast,
  type WeatherObservation,
} from "@/lib/weather";
import ControlPanel, { type Busy } from "./ControlPanel";
import MapView, { type LayerData, type PanelBox } from "./MapView";
import ReportForm from "./ReportForm";
import ReportPanel from "./ReportPanel";
import Toast, { type ToastMessage } from "./Toast";

/** 市川市のだいたいの範囲。現在地がここから外れたときに一言添えるために使う。 */
const CITY_BOUNDS = { lat: [35.58, 35.84], lng: [139.82, 140.04] } as const;

/** 地図の上で何を指定させているか。出発地点と投稿位置で同じクリックを使い分ける。
 *  投稿のときは、どのカテゴリで投稿しようとしているかも一緒に覚えておく。 */
type PickTarget = { kind: "origin" } | { kind: "report"; category: ReportCategory };

function inCity([lng, lat]: LngLat): boolean {
  return (
    lat >= CITY_BOUNDS.lat[0] && lat <= CITY_BOUNDS.lat[1] &&
    lng >= CITY_BOUNDS.lng[0] && lng <= CITY_BOUNDS.lng[1]
  );
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
  /** 最初のモード（S-1 防災 / S-2 観光）。URL の `?mode=` をサーバー側で読んだもの */
  initialMode: MapMode;
};

export default function MapExplorer({ session, cityCode, initialMode }: Props) {
  // 地図のモード（S-1 防災 / S-2 観光）。表示するレイヤーの組の既定が変わる
  const [mode, setMode] = useState<MapMode>(initialMode);
  const [data, setData] = useState<LayerData | null>(null);
  const [dataError, setDataError] = useState(false);
  const [visible, setVisible] = useState<Record<LayerId, boolean>>(() =>
    layerVisibilityFor(initialMode),
  );
  // ハザードマップ（浸水想定）の重ね。防災モードは lib/hazards.ts の既定、観光モードは全部 OFF
  const [hazardVisible, setHazardVisible] = useState<Record<HazardId, boolean>>(() =>
    hazardVisibilityFor(initialMode),
  );
  const [hazardOpacity, setHazardOpacity] =
    useState<Record<HazardId, number>>(initialHazardOpacity);
  // 景観スポット（F-5）。読み込めなくても地図と他のレイヤーは出す（interfaces.md I-1）
  const [scenic, setScenic] = useState<FeatureCollection<Point, ScenicProps> | null>(null);
  const [scenicVisible, setScenicVisible] = useState(() => mapModeDef(initialMode).scenic);
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [busy, setBusy] = useState<Busy>("idle");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // ---- 投稿（F-2）----
  const [reports, setReports] = useState<ReportCollection>(EMPTY_REPORT_COLLECTION);
  const [reportVisible, setReportVisible] = useState<Record<ReportCategory, boolean>>(() =>
    reportVisibilityFor(initialMode),
  );
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  /** 投稿フォームを開いている状態（位置が決まってから開く） */
  const [composing, setComposing] = useState<{ category: ReportCategory; coords: LngLat } | null>(
    null,
  );
  // ---- 気象と注意案内（F-3・F-4）----
  /** 気象庁の実況と予報（I-6）。取れなくても地図は動かすので null のまま進める */
  const [weather, setWeather] =
    useState<{ observation: WeatherObservation | null; forecast: WeatherForecast | null } | null>(
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

  // 景観スポットは施設レイヤーとは別に読む。**片方が落ちてももう片方は出す**（I-1）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SCENIC_FILE);
        if (!res.ok) throw new Error(SCENIC_FILE);
        const collection = (await res.json()) as FeatureCollection<Point, ScenicProps>;
        if (!cancelled) setScenic(collection);
      } catch {
        // 読めなければ景観スポットだけ出さない。地図も他のレイヤーもそのまま動く
        if (!cancelled) setScenic(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

    /** 投稿を読み直す。**DB が落ちていても地図と静的レイヤーは出す**ので、
   *  失敗しても投稿が空のまま続ける（interfaces.md I-3）。
   *  ただし**黙っては捨てない**。0 件なのか読めなかったのかが分からないと誤解を生む。 */
  const loadReports = useCallback(async () => {
    const result = await fetchReports({ city: cityCode });
    if (result.ok) {
      setReports(result.value);
      return;
    }
    setToast({ kind: "warning", text: result.reason });
  }, [cityCode]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  /** 気象情報は地図を開いたときに 1 回だけ取る（.agent/architecture.md の F-4 の流れ）。
   *  **取れなくても黙って進む**。注意案内が出ないだけで、地図も投稿も動く。 */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchWeather(cityCode);
      if (cancelled || !result.ok) return;
      setWeather({ observation: result.observation, forecast: result.forecast });
    })();
    return () => { cancelled = true; };
  }, [cityCode]);

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

  /** 徒歩ナビの候補。**表示中の施設レイヤーと景観スポットを同じ土俵に並べる**ので、
   *  観光モードで施設を全部外していても「最寄りの地点へ」が使える。 */
  const navCandidates: NavCandidate[] = useMemo(
    () => [
      ...(data ? facilityCandidates(data, LAYERS, visible) : []),
      ...scenicCandidates(scenic, scenicVisible),
    ],
    [data, visible, scenic, scenicVisible],
  );

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
        setPickTarget({ kind: "origin" });
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
    const from = origin;
    if (from) {
      void routeFrom(nearestCandidate(from, navCandidates));
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
        const target = nearestCandidate(here, navCandidates);
        if (!target) {
          setToast({ kind: "info", text: "表示中のデータに地点がありません。" });
          return;
        }
        await runRoute(here, target);
      } catch (error) {
        setBusy("idle");
        pendingRef.current = null;   // 最寄りは出発地点が決まってから選び直す
        setPickTarget({ kind: "origin" });
        setCollapsed(false);
        setToast({
          kind: "warning",
          text: `${(error as Error).message} 地図をクリックして出発地点を指定してください。`,
        });
      }
    })();
  }, [origin, navCandidates, routeFrom, runRoute]);

  /** 地図のクリック。今なにを指定させているかで振り分ける。 */
  const handleMapPick = useCallback(
    (point: LngLat) => {
      if (pickTarget?.kind === "report") {
        const category = pickTarget.category;
        setPickTarget(null);
        setComposing({ category, coords: point });
        return;
      }

      setOrigin(point);
      setPickTarget(null);
      const pending = pendingRef.current;
      pendingRef.current = null;
      const destination = pending ?? nearestCandidate(point, navCandidates);
      if (destination) void runRoute(point, destination);
      else setToast({ kind: "info", text: "出発地点を設定しました。" });
    },
    [pickTarget, navCandidates, runRoute],
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

  const toggleScenic = useCallback(() => {
    setScenicVisible((prev) => !prev);
  }, []);

  /**
   * モードを切り替える（S-1 防災 ⇄ S-2 観光）。
   *
   * 変えるのは**表示している組だけ**で、画面もデータも作り直さない。
   * 開いている詳細パネルと投稿フォームは閉じる（別のモードのものが残ると混乱するため）。
   * URL に `?mode=` を残すので、共有したリンクと再読み込みで同じモードに戻る。
   */
  const changeMode = useCallback((next: MapMode) => {
    setMode(next);
    setVisible(layerVisibilityFor(next));
    setHazardVisible(hazardVisibilityFor(next));
    setReportVisible(reportVisibilityFor(next));
    setScenicVisible(mapModeDef(next).scenic);
    setSelectedReportId(null);
    setComposing(null);
    setPickTarget(null);

    const url = new URL(window.location.href);
    if (next === DEFAULT_MAP_MODE) url.searchParams.delete("mode");
    else url.searchParams.set("mode", next);
    window.history.replaceState(null, "", url);
  }, []);

  /** 投稿の場所を地図で指定してもらう。カテゴリはここで決まる。 */
  const startComposing = useCallback((category: ReportCategory) => {
    setComposing(null);
    setSelectedReportId(null);
    setPickTarget({ kind: "report", category });
    setCollapsed(false);
    setToast({
      kind: "info",
      text: `地図をクリックして、${reportCategoryDef(category).label}を投稿する場所を指定してください。`,
    });
  }, []);

  const locate = useCallback((coords: LngLat) => {
    focusNonce.current += 1;
    setFocus({ coords, nonce: focusNonce.current });
  }, []);

  /** F-4 の注意案内。**過去の浸水報告と気象庁の予報という事実を 2 つ並べるだけ**で、
   *  浸水を予測しているわけではない（docs/design/requirements.md 3-1）。 */
  const floodAlert = buildFloodAlert(
    weather?.forecast ?? null,
    reports.features
      .filter((feature) => feature.properties.category === "flood")
      .map((feature) => feature.properties.createdAt),
  );

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
          scenic={scenic}
          scenicVisible={scenicVisible}
          reports={reports}
          reportVisible={reportVisible}
          floodAlert={floodAlert !== null}
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
          mode={mode}
          onChangeMode={changeMode}
          counts={Object.fromEntries(
            LAYERS.map((layer) => [layer.id, data[layer.id].features.length]),
          ) as Record<LayerId, number>}
          visible={visible}
          onToggleLayer={toggleLayer}
          scenicCount={scenic?.features.length ?? 0}
          scenicVisible={scenicVisible}
          onToggleScenic={toggleScenic}
          hazardVisible={hazardVisible}
          hazardOpacity={hazardOpacity}
          onToggleHazard={toggleHazard}
          onChangeHazardOpacity={changeHazardOpacity}
          origin={origin}
          pickMode={pickTarget?.kind === "origin"}
          onTogglePickMode={() => {
            pendingRef.current = null;
            setPickTarget((prev) => (prev?.kind === "origin" ? null : { kind: "origin" }));
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
          postableCategories={mapModeDef(mode).postable}
          canPost={session.user !== null}
          picking={pickTarget?.kind === "report" ? pickTarget.category : null}
          onStartComposing={startComposing}
          floodAlert={floodAlert}
          observation={weather?.observation ?? null}
        />
      ) : null}

      {selectedReportId !== null ? (
        <ReportPanel
          reportId={selectedReportId}
          user={session.user}
          onClose={() => setSelectedReportId(null)}
          onChanged={() => void loadReports()}
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
            startComposing(composing.category);
          }}
          onClose={() => setComposing(null)}
          onSubmitted={(report) => {
            setComposing(null);
            // 投稿したカテゴリが非表示のままだと、投稿が地図に出ない
            setReportVisible((prev) => ({ ...prev, [report.category]: true }));
            setSelectedReportId(report.id);
            setToast({ kind: "info", text: "投稿しました。地図にピンが追加されます。" });
            void loadReports();
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
