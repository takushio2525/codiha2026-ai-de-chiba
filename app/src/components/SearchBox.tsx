"use client";

import { Search, X } from "lucide-react";

import type { LngLat } from "@/lib/geo";
import { SEARCH_MAX_LENGTH } from "@/lib/searchText";

/** 検索に当たった 1 件。投稿と景観スポットを同じ形にそろえて並べる。 */
export type SearchHit = {
  key: string;
  label: string;
  /** 種別（「危険箇所」「景観100選」など） */
  kind: string;
  color: string;
  coords: LngLat;
  /** 投稿なら ID。景観スポットは undefined（詳細パネルを持たない） */
  reportId?: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  hits: SearchHit[];
  onPick: (hit: SearchHit) => void;
  /** 検索語を打ってから結果が返るまでの間 */
  pending: boolean;
};

/** 一度に出す件数。**スマホで一覧が地図を覆い尽くさない**ところで切る。 */
const MAX_HITS = 8;

/**
 * 投稿と景観スポットのキーワード検索（地図の操作パネル）。
 *
 * 打った語は**地図そのものにも効く**（当たったピンだけが残る）ので、
 * 「探す」と「絞る」を別の操作にしていない。下の一覧は、
 * **スマホでピンを指で探すのが難しい**ぶんの補助で、押すとその場所へ飛ぶ。
 *
 * 投稿はサーバーで、景観スポットは読み込み済みの GeoJSON から手元で探す
 * （景観100選は 100 件しかないので、サーバーへ往復する必要がない）。
 */
export default function SearchBox({ value, onChange, hits, onPick, pending }: Props) {
  const shown = hits.slice(0, MAX_HITS);

  return (
    <section className="border-t border-line px-4 py-3.5">
      <label className="block">
        <span className="sr-only">投稿と景観スポットを検索</span>
        <span className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={SEARCH_MAX_LENGTH}
            placeholder="投稿・景観スポットを検索"
            className="w-full rounded-xl border border-line bg-surface py-2.5 pr-9 pl-9 text-[13px] text-ink transition placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
          />
          {value.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="検索を消す"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </span>
      </label>

      {value.trim().length === 0 ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
          投稿のタイトル・本文と、景観スポットの名前から探します。当たったものだけが地図に残ります。
        </p>
      ) : pending ? (
        <p className="mt-1.5 text-[11px] text-ink-muted">探しています…</p>
      ) : hits.length === 0 ? (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-muted">
          「{value.trim()}」に当たるものはありませんでした。
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-[11px] text-ink-muted tabular-nums">
            {hits.length} 件見つかりました
            {hits.length > MAX_HITS ? `（上から ${MAX_HITS} 件を表示）` : ""}
          </p>
          <ul className="mt-1.5 space-y-1">
            {shown.map((hit) => (
              <li key={hit.key}>
                <button
                  type="button"
                  onClick={() => onPick(hit)}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-left transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: hit.color }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {hit.label}
                    </span>
                    <span className="block truncate text-[10.5px] text-ink-muted">{hit.kind}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
