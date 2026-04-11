import { useState } from "react";
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

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>노트 에디터</h1>
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(mode === "login" ? styles.activeTab : {}) }}
            onClick={() => switchMode("login")}
          >
            로그인
          </button>
          <button
            style={{ ...styles.tab, ...(mode === "signup" ? styles.activeTab : {}) }}
            onClick={() => switchMode("signup")}
          >
            회원가입
          </button>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="사용자명"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <input
            style={styles.input}
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {mode === "signup" && (
            <input
              style={styles.input}
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          )}
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.submitBtn} type="submit" disabled={loading}>
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "var(--color-bg)",
  },
  card: {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)",
    padding: "32px",
    width: "100%",
    maxWidth: "360px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "24px",
    color: "var(--color-text-primary)",
  },
  tabs: {
    display: "flex",
    marginBottom: "20px",
    borderBottom: "1px solid var(--color-border)",
  },
  tab: {
    flex: 1,
    padding: "8px",
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    cursor: "pointer",
    color: "var(--color-text-secondary)",
    fontWeight: 500,
  },
  activeTab: {
    borderBottom: "2px solid var(--color-primary)",
    color: "var(--color-primary)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius)",
    outline: "none",
    width: "100%",
  },
  error: {
    color: "var(--color-danger)",
    fontSize: "13px",
  },
  submitBtn: {
    padding: "10px",
    background: "var(--color-primary)",
    color: "#fff",
    border: "none",
    borderRadius: "var(--radius)",
    fontWeight: 600,
    cursor: "pointer",
  },
};
