import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { ContentListWrapper } from "./components/ContentListWrapper.tsx";
import { ContentSettingsWrapper } from "./components/ContentSettingsWrapper.tsx";
import { ContentRoute } from "./components/ContentRoute.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { useAuth } from "./hooks/useAuth.ts";

function RequireAuth({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AppContent() {
  const { isAuthenticated, loading, login, logout, isLoggingIn, isLoggingOut } =
    useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="ui active centered inline loader"></div>;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated
          ? <Navigate to="/" replace />
          : <Login onLogin={login} isLoggingIn={isLoggingIn} />}
      />
      <Route element={<RequireAuth isAuthenticated={isAuthenticated} />}>
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
        <Route path="/:owner/:repo">
          <Route index element={<ContentListWrapper />} />
          <Route path="add" element={<ContentSettingsWrapper />} />
          <Route path="edit" element={<ContentSettingsWrapper />} />
          <Route path="collection/:contentId">
            <Route index element={<ContentRoute mode="collection-list" />} />
            <Route
              path=":articleId"
              element={<ContentRoute mode="article-editor" />}
            />
          </Route>
          <Route
            path="singleton/:contentId"
            element={<ContentRoute mode="singleton-editor" />}
          />
        </Route>
      </Route>
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
