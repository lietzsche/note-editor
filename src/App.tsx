import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import NotesPage from "./pages/NotesPage";
import { api } from "./lib/api";

type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const [username, setUsername] = useState("");

  useEffect(() => {
    api.auth
      .me()
      .then((data) => {
        setUsername(data.username);
        setAuth("authenticated");
      })
      .catch(() => setAuth("unauthenticated"));
  }, []);

  if (auth === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        로딩 중...
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
              onLogin={(u) => {
                setUsername(u);
                setAuth("authenticated");
              }}
            />
          )
        }
      />
      <Route
        path="/*"
        element={
          auth === "authenticated" ? (
            <NotesPage
              username={username}
              onLogout={() => {
                setAuth("unauthenticated");
                setUsername("");
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
