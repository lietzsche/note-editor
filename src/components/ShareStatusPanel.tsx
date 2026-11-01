import { useEffect, useRef, useState, type CSSProperties } from "react";
import { copyText } from "../lib/editorProductivity";

export type ShareInfo = {
  share_token: string | null;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  share_url: string | null;
} | null;

type ShareStatusPanelSize = "xs" | "sm" | "md" | "popover";

type Props = {
  styles: Record<string, CSSProperties>;
  shareInfo: ShareInfo;
  shareLoading: boolean;
  shareError: string | null;
  onShareToggle: () => void;
  size?: ShareStatusPanelSize;
  compactTrigger?: boolean;
};

export function ShareStatusPanel({
  styles,
  shareInfo,
  shareLoading,
  shareError,
  onShareToggle,
  size = "md",
  compactTrigger = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isActive = Boolean(shareInfo?.is_active && shareInfo.share_url);
  const iconOnly = size === "xs";
  const isPopover = size === "popover";
  const compact = size === "sm" || size === "xs";
  const shareUrl = shareInfo?.share_url ?? "#";
  const statusLabel = shareLoading ? "처리 중" : isActive ? "공유 중" : "비공개";
  const actionLabel = shareLoading ? "공유 처리 중" : isActive ? "공유 끄기" : "공유 링크 만들기";

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event: PointerEvent | MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (copyState === "idle") return undefined;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function handleCopyShareLink() {
    if (!shareInfo?.share_url) return;
    const fullUrl =
      typeof window !== "undefined" && shareInfo.share_url.startsWith("/")
        ? `${window.location.origin}${shareInfo.share_url}`
        : shareInfo.share_url;
    const result = await copyText(
      typeof navigator !== "undefined" ? navigator.clipboard : null,
      fullUrl
    );
    setCopyState(result === "success" ? "success" : "error");
  }

  if (isPopover) {
    return (
      <div ref={containerRef} style={popoverStyles.wrapper}>
        <button
          type="button"
          style={{
            ...(compactTrigger ? styles.toolbarIconButton : styles.secondaryActionBtn),
            ...(isActive ? popoverStyles.triggerActive : {}),
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`노트 공유 설정 (${statusLabel})`}
          title={`노트 공유 설정 (${statusLabel})`}
        >
          {shareLoading ? <LoadingIcon /> : <ShareIcon />}
          {!compactTrigger && (
            <>
              <span>공유</span>
              {isActive && <span style={popoverStyles.activeDot} aria-hidden="true" />}
            </>
          )}
        </button>

        {isOpen && (
          <section
            style={popoverStyles.card}
            role="dialog"
            aria-label="노트 공유 설정"
            aria-live="polite"
          >
            <div style={popoverStyles.header}>
              <div style={popoverStyles.headerCopy}>
                <span style={styles.shareStatusEyebrow}>PUBLIC SHARE</span>
                <strong style={styles.shareStatusTitle}>
                  {isActive ? "공개 링크가 켜져 있습니다" : "비공개 노트입니다"}
                </strong>
              </div>
              <span
                style={{
                  ...styles.shareStatusBadge,
                  ...(isActive ? styles.shareStatusBadgeActive : {}),
                }}
              >
                {statusLabel}
              </span>
            </div>

            <p style={styles.shareStatusDescription}>
              {isActive
                ? "링크를 가진 사람은 누구나 읽기 전용으로 열람할 수 있습니다."
                : "공개 링크를 생성하면 로그인 없이 노트를 읽을 수 있습니다."}
            </p>

            {shareError && (
              <div style={styles.shareStatusError} role="alert">
                {shareError}
              </div>
            )}

            {isActive && (
              <div style={popoverStyles.linkSection}>
                <div style={popoverStyles.urlRow}>
                  <code style={popoverStyles.urlCode}>{shareUrl}</code>
                  <button
                    type="button"
                    style={popoverStyles.copyBtn}
                    onClick={() => {
                      void handleCopyShareLink();
                    }}
                  >
                    {copyState === "success"
                      ? "복사됨!"
                      : copyState === "error"
                        ? "실패"
                        : "링크 복사"}
                  </button>
                </div>
                <div style={popoverStyles.metaRow}>
                  <span style={styles.shareMeta}>
                    조회 {shareInfo?.access_count ?? 0}회 · {formatExpiry(shareInfo?.expires_at ?? null)}
                  </span>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.shareLink}
                  >
                    새 탭에서 열기 ↗
                  </a>
                </div>
              </div>
            )}

            <div style={popoverStyles.footer}>
              <button
                type="button"
                style={{
                  ...styles.secondaryActionBtn,
                  ...(isActive ? styles.shareStopButton : styles.shareStartButton),
                  width: "100%",
                  justifyContent: "center",
                }}
                onClick={onShareToggle}
                disabled={shareLoading}
              >
                {shareLoading ? "처리 중..." : isActive ? "공유 끄기" : "공유 링크 만들기"}
              </button>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (iconOnly) {
    return (
      <section
        style={styles.shareStatusIconPanel}
        aria-label={`노트 공유 상태: ${statusLabel}`}
        aria-live="polite"
      >
        {shareError && (
          <span style={styles.shareStatusErrorInline} role="alert">
            {shareError}
          </span>
        )}
        {isActive && (
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...styles.shareIconButton, ...styles.shareOpenLinkButton }}
            aria-label="공유 링크 열기"
            title="공유 링크 열기"
          >
            <OpenLinkIcon />
          </a>
        )}
        <button
          type="button"
          style={{
            ...styles.shareIconButton,
            ...(isActive ? styles.shareStopButton : styles.shareStartButton),
            minHeight: "44px",
          }}
          onClick={onShareToggle}
          disabled={shareLoading}
          aria-label={actionLabel}
          title={actionLabel}
        >
          {shareLoading ? <LoadingIcon /> : isActive ? <ShareOffIcon /> : <ShareIcon />}
        </button>
      </section>
    );
  }

  return (
    <section
      style={{
        ...styles.shareStatusPanel,
        ...(compact ? styles.shareStatusPanelCompact : {}),
      }}
      aria-label="노트 공유 상태"
      aria-live="polite"
    >
      <div
        style={{
          ...styles.shareStatusHeader,
          ...(compact ? styles.shareStatusHeaderCompact : {}),
        }}
      >
        <div style={styles.shareStatusCopy}>
          <span style={styles.shareStatusEyebrow}>공유</span>
          <strong style={styles.shareStatusTitle}>
            {isActive ? "공개 링크가 켜져 있습니다" : "공개 링크가 꺼져 있습니다"}
          </strong>
          {!compact && (
            <span style={styles.shareStatusDescription}>
              {isActive
                ? "링크를 가진 사람은 로그인 없이 읽기 전용으로 이 노트를 볼 수 있습니다."
                : "필요할 때만 공개 링크를 만들고, 언제든지 즉시 끌 수 있습니다."}
            </span>
          )}
        </div>
        <span
          style={{
            ...styles.shareStatusBadge,
            ...(isActive ? styles.shareStatusBadgeActive : {}),
          }}
        >
          {statusLabel}
        </span>
      </div>

      {shareError && (
        <div style={styles.shareStatusError} role="alert">
          {shareError}
        </div>
      )}

      {isActive && (
        <div
          style={{
            ...styles.shareLinkBox,
            ...(compact ? styles.shareLinkBoxCompact : {}),
          }}
        >
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.shareLink}
          >
            공유 링크 열기
          </a>
          <span style={styles.shareMeta}>
            조회 {shareInfo?.access_count ?? 0}회 · {formatExpiry(shareInfo?.expires_at ?? null)}
          </span>
        </div>
      )}

      <div
        style={{
          ...styles.shareStatusActions,
          ...(compact ? styles.shareStatusActionsCompact : {}),
        }}
      >
        <button
          type="button"
          style={{
            ...styles.secondaryActionBtn,
            ...(isActive ? styles.shareStopButton : styles.shareStartButton),
          }}
          onClick={onShareToggle}
          disabled={shareLoading}
          aria-label={isActive ? "공유 비활성화" : "공유 활성화"}
        >
          {shareLoading ? "처리 중..." : isActive ? "공유 끄기" : "공유 링크 만들기"}
        </button>
      </div>
    </section>
  );
}

function OpenLinkIcon() {
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
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

function ShareIcon() {
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
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07l-1.62 1.62" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.62-1.62" />
    </svg>
  );
}

function ShareOffIcon() {
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
      <path d="m2 2 20 20" />
      <path d="M8.5 11.5 6.93 13.07a5 5 0 0 0 7.07 7.07l1.62-1.62" />
      <path d="M15.5 12.5 17.07 10.93A5 5 0 0 0 10 3.86L8.38 5.48" />
    </svg>
  );
}

function LoadingIcon() {
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
      <path d="M21 12a9 9 0 1 1-6-8.49" />
    </svg>
  );
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "만료 없음";

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "만료일 확인 필요";

  return `${date.toLocaleString("ko-KR")} 만료`;
}

