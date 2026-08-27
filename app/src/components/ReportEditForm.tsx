"use client";

import { useState } from "react";
import { LoaderCircle, Save, X } from "lucide-react";

import {
  BODY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  reportCategoryDef,
  type ReportProperties,
} from "@/lib/reports";
import { patchReport } from "@/lib/reportsApi";

type Props = {
  report: ReportProperties;
  /** 保存できたら、サーバーが返した最新の姿を渡す */
  onSaved: (report: ReportProperties) => void;
  onCancel: () => void;
};

/**
 * 投稿者本人による本文の編集（画面 S-3 の中・interfaces.md I-5 の PATCH）。
 *
 * 編集できるのは**タイトル・説明・カテゴリ固有の項目**だけ。
 * **位置と写真は変えられない**（位置を後から動かせると、写真と現場が食い違う）。
 * 浸水投稿の雨量はサーバーが焼き込んだ値なので、ここには出てこないし消えもしない
 * （`updateReport` が `details` を重ねて更新する）。
 */
export default function ReportEditForm({ report, onSaved, onCancel }: Props) {
  const def = reportCategoryDef(report.category);
  const [title, setTitle] = useState(report.title);
  const [body, setBody] = useState(report.body);
  const [details, setDetails] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of def.detailFields) {
      const value = report.details?.[field.key];
      if (typeof value === "string") initial[field.key] = value;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const empty = title.trim().length === 0 || body.trim().length === 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || empty) return;

    setSaving(true);
    const result = await patchReport(report.id, { title: title.trim(), body: body.trim(), details });
    setSaving(false);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setError(null);
    onSaved(result.value);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-line bg-[#fafafa] p-3">
      <h3 className="text-[11px] font-semibold tracking-wide text-ink-muted">投稿を編集する</h3>

      <label className="mt-2 block">
        <span className="text-[11.5px] font-medium text-ink-sub">タイトル</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink transition focus:border-ink focus:outline-none"
        />
      </label>

      <label className="mt-2 block">
        <span className="text-[11.5px] font-medium text-ink-sub">説明</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={BODY_MAX_LENGTH}
          rows={5}
          className="mt-1 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-ink transition focus:border-ink focus:outline-none"
        />
        <span className="mt-0.5 block text-right text-[11px] text-ink-muted tabular-nums">
          {body.length} / {BODY_MAX_LENGTH}
        </span>
      </label>

      {def.detailFields.map((field) => (
        <label key={field.key} className="mt-2 block">
          <span className="text-[11.5px] font-medium text-ink-sub">{field.label}</span>
          <select
            value={details[field.key] ?? ""}
            onChange={(event) =>
              setDetails((prev) => ({ ...prev, [field.key]: event.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-ink transition focus:border-ink focus:outline-none"
          >
            <option value="">選ばない</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving || empty}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#31353d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-45"
        >
          {saving ? (
            <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
          ) : (
            <Save aria-hidden className="size-3.5" />
          )}
          保存する
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-[12.5px] font-medium text-ink-sub transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <X aria-hidden className="size-3.5" />
          やめる
        </button>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-[11.5px] leading-relaxed text-[#7a2f10]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
