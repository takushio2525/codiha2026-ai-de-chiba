/** 認証（F-8）。**サーバー側からしか読み込まないこと。**
 *
 * Google OAuth を本線に、**鍵が未設定の環境では自動でデモログインに落ちる**
 * 二段構え（docs/design/requirements.md 8 章）。審査員は何も用意せずに
 * `docker compose up` だけで投稿機能まで試せる必要があるため、
 * 「鍵が無いと動かない」構成にしてはいけない。
 *
 * セッションは JWT（DB セッションを持たない）。画面へ渡す形は
 * docs/design/interfaces.md の I-8 が正本。
 */
import NextAuth, { AuthError, type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  AUTH_MODE,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  govCityCodeFor,
  type AuthMode,
} from "./authMode";
import { normalizeDisplayName, validateDisplayName } from "./displayName";
import { verifyGovPin } from "./govPin";
import { getInstallId, sessionSecretFor } from "./installId";
import { DEMO_CITY_CODE } from "./municipalities";
import { upsertUser, type UserRole } from "./users";

/** JWT に載せる項目。next-auth の JWT は `Record<string, unknown>` なので、
 *  何を載せるかをここで 1 つに決めておく（中身の意味は interfaces.md I-8）。 */
type AppToken = JWT & {
  /** users.id（DB の主キー）。 */
  uid?: number;
  displayName?: string;
  role?: UserRole;
  govCityCode?: string | null;
  /** **このトークンを発行したインストールの ID**（`installId.ts`）。
   *  users.id はただの連番なので、これが無いと別の DB で発行された
   *  トークンを見分けられない。毎回のリクエストで突き合わせる。 */
  inst?: string;
};

/** インストール ID すら読めないときの最後の逃げ道。
 *
 * **この値で発行されたセッションは通らない。** jwt コールバックが
 * `installId === null` のときに必ず null を返すので、ここが推測できても実害は無い。
 * それでも例外を投げないのは、認証がアプリの入り口で毎回通るため
 * （投げると DB が落ちた瞬間に画面ごと 500 になる）。 */
const FALLBACK_SIGNING_KEY = "chizuba-no-install-id-session-disabled";

/** 同じ警告をリクエストごとに出さないための印。 */
let warnedNoInstallId = false;

/**
 * JWT の署名鍵を決める。
 *
 *   1. `AUTH_SECRET` が設定されていればそれ（運用者が決めた鍵が最優先）
 *   2. 未設定なら**このインストールの ID から導く**（`installId.ts`）
 *
 * 2 があるので、**鍵を 1 つも設定していない環境でも署名鍵は環境ごとに違う**。
 * 以前はここに公開の固定値を書いていたが、それだとリポジトリを読めば誰でも
 * トークンを偽造でき、別インストールのトークンもそのまま通っていた（実測済み）。
 */
function resolveSecret(installId: string | null): string {
  const configured = (process.env.AUTH_SECRET ?? "").trim();
  if (configured) return configured;
  if (installId !== null) return sessionSecretFor(installId);

  // ビルド中は黙っておく。next build はワーカーを並列に立てるので、
  // ここで出すと同じ警告がビルドログに何行も並んで異常に見える。
  if (process.env.NEXT_PHASE !== "phase-production-build" && !warnedNoInstallId) {
    warnedNoInstallId = true;
    console.warn(
      "[auth] データベースからインストール ID を読めませんでした。" +
        "ログイン状態は通しません（データベースが起動していれば自動で回復します）。",
    );
  }
  return FALLBACK_SIGNING_KEY;
}

