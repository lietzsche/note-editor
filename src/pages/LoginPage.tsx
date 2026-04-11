import { useId, useState } from "react";
import { api } from "../lib/api";

type Props = {
  onLogin: (username: string) => void;
};

type Mode = "login" | "signup";

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

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const action = mode === "login" ? api.auth.login : api.auth.signup;
      const data = await action(username, password);
      onLogin(data.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-hero">
          <div className="auth-headline">
            <span className="auth-eyebrow">Secure Auth</span>
            <h1 id="auth-title" className="auth-title">
              안전하게 로그인하고 작업을 이어가세요
            </h1>
            <p className="auth-copy">
              인증 영역은 세션 보호, 로그인 시도 제한, 감사 로그를 기본으로 적용합니다.
            </p>
          </div>

          <div className="auth-highlights" aria-hidden="true">
            <div className="auth-highlight">
              <span className="auth-highlight__label">Session</span>
              <strong className="auth-highlight__value">7일 고정 세션</strong>
              <span className="auth-highlight__meta">로그아웃 시 즉시 무효화</span>
            </div>
            <div className="auth-highlight">
              <span className="auth-highlight__label">Protection</span>
              <strong className="auth-highlight__value">시도 제한 + 감사 로그</strong>
              <span className="auth-highlight__meta">실패/성공/로그아웃 이벤트 기록</span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel__inner">
            <div className="auth-panel__header">
              <h2 className="auth-panel__title">
                {isSignup ? "계정을 만들고 바로 시작하세요" : "작업 공간에 로그인"}
              </h2>
              <p className="auth-panel__subtitle">
                {isSignup
                  ? "가입 후 즉시 세션이 생성되며 노트 작업 화면으로 이동합니다."
                  : "이전 세션이 없으면 로그인 화면으로 이동하고 보호 API 접근이 차단됩니다."}
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
                  placeholder="최소 6자"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  aria-describedby={error ? errorId : undefined}
                  required
                />
                <span className="auth-field__hint">세션 TTL 기본값은 7일이며 자동 갱신은 비활성화됩니다.</span>
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
                    placeholder="동일한 비밀번호를 다시 입력"
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
                {loading ? "처리 중..." : isSignup ? "계정 만들기" : "로그인"}
              </button>
            </form>

            <div className="auth-meta">
              <div className="auth-meta__list" aria-label="인증 보안 정책">
                <span className="auth-chip">HttpOnly 쿠키</span>
                <span className="auth-chip">SameSite=Lax</span>
                <span className="auth-chip">HTTPS 시 Secure</span>
              </div>
              <p>로그인 실패가 누적되면 일정 시간 동안 재시도가 제한됩니다.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
