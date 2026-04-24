import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NotesPage from "./pages/NotesPage";
import SharedNotePage from "./pages/SharedNotePage";
import { api, type AuthSession } from "./lib/api";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [currentUser, setCurrentUser] = useState<AuthSession | null>(null);

  useEffect(() => {
    api.auth
      .me()
      .then((data) => {
        setCurrentUser(data);
        setAuth("authenticated");
      })
      .catch(() => {
        setCurrentUser(null);
        setAuth("unauthenticated");
      });
  }, []);

  if (auth === "loading") {
    return (
      <div className="app-loading">
        <div className="app-loading__panel" role="status" aria-live="polite">
          <div className="app-loading__dot" aria-hidden="true" />
          <strong className="app-loading__title">세션 상태를 확인하고 있습니다</strong>
          <p className="app-loading__body">보호된 작업 공간에 안전하게 연결하는 중입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth === "authenticated" ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage
              onLogin={(nextUser) => {
                setCurrentUser(nextUser);
                setAuth("authenticated");
              }}
            />
          )
        }
      />
      <Route
        path="/shared/:shareToken"
        element={<SharedNotePage />}
      />
      <Route
        path="/*"
        element={
          auth === "authenticated" ? (
            <NotesPage
              username={currentUser?.username ?? ""}
              passwordChangeRequired={currentUser?.passwordChangeRequired ?? false}
              onPasswordChangeRequiredChange={(passwordChangeRequired) => {
                setCurrentUser((prev) => (
                  prev
                    ? {
                      ...prev,
                      passwordChangeRequired,
                    }
                    : prev
                ));
              }}
              onLogout={() => {
                setAuth("unauthenticated");
                setCurrentUser(null);
              }}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