/** 認証プロバイダ。モードによってどちらか一方だけを登録する。 */
function providers(): NextAuthConfig["providers"] {
  if (AUTH_MODE === "google") {
    return [
      Google({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
      }),
    ];
  }

  return [
    Credentials({
      id: "demo",
      name: "デモログイン",
      credentials: {
        displayName: { label: "表示名", type: "text" },
        role: { label: "ロール", type: "text" },
        // GOV_DEMO_PIN を設定した環境だけで使う（未設定なら無視される）
        govPin: { label: "行政ユーザーの PIN", type: "password" },
      },
      /** 表示名を入れるだけでログインできる。**デモモードだから許される**作りで、
       *  Google モードではロールを自己申告させない（requirements.md 8-3）。 */
      async authorize(raw) {
        const displayName = normalizeDisplayName(
          typeof raw?.displayName === "string" ? raw.displayName : "",
        );
        // 画面側でも検証しているが、API を直接叩かれても壊れないようここでも見る
        if (validateDisplayName(displayName) !== null) return null;

        const role: UserRole = raw?.role === "gov" ? "gov" : "user";

        // 行政ロールの PIN（requirements.md 8-3）。**画面を通さずここへ直接
        // POST された場合の最後の砦。** GOV_DEMO_PIN が未設定なら素通りする。
        // 画面からの経路はサーバーアクション側で先に確かめて日本語の理由を返すので、
        // ここまで PIN 違いで来るのは API を直接叩かれたときだけ
        if (role === "gov" && !(await verifyGovPin(raw?.govPin)).ok) return null;

        const user = await upsertUser({
          provider: "demo",
          // 同じ「表示名 × ロール」で入り直したら同じユーザーとして扱う
          providerUid: `${role}/${displayName}`,
          displayName,
          role,
          govCityCode: role === "gov" ? DEMO_CITY_CODE : null,
        });

        return {
          id: String(user.id),
          name: user.displayName,
          role: user.role,
          govCityCode: user.govCityCode,
        };
      },
    }),
  ];
}

/**
 * 設定を**関数で渡す**（next-auth v5 の遅延設定）。
 *
 * 署名鍵とトークンの検証に、DB から読むインストール ID が要るため。
 * ID は `installId.ts` がプロセス内で使い回すので、DB を引くのは実質 1 回だけ。
 */
export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  const installId = await getInstallId();

  return {
    // コンテナの中で自分のホスト名を判定できないため、ホストを信頼して動かす。
    // 審査員のマシンの localhost:3000 で動かす前提の構成（外部公開はしない）。
    trustHost: true,
    secret: resolveSecret(installId),
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: providers(),
    callbacks: {
      async jwt({ token, user, account }) {
        const app = token as AppToken;

        // user が入っているのはログインした瞬間だけ。以降のリクエストでは
        // **このインストールで発行されたトークンかどうかだけ**を確かめる
        // （毎回 DB を引かないため。ロールを変えたらログインし直す）。
        if (!user) {
          // null を返すとセッションが無効になる（未ログイン扱いになる）
          if (installId === null || app.inst !== installId) return null;
          return app;
        }

        // ID が読めない状態でセッションを配ると、あとで縛れないトークンが残る。
        // ログイン自体が DB を要る操作なので、ここまで来ることはまず無い
        if (installId === null) return null;
        app.inst = installId;

        if (account?.provider === "google") {
          // Google のプロフィールから来たメールアドレス。行政ロールの判定にだけ使い、
          // 画面にもレスポンスにも出さない（interfaces.md I-8）
          const email = user.email ?? (typeof token.email === "string" ? token.email : "");
          const govCityCode = govCityCodeFor(email);
          const displayName = normalizeDisplayName(user.name ?? "") || "利用者";
          const saved = await upsertUser({
            provider: "google",
            providerUid: account.providerAccountId,
            displayName: displayName.slice(0, 30),
            role: govCityCode ? "gov" : "user",
            govCityCode,
          });
          app.uid = saved.id;
          app.displayName = saved.displayName;
          app.role = saved.role;
          app.govCityCode = saved.govCityCode;
          return app;
        }

        // デモログイン。authorize が返した値をそのまま載せる
        app.uid = Number(user.id);
        app.displayName = user.name ?? "";
        app.role = user.role ?? "user";
        app.govCityCode = user.govCityCode ?? null;
        return app;
      },

      async session({ session, token }) {
        const app = token as AppToken;
        session.user = {
          ...session.user,
          id: String(app.uid ?? ""),
          name: app.displayName ?? "",
          // メールアドレスと画像は画面に渡さない（interfaces.md I-8）
          email: "",
          image: null,
          role: app.role ?? "user",
          govCityCode: app.govCityCode ?? null,
        };
        return session;
      },
    },
  };
});

/** 画面と API が受け取るログイン状態。形の正本は interfaces.md I-8。 */
export type SessionView = {
  authMode: AuthMode;
  user: {
    id: number;
    displayName: string;
    role: UserRole;
    govCityCode: string | null;
  } | null;
};

/** 現在のログイン状態を I-8 の形で返す。未ログインなら user は null。 */
export async function getSessionView(): Promise<SessionView> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return { authMode: AUTH_MODE, user: null };

  return {
    authMode: AUTH_MODE,
    user: {
      id: Number(user.id),
      displayName: user.name ?? "",
      role: user.role ?? "user",
      govCityCode: user.govCityCode ?? null,
    },
  };
}

export { AuthError };
