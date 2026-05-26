import { useId, useState } from "react";
import { api, type AuthSession } from "../lib/api";

type Props = {
  onLogin: (authSession: AuthSession) => void;
};

type Mode = "login" | "signup";

const SECURITY_CARDS = [
  {
    label: "Session",
    title: "7일 고정 세션",
    body: "자동 연장 없이 유지하고, 로그아웃 시 즉시 무효화합니다.",
  },
  {
    label: "Recovery",
    title: "운영자 계정 복구",
    body: "임시 비밀번호로 로그인한 뒤 바로 새 비밀번호를 설정하는 복구 흐름을 제공합니다.",
  },
  {
    label: "Audit",
    title: "로그인 이력 추적",
    body: "로그인 성공, 실패, 로그아웃 이벤트를 감사 로그에 남깁니다.",
  },
];

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const usernameId = useId();
  const passwordId = useId();
  const passwordConfirmId = useId();
  const errorId = useId();

  const isSignup = mode === "signup";

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (isSignup && password !== passwordConfirm) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const action = isSignup ? api.auth.signup : api.auth.login;
      const data = await action(username, password);
      onLogin(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        {/* 히어로 영역: 몽환적 그라디언트 오브제 데코레이션 중심 */}
        <div className="auth-hero">
          <div className="auth-headline">
            <span className="auth-eyebrow">Note Editor</span>
            <h1 id="auth-title" className="auth-title">
              생각을 기록하고 흐름을 이어가다
            </h1>
            <p className="auth-copy">
              나만의 독립된 공간에서 안전하게 노트를 관리하고 생각을 정리해 보세요.
            </p>
          </div>

          {/* 추상적인 몽환적 데코레이션 요소 */}
          <div className="auth-hero__decorations" aria-hidden="true">
            <div className="auth-hero__glow-sphere auth-hero__glow-sphere--1" />
            <div className="auth-hero__glow-sphere auth-hero__glow-sphere--2" />
            <div className="auth-hero__mockup">
              <div className="auth-hero__mockup-bar" />
              <div className="auth-hero__mockup-lines">
                <span className="auth-hero__mockup-line" />
                <span className="auth-hero__mockup-line auth-hero__mockup-line--short" />
              </div>
            </div>
          </div>
        </div>

        {/* 로그인/가입 패널 영역 */}
        <div className="auth-panel">
          {/* 정보 도움말 트리거 버튼 */}
          <button
            type="button"
            className={`auth-info-trigger${showInfo ? " is-active" : ""}`}
            onClick={() => setShowInfo(!showInfo)}
            aria-label="보안 및 세션 정책 안내 보기"
            aria-expanded={showInfo}
          >
            <svg
              className="auth-info-icon"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          <div className={`auth-panel__inner is-${mode}`}>
            <div className="auth-panel__header">
              <span className="auth-panel__kicker">
                {isSignup ? "Create account" : "Sign in"}
              </span>
              <h2 className="auth-panel__title">
                {isSignup ? "작업 공간 시작하기" : "작업 공간 진입하기"}
              </h2>
              <p className="auth-panel__subtitle">
                {isSignup
                  ? "가입 즉시 노트를 작성할 수 있는 개인 공간이 생성됩니다."
                  : "기존 세션을 통해 안전하게 보호된 노트로 연결됩니다."}
              </p>
            </div>

            {/* 깔끔한 미니멀 탭 전환 */}
            <div className="auth-switch" role="tablist" aria-label="인증 모드">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                className={`auth-switch__button${!isSignup ? " is-active" : ""}`}
                onClick={() => switchMode("login")}
              >
                로그인
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                className={`auth-switch__button${isSignup ? " is-active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                회원가입
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-field__label" htmlFor={usernameId}>
                  사용자명
                </label>
                <input
                  id={usernameId}
                  className="auth-field__input"
                  type="text"
                  placeholder="2~40자 사용자명"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  aria-describedby={error ? errorId : undefined}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-field__label" htmlFor={passwordId}>
                  비밀번호
                </label>
                <input
                  id={passwordId}
                  className="auth-field__input"
                  type="password"
                  placeholder="최소 6자 이상"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
                {isSignup && (
                  <span className="auth-field__hint">
                    비밀번호는 최소 6자 이상이어야 합니다.
                  </span>
                )}
              </div>

              {isSignup && (
                <div className="auth-field">
                  <label className="auth-field__label" htmlFor={passwordConfirmId}>
                    비밀번호 확인
                  </label>
                  <input
                    id={passwordConfirmId}
                    className="auth-field__input"
                    type="password"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    autoComplete="new-password"
                    aria-describedby={error ? errorId : undefined}
                    required
                  />
                </div>
              )}

              {error && (
                <p id={errorId} className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? (
                  <span className="auth-submit__spinner" />
                ) : isSignup ? (
                  "계정 생성 및 시작"
                ) : (
                  "로그인하여 시작"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 정보 도움말 오버레이 모달 (기존 복잡한 텍스트들을 깔끔히 흡수) */}
      <div
        className={`auth-info-backdrop${showInfo ? " is-visible" : ""}`}
        onClick={() => setShowInfo(false)}
        role="presentation"
      >
        <div
          className="auth-info-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="시스템 보안 및 세션 정책"
        >
          <div className="auth-info-modal__header">
            <h3 className="auth-info-modal__title">Workspace 정책 및 보안</h3>
            <button
              type="button"
              className="auth-info-modal__close"
              onClick={() => setShowInfo(false)}
              aria-label="닫기"
            >
              &times;
            </button>
          </div>
          <div className="auth-info-modal__body">
            <div className="auth-info-modal__grid">
              {SECURITY_CARDS.map((card) => (
                <article key={card.label} className="auth-info-modal__card">
                  <span className="auth-info-modal__card-label">
                    {card.label}
                  </span>
                  <strong className="auth-info-modal__card-title">
                    {card.title}
                  </strong>
                  <p className="auth-info-modal__card-body">{card.body}</p>
                </article>
              ))}
            </div>
            <div className="auth-info-modal__footer">
              <div className="auth-info-modal__chips" aria-label="보안 기술">
                <span className="auth-chip">HttpOnly 쿠키</span>
                <span className="auth-chip">SameSite=Lax</span>
                <span className="auth-chip">감사 로그 기록</span>
              </div>
              <p className="auth-info-modal__footer-text">
                비밀번호를 분실하신 경우 일반적인 찾기 대신, 운영자를 통한 계정 복구 흐름을 통해 임시 비밀번호를 발급받은 뒤 로그인하여 새 비밀번호를 설정할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

