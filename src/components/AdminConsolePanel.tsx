import type {
  AdminPasswordResetAuditEntry,
  AdminPasswordResetResult,
  AdminUser,
} from "../lib/api";

type PasswordCopyState = "idle" | "success" | "error";

type Props = {
  isOpen: boolean;
  currentUsername: string;
  searchQuery: string;
  users: AdminUser[];
  usersLoading: boolean;
  usersError: string | null;
  auditEntries: AdminPasswordResetAuditEntry[];
  auditLoading: boolean;
  auditError: string | null;
  actionError: string | null;
  pendingResetUserId: string | null;
  resetBusyUserId: string | null;
  resetResult: AdminPasswordResetResult | null;
  passwordCopyState: PasswordCopyState;
  onClose: () => void;
  onSearchQueryChange: (value: string) => void;
  onRequestReset: (userId: string) => void;
  onCancelReset: () => void;
  onConfirmReset: (userId: string) => void;
  onCopyPassword: () => void;
  onDismissResetResult: () => void;
};

export function AdminConsolePanel({
  isOpen,
  currentUsername,
  searchQuery,
  users,
  usersLoading,
  usersError,
  auditEntries,
  auditLoading,
  auditError,
  actionError,
  pendingResetUserId,
  resetBusyUserId,
  resetResult,
  passwordCopyState,
  onClose,
  onSearchQueryChange,
  onRequestReset,
  onCancelReset,
  onConfirmReset,
  onCopyPassword,
  onDismissResetResult,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="admin-console__backdrop" onClick={onClose}>
      <aside
        className="admin-console"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-console-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-console__header">
          <div className="admin-console__headerCopy">
            <span className="admin-console__eyebrow">Admin Console</span>
            <h2 id="admin-console-title" className="admin-console__title">
              계정 복구
            </h2>
            <p className="admin-console__subtitle">
              사용자 검색, 임시 비밀번호 발급, 그리고 복구 이력 확인을 한 패널에서 처리합니다.
            </p>
          </div>
          <button
            type="button"
            className="admin-console__close"
            onClick={onClose}
            aria-label="운영자 패널 닫기"
          >
            닫기
          </button>
        </header>

        <div className="admin-console__body">
          <section className="admin-console__notice" aria-label="주의 안내">
            <div>
              <strong>비밀번호 초기화는 즉시 적용됩니다</strong>
              <p>
                대상 사용자의 기존 세션은 바로 만료되고, 임시 비밀번호로 로그인한 뒤 새 비밀번호를 직접 설정해야 합니다.
              </p>
            </div>
            <span className="admin-console__noticeBadge">세션 강제 만료</span>
          </section>

          {actionError && (
            <p className="admin-console__feedback admin-console__feedback--error" role="alert">
              {actionError}
            </p>
          )}

          {resetResult && (
            <section className="admin-console__section admin-console__section--result">
              <div className="admin-console__sectionHeader">
                <div>
                  <span className="admin-console__sectionEyebrow">Temporary Password</span>
                  <h3 className="admin-console__sectionTitle">
                    @{resetResult.username} 초기화 완료
                  </h3>
                </div>
                <button
                  type="button"
                  className="admin-console__textButton"
                  onClick={onDismissResetResult}
                >
                  숨기기
                </button>
              </div>

              <p className="admin-console__resultCopy">
                이 비밀번호는 다시 조회할 수 없으니, 필요한 채널로 바로 전달해야 합니다. 사용자는 이 값으로 로그인한 직후 새 비밀번호 설정 화면으로 이동합니다.
              </p>

              <div className="admin-console__passwordBox">
                <code>{resetResult.tempPassword}</code>
                <button
                  type="button"
                  className="admin-console__action admin-console__action--secondary"
                  onClick={onCopyPassword}
                >
                  {passwordCopyState === "success"
                    ? "복사 완료"
                    : passwordCopyState === "error"
                      ? "복사 실패"
                      : "비밀번호 복사"}
                </button>
              </div>

              <dl className="admin-console__resultMeta">
                <div>
                  <dt>초기화 시각</dt>
                  <dd>{formatDateTime(resetResult.resetAt)}</dd>
                </div>
                <div>
                  <dt>수행 운영자</dt>
                  <dd>@{resetResult.resetBy}</dd>
                </div>
              </dl>
            </section>
          )}

          <section className="admin-console__section">
            <div className="admin-console__sectionHeader">
              <div>
                <span className="admin-console__sectionEyebrow">Users</span>
                <h3 className="admin-console__sectionTitle">사용자 검색</h3>
              </div>
              <span className="admin-console__sectionMeta">
                {searchQuery.trim() ? "검색 결과" : "최근 계정"}
              </span>
            </div>

            <label className="admin-console__search">
              <span className="admin-console__searchLabel">username 검색</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="username 일부를 입력하세요"
                className="admin-console__searchInput"
              />
            </label>

            {usersError && (
              <p className="admin-console__feedback admin-console__feedback--error" role="alert">
                {usersError}
              </p>
            )}

            {usersLoading ? (
              <div className="admin-console__empty">사용자 목록을 불러오는 중입니다.</div>
            ) : users.length === 0 ? (
              <div className="admin-console__empty">조건에 맞는 사용자가 없습니다.</div>
            ) : (
              <ul className="admin-console__userList">
                {users.map((user) => {
                  const isSelf = user.username === currentUsername;
                  const isPending = pendingResetUserId === user.id;
                  const isBusy = resetBusyUserId === user.id;

                  return (
                    <li key={user.id} className="admin-console__userItem">
                      <div className="admin-console__userCopy">
                        <strong>@{user.username}</strong>
                        <span>가입일 {formatDateTime(user.created_at)}</span>
                      </div>

                      <div className="admin-console__userActions">
                        {isSelf ? (
                          <span className="admin-console__badge">현재 계정</span>
                        ) : isPending ? (
                          <>
                            <button
                              type="button"
                              className="admin-console__action admin-console__action--ghost"
                              onClick={onCancelReset}
                              disabled={isBusy}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="admin-console__action admin-console__action--danger"
                              onClick={() => onConfirmReset(user.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? "초기화 중..." : "정말 초기화"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-console__action admin-console__action--primary"
                            onClick={() => onRequestReset(user.id)}
                            disabled={Boolean(resetBusyUserId)}
                          >
                            임시 비밀번호 발급
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="admin-console__section">
            <div className="admin-console__sectionHeader">
              <div>
                <span className="admin-console__sectionEyebrow">Audit</span>
                <h3 className="admin-console__sectionTitle">최근 초기화 이력</h3>
              </div>
              <span className="admin-console__sectionMeta">최신순</span>
            </div>

            {auditError && (
              <p className="admin-console__feedback admin-console__feedback--error" role="alert">
                {auditError}
              </p>
            )}

            {auditLoading ? (
              <div className="admin-console__empty">감사 이력을 불러오는 중입니다.</div>
            ) : auditEntries.length === 0 ? (
              <div className="admin-console__empty">초기화 이력이 아직 없습니다.</div>
            ) : (
              <ol className="admin-console__auditList">
                {auditEntries.map((entry) => (
                  <li key={entry.id} className="admin-console__auditItem">
                    <div className="admin-console__auditCopy">
                      <strong>
                        @{entry.admin_username} → @{entry.target_username}
                      </strong>
                      <span>{formatDateTime(entry.created_at)}</span>
                    </div>
                    <span className="admin-console__badge">{entry.reset_mode}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
