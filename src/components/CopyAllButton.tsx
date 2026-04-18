import type { CSSProperties } from "react";

type Props = {
  onCopy: () => void;
  disabled?: boolean;
  state?: "ready" | "copy-success" | "copy-error";
  className?: string;
};

const baseStyle: CSSProperties = {
  minHeight: "44px",
  padding: "4px 12px",
  color: "var(--color-brand-contrast)",
  border: "none",
  borderRadius: "var(--radius)",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 500,
};

export function CopyAllButton({
  onCopy,
  disabled = false,
  state = "ready",
  className,
}: Props) {
  const label =
    state === "copy-success" ? "복사됨!" :
    state === "copy-error" ? "복사 실패" :
    "전체 복사";

  const background =
    state === "copy-success" ? "var(--color-success)" :
    state === "copy-error" ? "var(--color-danger)" :
    "var(--color-primary)";

  return (
    <button
      type="button"
      className={className}
      style={{
        ...baseStyle,
        background,
        opacity: disabled ? 0.64 : 1,
      }}
      onClick={onCopy}
      disabled={disabled}
      aria-label="현재 노트 전체 복사"
    >
      {label}
    </button>
  );
}
