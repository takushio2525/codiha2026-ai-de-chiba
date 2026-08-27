/** CHIZUBA のロゴマーク。
 *
 * **`app/src/app/icon.svg`（ブラウザタブ・ホーム画面のアイコン）と同じ図形**。
 * タブに出ているアイコンと画面の中のロゴが一致していないとブランドとして働かないので、
 * 形を変えるときは両方を必ず一緒に直す。
 *
 * 弧＝地図（等高線・海岸線）、点＝いまの場所。要素が 2 つだけなので 16px でも潰れない。
 */
export default function BrandMark({ className = "size-[18px]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={`${className} shrink-0`}
      // 角丸の地に白い弧を載せるので、地の色は塗りで持つ（currentColor にしない）
    >
      <rect width="32" height="32" rx="8" fill="#16181d" />
      <path
        d="M19.9 21.3A7.5 7.5 0 1 1 19.9 10.7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <circle cx="24.1" cy="16" r="3.1" fill="#0072b2" />
    </svg>
  );
}
