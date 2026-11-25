import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api, type AuthSession } from "./lib/api";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotesPage = lazy(() => import("./pages/NotesPage"));
const SharedNotePage = lazy(() => import("./pages/SharedNotePage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));

type AuthState = "loading" | "authenticated" | "unauthenticated";

function AppLoadingScreen({
  title = "세션 상태를 확인하고 있습니다",
  body = "보호된 작업 공간에 안전하게 연결하는 중입니다.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="app-loading">
      <div className="app-loading__panel" role="status" aria-live="polite">
        <div className="app-loading__dot" aria-hidden="true" />
        <strong className="app-loading__title">{title}</strong>
        <p className="app-loading__body">{body}</p>
      </div>
    </div>
  );
}

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
    return <AppLoadingScreen />;
  }

  return (
    <Suspense
      fallback={
        <AppLoadingScreen
          title="화면을 불러오는 중입니다"
          body="필요한 편집 도구를 준비하고 있습니다."
        />
      }
    >
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
          path="/guide"
          element={
            <GuidePage
              isAuthenticated={auth === "authenticated"}
              username={currentUser?.username ?? null}
            />
          }
        />
        <Route
          path="/*"
          element={
            auth === "authenticated" && currentUser ? (
              <NotesPage
                key={currentUser.userId || currentUser.username}
                username={currentUser.username}
                accounts={currentUser.accounts ?? []}
                startupNoteId={currentUser.startupNoteId ?? null}
                passwordChangeRequired={currentUser.passwordChangeRequired}
                onSessionChange={(nextSession) => {
                  setCurrentUser(nextSession);
                  setAuth("authenticated");
                }}
                onStartupNoteIdChange={(startupNoteId) => {
                  setCurrentUser((prev) => (
                    prev
                      ? {
                        ...prev,
                        startupNoteId,
                      }
                      : prev
                  ));
                }}
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
                onLogout={(nextSession) => {
                  if (nextSession) {
                    setCurrentUser(nextSession);
                    setAuth("authenticated");
                  } else {
                    setAuth("unauthenticated");
                    setCurrentUser(null);
                  }
                }}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}
