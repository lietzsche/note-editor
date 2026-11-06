import React from "react";
import type { MarkdownFormatType } from "../lib/markdownFormat";

export interface EditorMarkdownToolbarProps {
  onApplyFormat: (formatType: MarkdownFormatType) => void;
  isMobile?: boolean;
  disabled?: boolean;
}

interface ToolbarAction {
  id: MarkdownFormatType;
  label: string;
  tooltip: string;
  icon: React.ReactNode;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    id: "h2",
    label: "제목 2",
    tooltip: "제목 2 (##)",
    icon: (
      <span style={{ fontWeight: 700, fontSize: "13px", letterSpacing: "-0.5px" }}>
        H2
      </span>
    ),
  },
  {
    id: "h3",
    label: "제목 3",
    tooltip: "제목 3 (###)",
    icon: (
      <span style={{ fontWeight: 700, fontSize: "12px", letterSpacing: "-0.5px" }}>
        H3
      </span>
    ),
  },
  {
    id: "bold",
    label: "굵게",
    tooltip: "굵게 (Ctrl+B)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      </svg>
    ),
  },
  {
    id: "italic",
    label: "기울임",
    tooltip: "기울임 (Ctrl+I)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="19" y1="4" x2="10" y2="4" />
        <line x1="14" y1="20" x2="5" y2="20" />
        <line x1="15" y1="4" x2="9" y2="20" />
      </svg>
    ),
  },
  {
    id: "strike",
    label: "취소선",
    tooltip: "취소선 (~~)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 4H9a3 3 0 0 0-2.83 4" />
        <path d="M14 12a4 4 0 0 1 0 8H6" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    ),
  },
  {
    id: "bullet",
    label: "불릿 목록",
    tooltip: "불릿 목록 (-)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4" cy="6" r="1.5" fill="currentColor" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
        <circle cx="4" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "task",
    label: "체크박스",
    tooltip: "할 일 체크박스 (- [ ])",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="5" width="14" height="14" rx="2" />
        <path d="m7 12 3 3 7-7" />
      </svg>
    ),
  },
  {
    id: "code",
    label: "코드",
    tooltip: "인라인/블록 코드 (`)",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

export function EditorMarkdownToolbar({
  onApplyFormat,
  isMobile = false,
  disabled = false,
}: EditorMarkdownToolbarProps): React.JSX.Element {
  return (
    <div
      role="toolbar"
      aria-label="마크다운 서식 도구"
      style={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? "4px" : "6px",
        padding: isMobile ? "6px 10px" : "8px 16px",
        background: "var(--app-panel-bg)",
        borderBottom: "1px solid var(--color-border-subtle)",
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        flexShrink: 0,
        zIndex: 5,
      }}
    >
      {TOOLBAR_ACTIONS.map((action, index) => {
        // Add visual dividers between heading, inline, and block styles
        const showDivider = index === 2 || index === 5;
        return (
          <React.Fragment key={action.id}>
            {showDivider && (
              <span
                role="separator"
                aria-orientation="vertical"
                style={{
                  display: "inline-block",
                  width: "1px",
                  height: "16px",
                  background: "var(--color-border-subtle)",
                  margin: "0 2px",
                  flexShrink: 0,
                }}
              />
            )}
            <button
              type="button"
              disabled={disabled}
              title={action.tooltip}
              aria-label={action.label}
              onMouseDown={(e) => {
                // Prevent textarea from losing focus
                e.preventDefault();
              }}
              onClick={() => onApplyFormat(action.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: isMobile ? "34px" : "32px",
                height: isMobile ? "34px" : "30px",
                padding: "0 6px",
                borderRadius: "var(--radius-sm, 6px)",
                border: "1px solid transparent",
                background: "transparent",
                color: "var(--color-text-secondary)",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
                flexShrink: 0,
                fontSize: "13px",
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = "var(--app-control-bg)";
                  e.currentTarget.style.color = "var(--color-text-primary)";
                  e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-text-secondary)";
                  e.currentTarget.style.borderColor = "transparent";
                }
              }}
            >
              {action.icon}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
