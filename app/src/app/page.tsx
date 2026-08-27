import MapExplorer from "@/components/MapExplorer";
import { getSessionView } from "@/lib/auth";
import { parseMapMode } from "@/lib/mapModes";
import { DEMO_CITY_CODE } from "@/lib/municipalities";

/** ログイン状態を毎回見るので、この画面はキャッシュしない。 */
export const dynamic = "force-dynamic";

/** 地図（画面 S-1 防災 / S-2 観光）。`?mode=tourism` で観光モードで開く。 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  // 認証モードとログイン状態は**サーバー側で 1 回だけ**決めて画面へ渡す（interfaces.md I-8）
  const session = await getSessionView();
  // 知らない値と未指定は防災モード。判定はサーバー側で済ませ、画面に渡すだけにする
  const mode = parseMapMode((await searchParams).mode);
  // 対応は千葉県全域。デモの既定は市川市（docs/design/requirements.md 7-4）
  return <MapExplorer session={session} cityCode={DEMO_CITY_CODE} initialMode={mode} />;
}
