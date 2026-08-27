"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  Crosshair,
  LoaderCircle,
  LogIn,
  MessageSquare,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

// 型だけを取り込む（実体はサーバー側でしか動かない）。形の正本は interfaces.md I-8
import type { SessionView } from "@/lib/auth";
import type { LngLat } from "@/lib/geo";
import {
  COMMENT_MAX_LENGTH,
  canUpdateStatus,
  detailRows,
  formatJst,
  isDemoReport,
  reportCategoryDef,
  reportStatusLabel,
  type ReportComment,
  type ReportProperties,
} from "@/lib/reports";
import { deleteReport, fetchReportDetail, submitComment } from "@/lib/reportsApi";
import { DemoBadge, DemoNote } from "./DemoBadge";
import FloodRainfall from "./FloodRainfall";
import ReportEditForm from "./ReportEditForm";
import ReportStatusControl from "./ReportStatusControl";

type Props = {
  reportId: number;
  /** ログイン状態。**表示の出し分けにしか使わない**（権限判定は API 側） */
  user: SessionView["user"];
  onClose: () => void;
  /** コメントや削除で一覧の内容が変わったときに呼ぶ */
  onChanged: () => void;
  /** 削除が終わったときに呼ぶ（パネルを閉じる） */
  onDeleted: () => void;
  /** 読み込めた投稿の位置へ地図を寄せる */
  onLocate: (coords: LngLat) => void;
};

/** 投稿の詳細パネル（画面 S-3）。
 *
 * 操作パネルと同じ位置に重ねる（スマホは下のシート、タブレット以上は左の固定パネル）。
 * 地図の右側には縮尺・出典の表示があるので、そこを覆わないようにしている。 */
