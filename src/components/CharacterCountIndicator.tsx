import type { CSSProperties } from "react";

type Props = {
  count: number;
  state?: "count-ready" | "count-stale";
  label?: string;
  className?: string;
};

const baseStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-text-secondary)",
};

export function CharacterCountIndicator({
  count,
  state = "count-ready",
  label = "자",
  className,
}: Props) {
  return (
    <span
      className={className}
      aria-live="polite"
      style={{
        ...baseStyle,
        opacity: state === "count-stale" ? 0.72 : 1,
      }}
    >
      {state === "count-stale" ? `${count}${label} · 갱신 중` : `${count}${label}`}
    </span>
  );
}
