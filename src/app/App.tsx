import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { ContentListWrapper } from "./bindings/ContentListWrapper.tsx";
import { ContentSettingsWrapper } from "./bindings/ContentSettingsWrapper.tsx";
import { ContentDispatcher } from "./bindings/ContentDispatcher.tsx";
import { ArticleEditorRoute } from "./bindings/ArticleEditorRoute.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { useAuth } from "./hooks/useAuth.ts";

function AppContent() {
  const { isAuthenticated, loading, login, logout, isLoggingIn, isLoggingOut } =
    useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="ui active centered inline loader"></div>;
  }

  const ProtectedRoute = ({ element }: { element: React.ReactNode }) => {
    if (!isAuthenticated) {
      return (
        <Login
          onLogin={() => login(location.pathname)}
          isLoggingIn={isLoggingIn}
        />
      );
    }
    return <>{element}</>;
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute
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
        }
      />
      <Route path="/:owner/:repo">
        <Route
          index
          element={<ProtectedRoute element={<ContentListWrapper />} />}
        />
        <Route
          path="add"
          element={<ProtectedRoute element={<ContentSettingsWrapper />} />}
        />
        <Route
          path="edit"
          element={<ProtectedRoute element={<ContentSettingsWrapper />} />}
        />
        <Route path=":contentId">
          <Route
            index
            element={<ProtectedRoute element={<ContentDispatcher />} />}
          />
          <Route
            path=":articleId"
            element={<ProtectedRoute element={<ArticleEditorRoute />} />}
          />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <BrowserRouter future={{ v7_relativeSplatPath: true }}>
    <AppContent />
  </BrowserRouter>,
);
