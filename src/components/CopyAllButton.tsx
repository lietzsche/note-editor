import type { CSSProperties } from "react";

type Props = {
  onCopy: () => void;
  disabled?: boolean;
  state?: "ready" | "copy-success" | "copy-error";
  className?: string;
  compact?: boolean;
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
  compact = false,
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
        ...(compact ? compactStyle : {}),
        background,
        opacity: disabled ? 0.64 : 1,
      }}
      onClick={onCopy}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {compact ? <CopyIcon /> : label}
    </button>
  );
}

const compactStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "44px",
  width: "44px",
  padding: 0,
  borderRadius: "999px",
  flexShrink: 0,
};

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
