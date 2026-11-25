import { useState, type FormEvent } from "react";
import { api, ApiError, type AccountSummary, type AuthSession } from "../lib/api";
import { useModalFocus } from "../lib/useModalFocus";
import { useBackHandler } from "../lib/useBackHandler";
import "../styles/account-switcher.css";

const MAX_ACCOUNTS = 5;

type SwitcherSectionProps = {
  accounts: AccountSummary[];
  busy?: boolean;
  onSwitchAccount: (userId: string) => void;
  onRequestAddAccount: () => void;
  onLogoutAll?: () => void;
};

export function AccountSwitcherSection({
  accounts,
  busy = false,
  onSwitchAccount,
  onRequestAddAccount,
  onLogoutAll,
}: SwitcherSectionProps) {
  const canAddMore = accounts.length < MAX_ACCOUNTS;

  return (
    <div className="account-switcher" aria-label="다중 계정 전환">
      <div className="account-switcher__header">
        <span className="account-switcher__label">로그인된 계정</span>
        <span className="account-switcher__count">
          {accounts.length}/{MAX_ACCOUNTS}
        </span>
      </div>

      {accounts.length > 0 && (
        <div className="account-switcher__list" role="list">
          {accounts.map((account) => (
            <button
              key={account.userId}
              type="button"
              role="listitem"
              className={`account-switcher__item${account.isActive ? " account-switcher__item--active" : ""}`}
              disabled={busy || account.isActive}
              aria-current={account.isActive ? "true" : undefined}
              onClick={() => onSwitchAccount(account.userId)}
            >
              <span className="account-switcher__name">@{account.username}</span>
              {account.isActive && (
                <span className="account-switcher__badge">사용 중</span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="account-switcher__actions">
        <button
          type="button"
          className="account-switcher__addBtn"
          disabled={busy || !canAddMore}
          title={canAddMore ? "다른 계정으로 추가 로그인" : `최대 ${MAX_ACCOUNTS}개 계정까지 로그인할 수 있습니다`}
          onClick={onRequestAddAccount}
        >
          + 다른 계정 로그인
        </button>
        {accounts.length > 1 && onLogoutAll && (
          <button
            type="button"
            className="account-switcher__logoutAllBtn"
            disabled={busy}
            onClick={onLogoutAll}
          >
            모든 계정 로그아웃
          </button>
        )}
      </div>
    </div>
  );
}

type AddAccountModalProps = {
  open: boolean;
  onClose: () => void;
  onAdded: (session: AuthSession) => void;
};

export function AddAccountModal({ open, onClose, onAdded }: AddAccountModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const modalRef = useModalFocus<HTMLDivElement>({
    active: open,
    onEscape: () => {
      if (!submitting) onClose();
    },
  });
  useBackHandler(open, () => {
    if (!submitting) onClose();
  });

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const nextSession = await api.auth.login(username.trim(), password);
      setUsername("");
      setPassword("");
      onAdded(nextSession);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("계정 로그인에 실패했습니다. 잠시 후 다시 시도하세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="account-switcher__modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="account-switcher__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-account-modal-title"
        tabIndex={-1}
      >
        <div className="account-switcher__modalHeader">
          <div>
            <h2 id="add-account-modal-title" className="account-switcher__modalTitle">
              다른 계정 로그인
            </h2>
            <p className="account-switcher__modalDesc">
              현재 로그인을 유지한 채 다른 계정을 추가하고 바로 전환합니다.
            </p>
          </div>
          <button
            type="button"
            className="account-switcher__modalClose"
            onClick={onClose}
            disabled={submitting}
          >
            닫기
          </button>
        </div>

        <form className="account-switcher__form" onSubmit={handleSubmit}>
          <label className="account-switcher__field">
            <span className="account-switcher__fieldLabel">아이디</span>
            <input
              data-autofocus
              type="text"
              className="account-switcher__input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              disabled={submitting}
            />
          </label>
          <label className="account-switcher__field">
            <span className="account-switcher__fieldLabel">비밀번호</span>
            <input
              type="password"
              className="account-switcher__input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </label>

          {error && (
            <p className="account-switcher__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="account-switcher__submit"
            disabled={submitting || !username.trim() || !password}
          >
            {submitting ? "로그인 중..." : "계정 추가 및 전환"}
          </button>
        </form>
      </div>
    </div>
  );
}
