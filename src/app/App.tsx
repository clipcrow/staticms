import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { ContentListWrapper } from "./bindings/ContentListWrapper.tsx";
import { ContentSettingsWrapper } from "./bindings/ContentSettingsWrapper.tsx";
import { ContentDispatcher } from "./bindings/ContentDispatcher.tsx";
import { ArticleEditorRoute } from "./bindings/ArticleEditorRoute.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { useAuth } from "./hooks/useAuth.ts";

function RequireAuth({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
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
          <Route path=":contentId">
            <Route index element={<ContentDispatcher />} />
            <Route
              path=":articleId"
              element={<ArticleEditorRoute />}
            />
          </Route>
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
