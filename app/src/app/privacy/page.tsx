import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "CHIZUBA が受け取る情報と、その使い道・保存場所・消し方。Google ログインで受け取る情報の扱いもここに書いています。",
};

/** プライバシーポリシー（S-8）。
 *
 * **実装に書いてあることだけを書く。** ここは「一般的な文面」を置く場所ではなく、
 * このコードが実際に何を受け取り・何を保存し・どこへ送るかの説明なので、
 * 挙動を変えたらこのページも同じコミットで直すこと。根拠の置き場は下の通り。
 *
 *   ログインで受け取るもの   … `lib/auth.ts` の jwt コールバック・`lib/authMode.ts`
 *   データベースに残るもの   … `db/init/001_schema.sql` の users / reports / report_photos
 *   写真の保存              … `lib/photoStore.ts`（**受け取ったバイト列をそのまま書く**）
 *   外部へ出る座標          … `app/api/routing/route.ts`（OSRM へ中継）
 *   Cookie                 … Auth.js の既定（`__Host-` / `__Secure-` は https のときだけ付く）
 *
 * Google OAuth のアプリを本番公開するには、同じドメインで読めるプライバシーポリシーの
 * URL が要る。**このページはその提出先も兼ねる**ので、パスは `/privacy` から変えない。
 */
const UPDATED = "2026年8月31日";

const REPO_URL = "https://github.com/takushio2525/codiha2026-ai-de-chiba";

/** 本文の中で使う外部リンク。下線の付け方を 1 箇所に揃える。 */
function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all underline decoration-line underline-offset-2 transition hover:decoration-ink"
    >
      {children}
    </a>
  );
}

