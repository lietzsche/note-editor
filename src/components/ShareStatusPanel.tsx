import type { CSSProperties } from "react";

export type ShareInfo = {
  share_token: string | null;
  is_active: boolean;
  expires_at: string | null;
  access_count: number;
  share_url: string | null;
} | null;

type ShareStatusPanelSize = "sm" | "md";

type Props = {
  styles: Record<string, CSSProperties>;
  shareInfo: ShareInfo;
  shareLoading: boolean;
  shareError: string | null;
  onShareToggle: () => void;
  size?: ShareStatusPanelSize;
};

export function ShareStatusPanel({
  styles,
  shareInfo,
  shareLoading,
  shareError,
  onShareToggle,
  size = "md",
}: Props) {
  const isActive = Boolean(shareInfo?.is_active && shareInfo.share_url);
  const compact = size === "sm";
  const shareUrl = shareInfo?.share_url ?? "#";
  const statusLabel = shareLoading ? "처리 중" : isActive ? "공유 중" : "비공개";

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

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return "만료 없음";

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "만료일 확인 필요";

  return `${date.toLocaleString("ko-KR")} 만료`;
}
