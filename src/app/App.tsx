import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { ContentListWrapper } from "./components/ContentListWrapper.tsx";
import { ContentSettingsWrapper } from "./components/ContentSettingsWrapper.tsx";
import { ContentDispatcher } from "./components/ContentDispatcher.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { useAuth } from "./hooks/useAuth.ts";

function AppContent() {
  const { isAuthenticated, loading, login, logout, isLoggingIn, isLoggingOut } =
    useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} isLoggingIn={isLoggingIn} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RepositorySelector
            onSelect={(repoFullName) => {
              navigate(`/${repoFullName}`);
            }}
            onLogout={logout}
            isLoggingOut={isLoggingOut}
          />
        }
      />
      <Route
        path="/:owner/:repo"
        element={<ContentListWrapper />}
      />
      <Route
        path="/:owner/:repo/settings"
        element={<ContentSettingsWrapper />}
      />
      <Route
        path="/:owner/:repo/:contentId"
        element={<ContentDispatcher />}
      />
      <Route
        path="/:owner/:repo/:contentId/:articleId"
        element={<ContentDispatcher />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>,
);