/** 節の見出しと枠。/about と同じ見た目にする。 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-ink-sub">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-canvas px-5 py-10">
      <main className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-sub transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          地図に戻る
        </Link>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          プライバシーポリシー
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-sub">
          CHIZUBA が受け取る情報と、その使い道・保存場所・消し方をまとめています。
          <strong className="font-semibold text-ink">
            ここに書いてあるのは、実際に動いているコードの挙動です。
          </strong>
        </p>

        {/* 長い文章なので、先に「要点 3 つ」を出す。スマホでは全部を読ませられない */}
        <section className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_30px_-26px_rgb(0_0_0/0.5)]">
          <p className="text-[11px] font-semibold tracking-wide text-ink-muted">要点</p>
          <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink-sub">
            <li>
              <strong className="font-semibold text-ink">閲覧するだけならログインは要りません。</strong>
              地図・ハザードマップ・投稿を見るのに、こちらへ渡す情報はありません。
            </li>
            <li>
              <strong className="font-semibold text-ink">
                投稿した内容は、位置も写真も表示名も公開されます。
              </strong>
              誰でも読め、CSV / GeoJSON で持ち帰れるオープンデータになります。
            </li>
            <li>
              <strong className="font-semibold text-ink">
                広告・アクセス解析は入れていません。
              </strong>
              受け取った情報を第三者に売ったり渡したりもしません。
            </li>
          </ul>
        </section>

        <Section title="1. ログインで受け取る情報">
          <p>
            ログインが要るのは投稿とコメントのときだけです。ログイン方法は 2 つあり、
            受け取る情報が違います。
          </p>
          <p className="pt-1">
            <strong className="font-semibold text-ink">Google でログインした場合</strong>
            、Google から表示名・メールアドレス・プロフィール画像の URL を受け取ります。
            このうち
            <strong className="font-semibold text-ink">
              データベースに保存するのは表示名と、Google の中での利用者 ID（数字）だけ
            </strong>
            です。メールアドレスとプロフィール画像は保存しません。
          </p>
          <p>
            メールアドレスは、
            <strong className="font-semibold text-ink">
              行政ユーザーとして登録されているアカウントかどうかを照合するためだけ
            </strong>
            に使います（運営が環境変数に書いた一覧との突き合わせです）。
            画面にも API の応答にも出しません。他の利用者からメールアドレスが見えることはありません。
          </p>
          <p>
            ただし、
            <strong className="font-semibold text-ink">
              ログイン中のセッション Cookie（暗号化されています）の中には、
              Google から受け取った表示名・メールアドレス・プロフィール画像の URL が入っています。
            </strong>
            この Cookie はログアウトすると消えます。
          </p>
          <p className="pt-1">
            <strong className="font-semibold text-ink">デモログインの場合</strong>
            、受け取るのは入力された表示名だけです。Google へは何も送りません。
          </p>
          <p>
            どちらの場合も、データベースに残るのは
            <span className="text-ink">
              「ログイン方法・認証元での利用者 ID・表示名・ロール（一般／行政）・
              行政ユーザーの担当市町村・登録日時」
            </span>
            です。
          </p>
        </Section>

        <Section title="2. 投稿すると公開される情報">
          <p>
            危険箇所・浸水・観光おすすめの投稿と、投稿へのコメントは
            <strong className="font-semibold text-ink">誰でも読める公開情報</strong>
            です。ログインしていない人にも見えます。
          </p>
          <ul className="ml-4 list-disc space-y-1 pt-1 marker:text-ink-muted">
            <li>種類・タイトル・本文・地図上の位置（緯度経度）・投稿日時</li>
            <li>投稿者の表示名とロール（行政ユーザーなら「行政」の印が付きます）</li>
            <li>添えた写真（1 投稿につき 3 枚まで・1 枚 5 MB まで）</li>
            <li>行政が付けた対応状況とコメント</li>
          </ul>
          <p className="pt-1">
            これらは
            <Link
              href="/reports"
              className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
            >
              投稿一覧
            </Link>
            と地図から、
            <strong className="font-semibold text-ink">
              誰でも CSV / GeoJSON で書き出せます（表示名も含まれます）。
            </strong>
            アカウントの情報（ログイン方法・認証元の利用者 ID）は書き出しに含めていません。
          </p>
          <p className="pt-1">
            <strong className="font-semibold text-ink">
              写真は、受け取ったファイルをそのまま保存して配信しています。
            </strong>
            縮小も再圧縮もしていないので、
            <strong className="font-semibold text-ink">
              写真に埋め込まれた撮影情報（Exif。撮影日時や GPS の座標を含むことがあります）は取り除かれません。
            </strong>
            知られたくない情報が入っていないか、投稿する前に確かめてください。
          </p>
          <p>
            投稿の位置は、地図をタップして自分で決めます。
            「現在地」ボタンで取得した座標を使った場合も、決めた地点がそのまま公開されます。
          </p>
          <p>
            浸水の投稿には、投稿した時刻に
            <strong className="font-semibold text-ink">最寄りのアメダス観測所</strong>
            が観測していた雨量を記録します。
            観測所の値であって、投稿した人の場所を測ったものではありません。
          </p>
        </Section>

        <Section title="3. 現在地の使い方">
          <p>
            位置情報を使うのは、
            <strong className="font-semibold text-ink">「現在地」ボタンを押したときだけ</strong>
            です。ブラウザが許可を求め、許可した場合にだけ座標を受け取ります。
            使い道は地図をその場所へ動かすことと、徒歩経路の出発地にすることの 2 つです。
          </p>
          <p>
            <strong className="font-semibold text-ink">
              徒歩経路を出すときは、
              出発地と目的地の座標が経路サービス（FOSSGIS e.V. の OSRM）へ送られます。
            </strong>
            この通信はこのサイトのサーバーが中継していて、利用者を識別する情報は添えていません。
          </p>
          <p>
            <strong className="font-semibold text-ink">
              現在地そのものは保存していません。
            </strong>
            保存されるのは、投稿するときに自分で決めた地点だけです。
          </p>
        </Section>

        <Section title="4. 外部サービスへの通信">
          <p>
            このサイトは、次の外部サービスを使っています。認証キーが要るのは Google だけで、
            他はキー無しで公開されているものです。
          </p>
          <ul className="ml-4 list-disc space-y-1.5 pt-1 marker:text-ink-muted">
            <li>
              <span className="font-medium text-ink">背景地図（国土地理院）</span>
              と
              <span className="font-medium text-ink">ハザードマップのタイル（国土交通省）</span>{" "}
              — ブラウザが直接読みに行くため、
              <strong className="font-semibold text-ink">
                接続元の IP アドレスなどはそれぞれの提供元に届きます。
              </strong>
            </li>
            <li>
              <span className="font-medium text-ink">徒歩経路（OSRM / FOSSGIS e.V.）</span>{" "}
              — サーバーが中継します。送るのは出発地と目的地の座標です。
            </li>
            <li>
              <span className="font-medium text-ink">気象データ（気象庁）</span>{" "}
              — サーバーが中継します。送るのは市町村の中心座標だけで、利用者の位置は送りません。
            </li>
            <li>
              <span className="font-medium text-ink">Google</span>{" "}
              — Google ログインを選んだときだけ、Google の認証画面へ移動します。
            </li>
          </ul>
          <p className="pt-1">
            それぞれの出典と利用条件は
            <Link
              href="/about"
              className="underline decoration-line underline-offset-2 transition hover:decoration-ink"
            >
              出典とライセンス
            </Link>
            にまとめています。
            <strong className="font-semibold text-ink">
              広告・アクセス解析（Google Analytics などの計測タグ）は 1 つも入れていません。
            </strong>
          </p>
        </Section>

        <Section title="5. Cookie">
          <p>
            使っている Cookie は、
            <strong className="font-semibold text-ink">
              ログイン状態の保持と、なりすまし対策（CSRF 対策）のためのものだけ
            </strong>
            です。追跡や広告には使っていません。
          </p>
          <ul className="ml-4 list-disc space-y-1 pt-1 marker:text-ink-muted">
            <li>
              <code className="text-[11.5px] text-ink">authjs.session-token</code>{" "}
              — ログイン状態。ログアウトすると消えます
            </li>
            <li>
              <code className="text-[11.5px] text-ink">authjs.csrf-token</code>
              <span className="mx-1">/</span>
              <code className="text-[11.5px] text-ink">authjs.callback-url</code>{" "}
              — ログイン手続きの安全確認と、ログイン後の戻り先
            </li>
          </ul>
          <p className="pt-1">
            https で開いた場合、名前の頭に <code className="text-[11.5px] text-ink">__Host-</code>
            <span className="mx-1">/</span>
            <code className="text-[11.5px] text-ink">__Secure-</code>
            が付きます。ログイン状態はサーバー側のデータベースではなく、
            <strong className="font-semibold text-ink">暗号化した Cookie の中</strong>
            に持っています。
          </p>
          <p>
            この Cookie の署名鍵は、
            <strong className="font-semibold text-ink">
              このサイトを動かしているデータベースごとに違う値
            </strong>
            です。別の場所で動いている CHIZUBA の Cookie は、ここでは通りません。
          </p>
        </Section>

        <Section title="6. 保存場所・保存期間・消し方">
          <p>
            投稿・写真・アカウントの情報は、
            <strong className="font-semibold text-ink">
              このサイトを動かしているサーバーの中
            </strong>
            （PostgreSQL のデータベースと、写真用のディスク領域）に保存しています。
            外部のクラウドサービスに預けてはいません。
          </p>
          <p>
            <strong className="font-semibold text-ink">
              自分の投稿は、いつでも自分で削除できます。
            </strong>
            投稿を消すと、その投稿に付いた写真とコメントも一緒に消えます。
            コメントだけを個別に消す機能は用意していません。
          </p>
          <p>
            アカウントの行（表示名など）を利用者自身が消す画面は用意していません。
            消したい場合は下の連絡先からお知らせください。
          </p>
          <p>
            <strong className="font-semibold text-ink">
              アクセス記録（IP アドレスなど、利用者をたどれる記録）はアプリ側で保存していません。
            </strong>
            サーバーやネットワーク機器が残す記録は、このサイトを動かしている環境によります。
          </p>
        </Section>

        <Section title="7. 問い合わせ">
          <p>
            このサイトは、
            ちばオープンデータアイデアソン・ハッカソン（CODIHA）2026 に向けてチーム「愛で千葉は救えるのか」が作った
            <strong className="font-semibold text-ink">試作</strong>
            で、商用サービスではありません。
          </p>
          <p>
            情報の削除の依頼や、このページについての質問は、
            GitHub リポジトリの Issues で受け付けます。
          </p>
          <p>
            <Ext href={`${REPO_URL}/issues`}>{`${REPO_URL}/issues`}</Ext>
          </p>
        </Section>

        <p className="mt-6 text-[11.5px] leading-relaxed text-ink-muted">
          このページは、アプリの挙動が変わったときに同時に更新します。最終更新: {UPDATED}
        </p>
      </main>
    </div>
  );
}
