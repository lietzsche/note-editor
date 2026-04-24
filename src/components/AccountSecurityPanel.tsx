import { useEffect, useId, useState } from "react";

type Props = {
  isOpen: boolean;
  required: boolean;
  username: string;
  submitting: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  onClose: () => void;
  onLogout: () => void;
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => void;
};

export function AccountSecurityPanel({
  isOpen,
  required,
  username,
  submitting,
  errorMessage,
  successMessage,
  onClose,
  onLogout,
  onSubmit,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const currentPasswordId = useId();
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const feedbackId = useId();

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLocalError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!successMessage) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLocalError("");
  }, [successMessage]);

  if (!isOpen) return null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError("");

    if (newPassword.length < 6) {
      setLocalError("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("새 비밀번호와 확인 값이 일치하지 않습니다.");
      return;
    }
    if (currentPassword === newPassword) {
      setLocalError("새 비밀번호는 현재 비밀번호와 달라야 합니다.");
      return;
    }

    onSubmit({ currentPassword, newPassword });
  }

  const feedbackMessage = localError || errorMessage;
  const feedbackVariant = localError || errorMessage ? "error" : successMessage ? "success" : null;

  return (
    <div
      className="account-security__backdrop"
      onClick={() => {
        if (!required) onClose();
      }}
    >
      <section
        className="account-security"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-security-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="account-security__header">
          <div className="account-security__headerCopy">
            <span className="account-security__eyebrow">Account Security</span>
            <h2 id="account-security-title" className="account-security__title">
              {required ? "새 비밀번호 설정" : "계정 보안"}
            </h2>
            <p className="account-security__subtitle">
              {required
                ? `@${username} 계정은 임시 비밀번호 상태입니다. 계속 사용하려면 지금 새 비밀번호를 설정하세요.`
                : "현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다. 변경 후 다른 세션은 자동 로그아웃됩니다."}
            </p>
          </div>

          {!required && (
            <button
              type="button"
              className="account-security__close"
              onClick={onClose}
              aria-label="계정 보안 패널 닫기"
            >
              닫기
            </button>
          )}
        </header>

        <div className="account-security__body">
          <section className="account-security__notice" aria-label="보안 안내">
            <div>
              <strong>{required ? "임시 비밀번호 로그인 감지" : "비밀번호 변경 시 다른 세션이 종료됩니다"}</strong>
              <p>
                {required
                  ? "운영자가 발급한 임시 비밀번호는 복구용 진입 수단입니다. 새 비밀번호를 저장하면 이 상태가 즉시 해제됩니다."
                  : "보안 설정을 바꾸면 현재 세션만 유지되고, 다른 브라우저나 기기의 기존 로그인은 다시 인증해야 합니다."}
              </p>
            </div>
            <span className="account-security__badge">{required ? "필수" : "보안"}</span>
          </section>

          <form className="account-security__form" onSubmit={handleSubmit}>
            <label className="account-security__field" htmlFor={currentPasswordId}>
              <span>현재 비밀번호</span>
              <input
                id={currentPasswordId}
                className="account-security__input"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>

            <label className="account-security__field" htmlFor={newPasswordId}>
              <span>새 비밀번호</span>
              <input
                id={newPasswordId}
                className="account-security__input"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <label className="account-security__field" htmlFor={confirmPasswordId}>
              <span>새 비밀번호 확인</span>
              <input
                id={confirmPasswordId}
                className="account-security__input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>

            <p className="account-security__hint">
              최소 6자 이상, 현재 비밀번호와 다른 값으로 설정하세요.
            </p>

            {feedbackVariant && (
              <p
                id={feedbackId}
                className={`account-security__feedback account-security__feedback--${feedbackVariant}`}
                role={feedbackVariant === "error" ? "alert" : "status"}
              >
                {feedbackVariant === "error" ? feedbackMessage : successMessage}
              </p>
            )}

            <div className="account-security__actions">
              {required ? (
                <button
                  type="button"
                  className="account-security__action account-security__action--secondary"
                  onClick={onLogout}
                  disabled={submitting}
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  className="account-security__action account-security__action--secondary"
                  onClick={onClose}
                  disabled={submitting}
                >
                  취소
                </button>
              )}
              <button
                type="submit"
                className="account-security__action account-security__action--primary"
                disabled={submitting}
                aria-describedby={feedbackVariant ? feedbackId : undefined}
              >
                {submitting ? "저장 중..." : required ? "새 비밀번호 저장" : "비밀번호 변경"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