const popoverStyles: Record<string, CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "inline-flex",
    flexShrink: 0,
  },
  triggerActive: {
    borderColor: "color-mix(in srgb, var(--color-success) 40%, var(--color-border-subtle))",
    background: "color-mix(in srgb, var(--color-success) 10%, var(--app-control-bg))",
    color: "var(--color-success)",
  },
  activeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "999px",
    background: "var(--color-success)",
  },
  card: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "min(300px, calc(100vw - 24px))",
    padding: "14px",
    borderRadius: "var(--radius-lg)",
    border: "1px solid var(--color-border-default)",
    background: "var(--color-bg-surface)",
    boxShadow: "var(--shadow-lg)",
    display: "grid",
    gap: "10px",
    zIndex: 80,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
  },
  headerCopy: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  linkSection: {
    display: "grid",
    gap: "8px",
    padding: "10px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border-subtle)",
    background: "var(--app-control-bg)",
  },
  urlRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  urlCode: {
    flex: 1,
    minWidth: 0,
    padding: "6px 8px",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-bg-canvas)",
    border: "1px solid var(--color-border-subtle)",
    color: "var(--color-text-primary)",
    fontSize: "12px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  copyBtn: {
    minHeight: "30px",
    padding: "0 10px",
    borderRadius: "var(--radius-sm)",
    background: "var(--color-bg-emphasis)",
    color: "var(--color-text-inverse)",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  },
  footer: {
    display: "flex",
    paddingTop: "4px",
  },
};
