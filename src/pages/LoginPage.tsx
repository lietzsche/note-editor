import { useId, useState } from "react";
import { api } from "../lib/api";

type Props = {
  onLogin: (username: string) => void;
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
    body: "비밀번호를 잊은 경우 임시 비밀번호 발급으로 복구할 수 있습니다.",
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
      onLogin(data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-hero">
          <div className="auth-headline">
            <span className="auth-eyebrow">Note Editor Workspace</span>
            <h1 id="auth-title" className="auth-title">
              노트와 작업 흐름을 바로 이어가는 개인 작업 공간
            </h1>
            <p className="auth-copy">
              로그인과 가입을 같은 화면에서 처리하되, 세션 정책과 복구 방식을 바로 이해할 수 있게 정리했습니다.
            </p>
          </div>

          <div className="auth-storyboard" aria-hidden="true">
            <article className="auth-story-card auth-story-card--spotlight">
              <span className="auth-story-card__label">Workflow</span>
              <strong className="auth-story-card__title">로그인 후 바로 이어지는 편집 흐름</strong>
              <div className="auth-flow">
                <span className="auth-flow__step">로그인</span>
                <span className="auth-flow__divider" />
                <span className="auth-flow__step">그룹 선택</span>
                <span className="auth-flow__divider" />
                <span className="auth-flow__step">노트 편집</span>
              </div>
            </article>

            <div className="auth-storyboard__grid">
              {SECURITY_CARDS.map((card) => (
                <article key={card.label} className="auth-story-card">
                  <span className="auth-story-card__label">{card.label}</span>
                  <strong className="auth-story-card__title">{card.title}</strong>
                  <p className="auth-story-card__body">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel__inner">
            <div className="auth-panel__header">
              <span className="auth-panel__kicker">{isSignup ? "Create account" : "Sign in"}</span>
              <h2 className="auth-panel__title">
                {isSignup ? "작업 공간을 만들고 바로 시작하세요" : "기존 작업 공간으로 들어갑니다"}
              </h2>
              <p className="auth-panel__subtitle">
                {isSignup
                  ? "가입 즉시 세션이 생성되고 노트 화면으로 이동합니다."
                  : "로그인에 성공하면 보호된 노트 화면으로 바로 연결됩니다."}
              </p>
            </div>

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

            <div className="auth-mode-note" aria-live="polite">
              <strong>{isSignup ? "새 계정은 즉시 작업 가능한 상태로 열립니다." : "기존 세션이 없다면 다시 로그인해야 합니다."}</strong>
              <p>
                {isSignup
                  ? "username과 비밀번호만 준비하면 됩니다. 별도 이메일 확인 절차는 없습니다."
                  : "운영자가 비밀번호를 초기화했다면 전달받은 임시 비밀번호로 먼저 로그인하세요."}
              </p>
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
                <span className="auth-field__hint">
                  {isSignup
                    ? "비밀번호는 최소 6자 이상이어야 합니다."
                    : "로그인 실패가 누적되면 잠시 동안 시도가 제한됩니다."}
                </span>
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
                    placeholder="같은 비밀번호를 다시 입력"
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
                {loading ? "처리 중..." : isSignup ? "계정 만들기" : "로그인하기"}
              </button>
            </form>

            <div className="auth-meta">
              <div className="auth-meta__list" aria-label="인증 정책">
                <span className="auth-chip">HttpOnly 쿠키</span>
                <span className="auth-chip">SameSite=Lax</span>
                <span className="auth-chip">감사 로그 기록</span>
              </div>
              <p>
                비밀번호를 잊은 경우 일반적인 찾기 기능 대신 운영자 계정 복구 흐름으로 임시 비밀번호를 발급받습니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