export default function ReportPanel({
  reportId,
  user,
  onClose,
  onChanged,
  onDeleted,
  onLocate,
}: Props) {
  const [report, setReport] = useState<ReportProperties | null>(null);
  const [coordinates, setCoordinates] = useState<LngLat | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  /** 投稿者本人が本文を編集している最中か（F-7 と同じ PATCH を使う） */
  const [editing, setEditing] = useState(false);

  // 親から渡る関数の同一性に読み込みを引きずられないよう、ref 経由で最新を読む
  const locateRef = useRef(onLocate);
  useEffect(() => {
    locateRef.current = onLocate;
  });

  const load = useCallback(
    async (locate: boolean) => {
      const result = await fetchReportDetail(reportId);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setError(null);
      setReport(result.value.report);
      setCoordinates(result.value.coordinates);
      setComments(result.value.comments);
      setIsAuthor(result.value.isAuthor);
      if (locate) locateRef.current(result.value.coordinates);
    },
    [reportId],
  );

  // 投稿を切り替えたら読み直す。読めたら地図をその位置へ寄せる
  useEffect(() => {
    setReport(null);
    setComments([]);
    setError(null);
    setCommentBody("");
    setConfirmingDelete(false);
    setIsAuthor(false);
    setEditing(false);
    void load(true);
  }, [load]);

  /** 対応状況の更新・本文の編集のあと、サーバーが返した最新の姿に差し替える。
   *  一覧（地図のピンと /reports）にも反映されるよう親に知らせる。 */
  function handleUpdated(next: ReportProperties) {
    setReport(next);
    setEditing(false);
    setError(null);
    onChanged();
  }

  async function handleComment(event: React.FormEvent) {
    event.preventDefault();
    const body = commentBody.trim();
    if (body.length === 0 || sending) return;

    setSending(true);
    const result = await submitComment(reportId, body);
    setSending(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError(null);
    setCommentBody("");
    setComments((prev) => [...prev, result.value]);
    setReport((prev) =>
      prev
        ? {
            ...prev,
            commentCount: prev.commentCount + 1,
            hasOfficialComment: prev.hasOfficialComment || result.value.isOfficial,
          }
        : prev,
    );
    onChanged();
  }

  async function handleDelete() {
    setSending(true);
    const result = await deleteReport(reportId);
    setSending(false);
    if (!result.ok) {
      setError(result.reason);
      setConfirmingDelete(false);
      return;
    }
    onDeleted();
    onChanged();
  }

  const def = report ? reportCategoryDef(report.category) : null;

  return (
    <aside
      className={[
        "pointer-events-auto absolute z-20 flex flex-col overflow-hidden rounded-2xl border border-line",
        // 操作パネルと同じ場所に重なるので、背景は透かさない（下の内容が透けると読みにくい）
        "bg-surface shadow-[0_20px_50px_-28px_rgb(0_0_0/0.6)]",
        "inset-x-3 bottom-3 max-h-[72dvh] md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[21.5rem] md:max-h-none",
      ].join(" ")}
      aria-label="投稿の詳細"
    >
      {/* **バッジは折り返す。** 「行政の公式投稿」と「デモ投稿」が同時に付くと
          375px で 3px、320px では 45px はみ出し、閉じるボタンが画面の外に出ていた
          （カテゴリ名と対応状況も 1 文字ずつの縦書きに潰れる）。
          バッジ側だけを折り返す入れ物に入れて、操作ボタンは右上に固定する。 */}
      <header className="flex items-start gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          {def ? (
            <span className="inline-flex shrink-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: def.color }}
              />
              <span className="text-[11px] font-medium tracking-wide whitespace-nowrap text-ink-muted">
                {def.label}
              </span>
            </span>
          ) : (
            <span className="text-[11px] font-medium tracking-wide whitespace-nowrap text-ink-muted">
              投稿
            </span>
          )}
          {report ? (
            <span className="shrink-0 rounded-full bg-[#f1f2f4] px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-ink-sub">
              {reportStatusLabel(report.status)}
            </span>
          ) : null}
          {/* 行政が出した投稿は、住民の投稿と**一目で**区別できるようにする（F-7）。
              見出しの並びに置くので、本文まで読まなくても分かる */}
          {report?.authorRole === "gov" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0072b2] px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-white">
              <ShieldCheck aria-hidden className="size-3" />
              行政の公式投稿
            </span>
          ) : null}
          {/* 起動時から入っているデモ投稿。**実際の通報と取り違えられないように**印を出す */}
          {report && isDemoReport(report.details) ? <DemoBadge /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {coordinates ? (
            <button
              type="button"
              onClick={() => onLocate(coordinates)}
              aria-label="この投稿の場所へ地図を移動"
              className="rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Crosshair aria-hidden className="size-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="詳細を閉じる"
            className="rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!report && !error ? (
          <p className="flex items-center gap-2 px-4 py-6 text-[12.5px] text-ink-muted">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            読み込んでいます…
          </p>
        ) : null}

        {error && !report ? (
          <p className="flex items-start gap-2 px-4 py-6 text-[12.5px] leading-relaxed text-ink-sub">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-[#7a2f10]" />
            {error}
          </p>
        ) : null}

        {report ? (
          <>
            {report.photoUrls.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto border-b border-line bg-[#fafafa] px-4 py-3">
                {report.photoUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block size-24 shrink-0 overflow-hidden rounded-xl border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {/* 投稿写真は自前の API から返す。next/image の最適化は挟まない */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`投稿の写真 ${index + 1}`}
                      className="size-full object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : null}

            <section className="px-4 py-3.5">
              {editing ? (
                <ReportEditForm
                  report={report}
                  onSaved={handleUpdated}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
              <h2 className="text-[15px] leading-snug font-semibold text-ink">{report.title}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                <span className="font-medium text-ink-sub">{report.authorName}</span>
                {report.authorRole === "gov" ? (
                  <span className="rounded-full bg-[#0072b2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    行政
                  </span>
                ) : null}
                <span className="tabular-nums">{formatJst(report.createdAt)}</span>
              </p>
              <p className="mt-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink-sub">
                {report.body}
              </p>

              {detailRows(report.category, report.details).length > 0 ? (
                <dl className="mt-3 space-y-1 text-[12.5px] leading-relaxed">
                  {detailRows(report.category, report.details).map((row) => (
                    <div key={row.label} className="flex gap-2">
                      <dt className="w-[5.5rem] shrink-0 text-ink-muted">{row.label}</dt>
                      <dd className="flex-1 text-ink-sub">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {/* 浸水（F-3）だけ、投稿時点の雨量を出す。取れなかった投稿もその旨を出す */}
              <FloodRainfall category={report.category} details={report.details} />

              {/* デモ投稿は、何のためのデータかと写真の出どころをここで断る */}
              {isDemoReport(report.details) ? <DemoNote /> : null}
                </>
              )}

              {/* 行政からの応答（F-7）。**担当市町村の行政ユーザーにだけ**出す。
                  ここは表示の出し分けで、権限判定は PATCH 側で改めて行う（I-5） */}
              {canUpdateStatus(user, report) ? (
                <ReportStatusControl report={report} onUpdated={handleUpdated} />
              ) : null}

              {isAuthor && !editing ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {confirmingDelete ? (
                    <div className="flex w-full items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={sending}
                        className="flex-1 rounded-xl bg-[#7a2f10] px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#8f3b18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-45"
                      >
                        本当に削除する
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="rounded-xl border border-line px-3 py-2 text-[12.5px] font-medium text-ink-sub transition hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        やめる
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <Pencil aria-hidden className="size-3.5" />
                        編集する
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-[12.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <Trash2 aria-hidden className="size-3.5" />
                        削除する
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </section>

            <section className="border-t border-line px-4 py-3.5">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-ink-muted">
                <MessageSquare aria-hidden className="size-3.5" />
                コメント {report.commentCount} 件
              </h3>

              {comments.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {comments.map((comment) => (
                    <li
                      key={comment.id}
                      className={[
                        "rounded-xl border px-3 py-2.5",
                        comment.isOfficial
                          ? "border-[#0072b2]/40 bg-[#eef6fb]"
                          : "border-line bg-surface",
                      ].join(" ")}
                    >
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-muted">
                        <span className="font-medium text-ink-sub">{comment.authorName}</span>
                        {comment.isOfficial ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0072b2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                            <ShieldCheck aria-hidden className="size-3" />
                            行政の公式回答
                          </span>
                        ) : null}
                        <span className="tabular-nums">{formatJst(comment.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap text-ink-sub">
                        {comment.body}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-muted">
                  まだコメントはありません。
                </p>
              )}

              {user ? (
                <form onSubmit={handleComment} className="mt-3">
                  <textarea
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    maxLength={COMMENT_MAX_LENGTH}
                    rows={2}
                    placeholder="現地の様子や補足を書けます。"
                    className="w-full resize-y rounded-xl border border-line px-3 py-2.5 text-[12.5px] leading-relaxed text-ink transition placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[11px] text-ink-muted tabular-nums">
                      {commentBody.length} / {COMMENT_MAX_LENGTH}
                    </span>
                    <button
                      type="submit"
                      disabled={sending || commentBody.trim().length === 0}
                      className="ml-auto flex items-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {sending ? (
                        <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
                      ) : (
                        <Send aria-hidden className="size-3.5" />
                      )}
                      送信
                    </button>
                  </div>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-[12.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <LogIn aria-hidden className="size-3.5" />
                  コメントするにはログイン
                </Link>
              )}

              {error && report ? (
                <p role="alert" className="mt-2 text-[11.5px] leading-relaxed text-[#7a2f10]">
                  {error}
                </p>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </aside>
  );
}
