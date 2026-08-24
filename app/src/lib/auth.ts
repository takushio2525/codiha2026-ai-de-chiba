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
};

/** AUTH_SECRET が未設定のときに使う署名鍵。
 *  デモ用の固定値で、秘密ではない（interfaces.md I-8「止めない」）。 */
const DEMO_SIGNING_KEY = "chizuba-demo-mode-not-a-secret";

function resolveSecret(): string {
  const configured = (process.env.AUTH_SECRET ?? "").trim();
  if (configured) return configured;
  // ビルド中は黙っておく。next build はワーカーを並列に立てるので、
  // ここで出すと同じ警告がビルドログに何行も並んで異常に見える。
  // 起動時（コンテナのログ）には 1 回出る。
  if (process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn(
      "[auth] AUTH_SECRET が未設定です。デモ用の固定値で起動します。" +
        "公開環境で使うときは必ず設定してください（app/.env.example 参照）。",
    );
  }
  return DEMO_SIGNING_KEY;
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  // コンテナの中で自分のホスト名を判定できないため、ホストを信頼して動かす。
  // 審査員のマシンの localhost:3000 で動かす前提の構成（外部公開はしない）。
  trustHost: true,
  secret: resolveSecret(),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: providers(),
  callbacks: {
    async jwt({ token, user, account }) {
      const app = token as AppToken;
      // user が入っているのはログインした瞬間だけ。以降のリクエストでは何もしない
      // （毎回 DB を引かないため。ロールを変えたらログインし直す）。
      if (!user) return app;

      if (account?.provider === "google") {
        const email = typeof token.email === "string" ? token.email : "";
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
