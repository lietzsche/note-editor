import { useEffect, useState, type CSSProperties } from "react";
import {
  SPELL_CHECK_GUIDANCE,
  SPELL_CHECK_TOOLTIP,
  SPELL_CHECK_URL,
} from "../lib/externalLinks";
import {
  copyText,
  countGraphemes,
  splitTextForSpellCheck,
} from "../lib/editorProductivity";

type Props = {
  content: string;
  style?: CSSProperties;
  guidanceStyle?: CSSProperties;
  containerStyle?: CSSProperties;
};

type CopyState = "idle" | "success" | "error";

const SPELL_CHECK_CHUNK_OPTIONS = [250, 400, 700];

const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
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

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.44)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  zIndex: 1100,
};

const modalStyle: CSSProperties = {
  width: "min(720px, 100%)",
  maxHeight: "min(90vh, 900px)",
  overflow: "auto",
  background: "var(--color-surface)",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const helperMetaRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  alignItems: "center",
  fontSize: "12px",
  color: "var(--color-text-secondary)",
};

const helperBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "30px",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
};

const helperTextareaStyle: CSSProperties = {
  width: "100%",
  minHeight: "220px",
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
  fontSize: "14px",
  lineHeight: 1.7,
  resize: "vertical",
};

const helperFooterStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  justifyContent: "space-between",
  alignItems: "center",
};

const helperButtonRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: "40px",
  padding: "8px 12px",
  borderRadius: "10px",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  ...secondaryButtonStyle,
  background: "var(--color-primary)",
  borderColor: "var(--color-primary)",
  color: "var(--color-brand-contrast)",
};

const selectStyle: CSSProperties = {
  minHeight: "36px",
  padding: "4px 8px",
  borderRadius: "10px",
  border: "1px solid var(--color-border)",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
};

export function SpellCheckLink({
  content,
  style,
  guidanceStyle,
  containerStyle,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [chunkSize, setChunkSize] = useState(400);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const chunks = splitTextForSpellCheck(content, chunkSize);
  const activeChunk = chunks[chunkIndex] ?? "";
  const activeChunkCount = countGraphemes(activeChunk);

  useEffect(() => {
    if (chunkIndex < chunks.length) return;
    setChunkIndex(Math.max(chunks.length - 1, 0));
  }, [chunkIndex, chunks.length]);

  useEffect(() => {
    if (copyState === "idle" || typeof window === "undefined") return undefined;

    const timer = window.setTimeout(() => {
      setCopyState("idle");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function handleCopyCurrentChunk() {
    const result = await copyText(
      typeof navigator !== "undefined" ? navigator.clipboard : null,
      activeChunk
    );
    setCopyState(result === "success" ? "success" : "error");
  }

  async function handleCopyAndOpen() {
    await handleCopyCurrentChunk();
    if (typeof window !== "undefined") {
      window.open(SPELL_CHECK_URL, "_blank", "noopener,noreferrer");
    }
  }

  function handleOpenHelper() {
    setChunkIndex(0);
    setCopyState("idle");
    setIsOpen(true);
  }

  return (
    <div style={{ ...containerBaseStyle, ...containerStyle }}>
      <button
        type="button"
        title={SPELL_CHECK_TOOLTIP}
        aria-label="맞춤법 검사 도우미 열기"
        style={{ ...linkStyle, ...style, cursor: "pointer" }}
        onClick={handleOpenHelper}
      >
        맞춤법 검사
      </button>
      <span style={{ ...defaultGuidanceStyle, ...guidanceStyle }}>
        {SPELL_CHECK_GUIDANCE}
        {chunks.length > 1 ? ` 현재 문서는 ${chunks.length}개 조각으로 나뉩니다.` : ""}
      </span>

      {isOpen && (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="spell-check-helper-title">
          <div style={modalStyle}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <h2
                id="spell-check-helper-title"
                style={{ margin: 0, fontSize: "20px", color: "var(--color-text-primary)" }}
              >
                맞춤법 검사 도우미
              </h2>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
                외부 검사기의 페이지 전환 부담을 줄이기 위해 현재 노트를 짧은 조각으로 나눴습니다.
                조각을 복사한 뒤 새 탭에서 검사 사이트에 붙여넣어 진행하면 됩니다.
              </p>
            </div>

            <div style={helperMetaRowStyle}>
              <span style={helperBadgeStyle}>
                조각 {Math.min(chunkIndex + 1, chunks.length)} / {chunks.length}
              </span>
              <span style={helperBadgeStyle}>현재 조각 {activeChunkCount}자</span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                조각 길이
                <select
                  value={chunkSize}
                  onChange={(event) => {
                    setChunkSize(Number(event.target.value));
                    setChunkIndex(0);
                  }}
                  style={selectStyle}
                >
                  {SPELL_CHECK_CHUNK_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}자 안팎
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <textarea
              readOnly
              value={activeChunk}
              style={helperTextareaStyle}
              aria-label="맞춤법 검사용 현재 조각"
            />

            <div style={helperFooterStyle}>
              <div style={helperButtonRowStyle}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setChunkIndex((index) => Math.max(index - 1, 0))}
                  disabled={chunkIndex === 0}
                >
                  이전 조각
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setChunkIndex((index) => Math.min(index + 1, chunks.length - 1))}
                  disabled={chunkIndex >= chunks.length - 1}
                >
                  다음 조각
                </button>
              </div>

              <div style={helperButtonRowStyle}>
                <span style={{ ...helperBadgeStyle, borderColor: "transparent" }}>
                  {copyState === "success"
                    ? "복사됨"
                    : copyState === "error"
                      ? "복사 실패"
                      : "조각을 복사해 검사기에 붙여넣으세요"}
                </span>
                <button type="button" style={secondaryButtonStyle} onClick={() => { void handleCopyCurrentChunk(); }}>
                  현재 조각 복사
                </button>
                <a
                  href={SPELL_CHECK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  aria-label="바른한글 맞춤법 검사기 새 탭에서 열기"
                >
                  검사기만 열기
                </a>
                <button type="button" style={primaryButtonStyle} onClick={() => { void handleCopyAndOpen(); }}>
                  복사 후 검사기 열기
                </button>
                <button type="button" style={secondaryButtonStyle} onClick={() => setIsOpen(false)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
