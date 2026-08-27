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
import { EMPTY_RANGE, hasRange, type DateRange } from "@/lib/reportRange";
import { fetchReports } from "@/lib/reportsApi";
import { fetchWalkingRoute, type RouteTarget, type WalkingRoute } from "@/lib/routing";
import { SCENIC_FILE, SCENIC_LABEL, scenicColor, type ScenicProps } from "@/lib/scenic";
import { normalizeSearch, searchMatches } from "@/lib/searchText";
import {
  buildFloodAlert,
  fetchWeather,
  type WeatherForecast,
  type WeatherObservation,
} from "@/lib/weather";
import ControlPanel, { type Busy } from "./ControlPanel";
import MapView, { type LayerData, type PanelBox } from "./MapView";
import MapModeTabs from "./MapModeTabs";
import ReportForm from "./ReportForm";
import ReportPanel from "./ReportPanel";
import type { SearchHit } from "./SearchBox";
import Toast, { type ToastMessage } from "./Toast";

/** 市川市のだいたいの範囲。現在地がここから外れたときに一言添えるために使う。 */
const CITY_BOUNDS = { lat: [35.58, 35.84], lng: [139.82, 140.04] } as const;

/** 現在地が市外だったときの案内。デモデータが市川市のぶんしか無いので、
 *  「経路は引けたが最寄りが遠すぎる」状態になることを先に伝える。 */
const OUT_OF_CITY_NOTE =
  "現在地が市川市の外にあります。市内から試すときは「出発地点を地図で指定する」を使ってください。";

/** 目的地の候補が 1 つも表示されていないときの案内。 */
const NO_CANDIDATE_NOTE = "表示中のデータに地点がありません。";

/** 地図の上で何を指定させているか。出発地点と投稿位置で同じクリックを使い分ける。
 *  投稿のときは、どのカテゴリで投稿しようとしているかも一緒に覚えておく。 */
type PickTarget = { kind: "origin" } | { kind: "report"; category: ReportCategory };

function inCity([lng, lat]: LngLat): boolean {
  return (
    lat >= CITY_BOUNDS.lat[0] && lat <= CITY_BOUNDS.lat[1] &&
    lng >= CITY_BOUNDS.lng[0] && lng <= CITY_BOUNDS.lng[1]
  );
}

/** スマホ幅か。
 *
 *  **表示の出し分けにだけ使う。** md 以上では操作パネルが左に固定されていて
 *  地図に重ならないので、地図を見せるために畳む必要がない。
 *  この幅の境目は `ControlPanel` の `md:` と揃えてある。 */
function isNarrowViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
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
  /** 操作パネル（スマホでは下からせり上がるシート）を畳んでいるか。
   *
   *  **既定は畳んだ状態。** 開いたまま出すと 375px×667px で地図が高さ 119px しか
   *  見えず（main の 2 割）、地図を見に来た人が最初に見るのがパネルになってしまう。
   *  md 以上ではこのパネルは左の固定パネルで地図に重ならないので、
   *  本文側の `md:block` が効いてこの値に関係なく開いたままになる。 */
  const [collapsed, setCollapsed] = useState(true);

  // ---- 投稿（F-2）----
  const [reports, setReports] = useState<ReportCollection>(EMPTY_REPORT_COLLECTION);
  const [reportVisible, setReportVisible] = useState<Record<ReportCategory, boolean>>(() =>
    reportVisibilityFor(initialMode),
  );
  /** 投稿日の範囲（浸水実績アーカイブ）。既定は全期間 */
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE);
  /** 検索欄に入っている文字。打つたびに変わる */
  const [query, setQuery] = useState("");
  /** 実際に絞り込みへ使っている語。**打ち終わるのを少し待ってから**反映する
   *  （1 文字ごとにサーバーへ投げない） */
  const [appliedQuery, setAppliedQuery] = useState("");
  /** **注意案内（F-4）の根拠になる浸水報告の日時。全期間ぶん。**
   *  地図の表示を期間で絞っても、ここは絞らない（下の loadReports を参照） */
  const [floodHistory, setFloodHistory] = useState<string[]>([]);
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
    const result = await fetchReports({ city: cityCode, range, query: appliedQuery });
    if (!result.ok) {
      setToast({ kind: "warning", text: result.reason });
      return;
    }
    setReports(result.value);

    const floodDates = (features: typeof result.value.features) =>
      features
        .filter((feature) => feature.properties.category === "flood")
        .map((feature) => feature.properties.createdAt);

    // **注意案内（F-4）は、いま見ている期間ではなく溜まった実績すべてを根拠にする。**
    // 期間で絞ったせいで「過去に浸水報告はありません」になってしまうと、
    // 防災の判断を誤らせる（requirements.md 3-1）。
    // 絞っていないときは引き直す必要がないので、いまの結果から取る。
    if (!hasRange(range)) {
      setFloodHistory(floodDates(result.value.features));
      return;
    }
    const all = await fetchReports({ city: cityCode, categories: ["flood"] });
    if (all.ok) setFloodHistory(all.value.features.map((f) => f.properties.createdAt));
  }, [cityCode, range, appliedQuery]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // 打ち終わってから投げる。350ms は「続けて打っている」と「打ち終わった」の境目で、
  // これより短いと 1 文字ごとに投げ、長いと反応が鈍く感じる
  useEffect(() => {
    const normalized = normalizeSearch(query);
    if (normalized === appliedQuery) return;
    const timer = setTimeout(() => setAppliedQuery(normalized), 350);
    return () => clearTimeout(timer);
  }, [query, appliedQuery]);

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

  /** 検索に当たった景観スポットだけにする。**景観100選は 100 件しかない**ので、
   *  サーバーへ往復せず読み込み済みの GeoJSON から手元で探す。
   *  探すのは名前（日英）と所在地で、解説文までは見ない（当たりすぎて絞れなくなる）。 */
  const visibleScenic = useMemo(() => {
    if (!scenic || appliedQuery.length === 0) return scenic;
    return {
      ...scenic,
      features: scenic.features.filter(
        (feature) =>
          searchMatches(feature.properties.name, appliedQuery) ||
          searchMatches(feature.properties.nameEn, appliedQuery) ||
          searchMatches(feature.properties.address, appliedQuery),
      ),
    };
  }, [scenic, appliedQuery]);

  /** 検索の結果。投稿（サーバーで絞ったもの）と景観スポットを同じ並びにする。 */
  const searchHits: SearchHit[] = useMemo(() => {
    if (appliedQuery.length === 0) return [];
    const fromReports: SearchHit[] = reports.features.map((feature) => {
      const def = reportCategoryDef(feature.properties.category);
      return {
        key: `report-${feature.properties.id}`,
        label: feature.properties.title,
        kind: def.label,
        color: def.color,
        coords: feature.geometry.coordinates,
        reportId: feature.properties.id,
      };
    });
    const fromScenic: SearchHit[] = (visibleScenic?.features ?? []).map((feature, index) => ({
      key: `scenic-${index}-${feature.properties.name ?? ""}`,
      label: feature.properties.name ?? "（名前のない地点）",
      kind: SCENIC_LABEL,
      color: scenicColor(feature.properties.categoryPrimary),
      coords: feature.geometry.coordinates as LngLat,
    }));
    return [...fromReports, ...fromScenic];
  }, [appliedQuery, reports, visibleScenic]);

  /** 徒歩ナビの候補。**表示中の施設レイヤーと景観スポットを同じ土俵に並べる**ので、
   *  観光モードで施設を全部外していても「最寄りの地点へ」が使える。
   *  検索で絞っているときは、**当たったスポットだけ**が候補になる。 */
  const navCandidates: NavCandidate[] = useMemo(
    () => [
      ...(data ? facilityCandidates(data, LAYERS, visible) : []),
      ...scenicCandidates(visibleScenic, scenicVisible),
    ],
    [data, visible, visibleScenic, scenicVisible],
  );

  const runRoute = useCallback(async (from: LngLat, destination: RouteTarget) => {
    setBusy("routing");
    try {
      const result = await fetchWalkingRoute(from, destination);
      setRoute(result);
      // **結果はパネルの中に出るので、畳んだままだと出したことが伝わらない。**
      // 地図で場所を指定してもらうあいだは畳んでいる（isNarrowViewport の側）ので、
      // 引き終わったここで開き直す。開いた先で ControlPanel が結果まで送る
      setCollapsed(false);
      if (result.estimated) {
        setToast({ kind: "warning", text: `${result.note} 直線距離の概算を表示しています。` });
      }
    } finally {
      setBusy("idle");
    }
  }, []);

  /**
   * 現在地を取ってから経路を引く。**取れなければ地図クリックでの指定に切り替える。**
   *
   * 目的地の決まり方が 2 通りある（「ここへナビ」は押した時点で決まっていて、
   * 「最寄りの地点へ」は現在地が分かるまで決まらない）ので、**決め方を関数で受け取る**。
   * `pendingOnFailure` は、地図クリックで出発地点が決まったあとに使う目的地。
   * 最寄りは出発地点が変わると選び直しになるので `null` を渡す。
   */
  const locateThenRoute = useCallback(
    async (
      resolveDestination: (here: LngLat) => RouteTarget | null,
      pendingOnFailure: RouteTarget | null,
    ) => {
      setBusy("locating");
      try {
        const here = await currentPosition();
        setOrigin(here);
        setBusy("idle");
        if (!inCity(here)) {
          setToast({ kind: "info", text: OUT_OF_CITY_NOTE });
        }
        const destination = resolveDestination(here);
        if (!destination) {
          setToast({ kind: "info", text: NO_CANDIDATE_NOTE });
          return;
        }
        await runRoute(here, destination);
      } catch (error) {
        setBusy("idle");
        pendingRef.current = pendingOnFailure;
        setPickTarget({ kind: "origin" });
        // 地図をクリックしてもらうので、スマホではシートを畳んで地図を見せる
        setCollapsed(isNarrowViewport());
        setToast({
          kind: "warning",
          text: `${(error as Error).message} 地図をクリックして出発地点を指定してください。`,
        });
      }
    },
    [runRoute],
  );

  /** 目的地が決まっている経路（ポップアップの「ここへナビ」）。 */
  const routeFrom = useCallback(
    async (destination: RouteTarget | null) => {
      if (!destination) {
        setToast({ kind: "info", text: NO_CANDIDATE_NOTE });
        return;
      }
      if (origin) {
        await runRoute(origin, destination);
        return;
      }
      await locateThenRoute(() => destination, destination);
    },
    [origin, runRoute, locateThenRoute],
  );

  /** 最寄りの地点への経路。**目的地は出発地点が決まってからでないと選べない。** */
  const handleNavigateNearest = useCallback(() => {
    if (origin) {
      void routeFrom(nearestCandidate(origin, navCandidates));
      return;
    }
    void locateThenRoute((here) => nearestCandidate(here, navCandidates), null);
  }, [origin, navCandidates, routeFrom, locateThenRoute]);

  /** 地図のクリック。今なにを指定させているかで振り分ける。 */
  const handleMapPick = useCallback(
    (point: LngLat) => {
      // 「地図をクリックしてください」の案内は、クリックされた時点で用が済んでいる。
      // 消さないと 7 秒は出たままで、スマホでは開いた投稿フォームの頭に重なる
      setToast(null);
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
    // **地図をクリックしてもらうのだから、地図が見えていないと始まらない。**
    // 開いたままだとスマホでは地図が高さ 119px しか残らず、
    // 「地図をクリックして場所を指定してください」と言われても押す場所が無かった
    setCollapsed(isNarrowViewport());
    setToast({
      kind: "info",
      text: `地図をクリックして、${reportCategoryDef(category).label}を投稿する場所を指定してください。`,
    });
  }, []);

  /** 検索結果を押したとき。地図をそこへ寄せ、投稿なら詳細も開く。 */
  const pickSearchHit = useCallback((hit: SearchHit) => {
    focusNonce.current += 1;
    setFocus({ coords: hit.coords, nonce: focusNonce.current });
    if (hit.reportId === undefined) {
      // 景観スポット。防災モードでは既定で消えているので、寄せる前に出しておく
      setScenicVisible(true);
      return;
    }
    // 当たった投稿のカテゴリを消していると、寄せた先にピンが無くて戸惑う
    const category = reports.features.find(
      (feature) => feature.properties.id === hit.reportId,
    )?.properties.category;
    if (category) setReportVisible((prev) => ({ ...prev, [category]: true }));
    setSelectedReportId(hit.reportId);
  }, [reports]);

  const locate = useCallback((coords: LngLat) => {
    focusNonce.current += 1;
    setFocus({ coords, nonce: focusNonce.current });
  }, []);

  /** F-4 の注意案内。**過去の浸水報告と気象庁の予報という事実を 2 つ並べるだけ**で、
   *  浸水を予測しているわけではない（docs/design/requirements.md 3-1）。 */
  const floodAlert = buildFloodAlert(weather?.forecast ?? null, floodHistory);

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
    // ヘッダーのすぐ下にタブ、残り全部が地図。地図の中の要素は main を基準に置く
    <div className="flex h-full w-full flex-col">
      <MapModeTabs mode={mode} onChange={changeMode} />
      <main className="relative min-h-0 w-full flex-1 overflow-hidden bg-canvas">
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
          scenic={visibleScenic}
          scenicVisible={scenicVisible}
          reports={reports}
          reportVisible={reportVisible}
          floodAlert={floodAlert !== null}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
          focus={focus}
          onGeolocate={setOrigin}
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
          scenicCount={visibleScenic?.features.length ?? 0}
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
            const turningOn = pickTarget?.kind !== "origin";
            setPickTarget(turningOn ? { kind: "origin" } : null);
            // ここも地図をクリックしてもらうので、スマホではシートを畳む
            if (turningOn && isNarrowViewport()) setCollapsed(true);
          }}
          onNavigateNearest={handleNavigateNearest}
          busy={busy}
          route={route}
          onClearRoute={() => setRoute(null)}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((prev) => !prev)}
          reportCounts={reportCounts}
          reportTotal={reports.features.length}
          reportVisible={reportVisible}
          onToggleReportCategory={toggleReportCategory}
          range={range}
          onChangeRange={setRange}
          cityCode={cityCode}
          query={query}
          onChangeQuery={setQuery}
          searchHits={searchHits}
          searchPending={normalizeSearch(query) !== appliedQuery}
          onPickSearchHit={pickSearchHit}
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
    </div>
  );
}
