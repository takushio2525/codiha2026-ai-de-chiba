"use client";

import { useEffect, useRef, useState } from "react";
import { CircleAlert, ImagePlus, LoaderCircle, MapPin, Send, X } from "lucide-react";

import type { LngLat } from "@/lib/geo";
import {
  ALLOWED_PHOTO_TYPES,
  BODY_MAX_LENGTH,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_COUNT,
  TITLE_MAX_LENGTH,
  reportCategoryDef,
  type ReportCategory,
  type ReportProperties,
} from "@/lib/reports";
import { submitReport } from "@/lib/reportsApi";

type Props = {
  category: ReportCategory;
  /** 投稿する場所 `[経度, 緯度]`。地図で指定してから開く */
  coordinates: LngLat;
  /** 位置を選び直す（フォームを閉じて地図の指定モードに戻る） */
  onRepick: () => void;
  onClose: () => void;
  onSubmitted: (report: ReportProperties) => void;
};

const PHOTO_MAX_MIB = Math.round(PHOTO_MAX_BYTES / 1024 / 1024);

/** 投稿フォーム（画面 S-4）。地図の上にモーダルで出す。
 *
 * 入力欄は `lib/reports.ts` のカテゴリ定義から組み立てる。
 * **カテゴリを増やしてもこのファイルは変えなくてよい**のが、
 * 投稿を 1 モデルに統一した狙い（docs/design/requirements.md 4 章）。 */
export default function ReportForm({
  category,
  coordinates,
  onRepick,
  onClose,
  onSubmitted,
}: Props) {
  const def = reportCategoryDef(category);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [details, setDetails] = useState<Record<string, string>>(() =>
    Object.fromEntries(def.detailFields.map((field) => [field.key, field.options[0].value])),
  );
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 写真のサムネイル。作った URL は使い終わったら必ず解放する。
  // 作るのも解放するのも副作用の中でやる（作りっぱなしと二重解放のどちらも防ぐ）。
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [photos]);

  function addPhotos(selected: FileList | null) {
    if (!selected || selected.length === 0) return;
    const accepted: File[] = [];
    for (const file of Array.from(selected)) {
      if (photos.length + accepted.length >= PHOTO_MAX_COUNT) {
        setError(`写真は ${PHOTO_MAX_COUNT} 枚までです。`);
        break;
      }
      if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
        setError("写真は JPEG・PNG・WebP のいずれかを選んでください。");
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        setError(`「${file.name}」は ${PHOTO_MAX_MIB} MB を超えています。`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) setPhotos((prev) => [...prev, ...accepted]);
    // 同じファイルを選び直せるように入力をリセットする
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // モーダルは Escape で閉じられるようにする
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (trimmedTitle.length === 0) {
      setError("タイトルを入力してください。");
      return;
    }
    if (trimmedBody.length === 0) {
      setError("説明を入力してください。");
      return;
    }

    const form = new FormData();
    form.set("category", category);
    form.set("title", trimmedTitle);
    form.set("body", trimmedBody);
    // 座標は [経度, 緯度] の順で持っている。DB は lat / lon なので入れ替える
    form.set("lon", String(coordinates[0]));
    form.set("lat", String(coordinates[1]));
    form.set("details", JSON.stringify(details));
    for (const file of photos) form.append("photos", file);

    setSending(true);
    setError(null);
    const result = await submitReport(form);
    setSending(false);

    if (!result.ok) {
      setError(result.reason);
      return;
    }
    onSubmitted(result.value);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/40 p-3 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${def.label}を投稿する`}
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]"
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: def.color }}
          />
          <h2 className="min-w-0 flex-1 text-[15px] leading-tight font-semibold text-ink">
            {def.label}を投稿する
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="投稿をやめる"
            className="shrink-0 rounded-lg p-1.5 text-ink-muted transition hover:bg-[#f1f2f4] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          <section className="flex items-center gap-2.5 rounded-xl border border-line bg-[#fafafa] px-3 py-2.5">
            <MapPin aria-hidden className="size-4 shrink-0 text-ink-muted" />
            <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-ink-sub tabular-nums">
              投稿する場所: {coordinates[1].toFixed(5)}, {coordinates[0].toFixed(5)}
            </p>
            <button
              type="button"
              onClick={onRepick}
              className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-ink-sub transition hover:border-ink-muted/40 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              選び直す
            </button>
          </section>

          <label className="mt-3.5 block">
            <span className="flex items-baseline justify-between text-[11px] font-semibold tracking-wide text-ink-muted">
              タイトル
              <span className="font-normal tabular-nums">
                {title.length} / {TITLE_MAX_LENGTH}
              </span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={TITLE_MAX_LENGTH}
              required
              placeholder="例: ○○交差点のガードレールが折れている"
              className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5 text-[13.5px] text-ink transition placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
            />
          </label>

          <label className="mt-3 block">
            <span className="flex items-baseline justify-between text-[11px] font-semibold tracking-wide text-ink-muted">
              説明
              <span className="font-normal tabular-nums">
                {body.length} / {BODY_MAX_LENGTH}
              </span>
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={BODY_MAX_LENGTH}
              required
              rows={4}
              placeholder="どうなっているか、どのくらい危ないかを書いてください。"
              className="mt-1.5 w-full resize-y rounded-xl border border-line px-3 py-2.5 text-[13.5px] leading-relaxed text-ink transition placeholder:text-ink-muted/70 focus:border-ink focus:outline-none"
            />
          </label>

          {def.detailFields.map((field) => (
            <label key={field.key} className="mt-3 block">
              <span className="text-[11px] font-semibold tracking-wide text-ink-muted">
                {field.label}
              </span>
              <select
                value={details[field.key]}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[13.5px] text-ink transition focus:border-ink focus:outline-none"
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <section className="mt-3">
            <span className="text-[11px] font-semibold tracking-wide text-ink-muted">
              写真（任意・{PHOTO_MAX_COUNT} 枚まで・1 枚 {PHOTO_MAX_MIB} MB まで）
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {previews.map((url, index) => (
                <div
                  key={url}
                  className="relative size-20 overflow-hidden rounded-xl border border-line"
                >
                  {/* 選んだ写真のプレビュー。next/image は外部最適化を挟むので使わない */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`選択した写真 ${index + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`写真 ${index + 1} を外す`}
                    className="absolute top-1 right-1 rounded-lg bg-ink/70 p-1 text-white transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              ))}

              {photos.length < PHOTO_MAX_COUNT ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="grid size-20 place-items-center rounded-xl border border-dashed border-line text-ink-muted transition hover:border-ink-muted/60 hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <ImagePlus aria-hidden className="size-5" />
                  <span className="sr-only">写真を追加</span>
                </button>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_PHOTO_TYPES.join(",")}
              multiple
              onChange={(event) => addPhotos(event.target.files)}
              className="hidden"
            />
          </section>

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl bg-[#fdeeea] px-3 py-2.5 text-[12px] leading-relaxed text-[#7a2f10]"
            >
              <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={sending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            {sending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <Send aria-hidden className="size-4" />
            )}
            {sending ? "送信中…" : "投稿する"}
          </button>

          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-muted">
            投稿は表示名つきで誰でも見られます。自宅や個人が特定できる情報を書かないでください。
          </p>
        </form>
      </div>
    </div>
  );
}
