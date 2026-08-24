import MapExplorer from "@/components/MapExplorer";
import { getSessionView } from "@/lib/auth";
import { DEMO_CITY_CODE } from "@/lib/municipalities";

/** ログイン状態を毎回見るので、この画面はキャッシュしない。 */
export const dynamic = "force-dynamic";

export default async function Home() {
  // 認証モードとログイン状態は**サーバー側で 1 回だけ**決めて画面へ渡す（interfaces.md I-8）
  const session = await getSessionView();
  // 対応は千葉県全域。デモの既定は市川市（docs/design/requirements.md 7-4）
  return <MapExplorer session={session} cityCode={DEMO_CITY_CODE} />;
}
