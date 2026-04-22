import type { CSSProperties } from "react";
import {
  SPELL_CHECK_GUIDANCE,
  SPELL_CHECK_TOOLTIP,
  SPELL_CHECK_URL,
} from "../lib/externalLinks";

type Props = {
  style?: CSSProperties;
  guidanceStyle?: CSSProperties;
  containerStyle?: CSSProperties;
};

const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "36px",
  padding: "4px 10px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontSize: "12px",
  fontWeight: 600,
  textDecoration: "none",
};

const defaultGuidanceStyle: CSSProperties = {
  fontSize: "12px",
  color: "var(--color-text-secondary)",
  lineHeight: 1.4,
  whiteSpace: "normal",
  overflowWrap: "anywhere",
  flex: "1 1 18ch",
  minWidth: 0,
};

const containerBaseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  minWidth: 0,
};

export function SpellCheckLink({ style, guidanceStyle, containerStyle }: Props) {
  return (
    <div style={{ ...containerBaseStyle, ...containerStyle }}>
      <a
        href={SPELL_CHECK_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={SPELL_CHECK_TOOLTIP}
        aria-label="맞춤법 검사 새 탭에서 열기"
        style={{ ...linkStyle, ...style }}
      >
        맞춤법 검사
      </a>
      <span style={{ ...defaultGuidanceStyle, ...guidanceStyle }}>
        {SPELL_CHECK_GUIDANCE}
      </span>
    </div>
  );
}
