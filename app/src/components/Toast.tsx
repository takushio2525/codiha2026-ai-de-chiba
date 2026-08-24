"use client";

import { CircleAlert, Info, X } from "lucide-react";

export type ToastKind = "info" | "warning";
export type ToastMessage = { kind: ToastKind; text: string };

/** 画面上部に出す短い通知。位置情報の拒否やデータ取得の失敗を黙って捨てないため。 */
export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const warning = toast.kind === "warning";
  const Icon = warning ? CircleAlert : Info;
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-auto flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-[0_14px_30px_-18px_rgb(0_0_0/0.6)]",
        warning ? "bg-[#7a2f10] text-white" : "bg-ink text-white",
      ].join(" ")}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{toast.text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="通知を閉じる"
        className="-mr-1 -mt-0.5 rounded-lg p-1 text-white/70 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
