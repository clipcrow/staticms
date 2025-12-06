import { useCallback, useEffect, useState } from "react";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  // Expose checkAuth for manual calls
  const checkAuth = useCallback(async () => {
    try {
      const userRes = await fetch("/api/user");
      if (userRes.ok) {
        const data = await userRes.json();
        setIsAuthenticated(true);
        const login = data.login || data.username || "";
        setUsername(login);
        if (login) {
          localStorage.setItem("staticms_user", login);
        }
      } else {
        console.warn(
          "[useAuth] Auth check failed with status:",
          userRes.status,
        );
        if (userRes.status === 401 || userRes.status === 403) {
          localStorage.removeItem("staticms_user");
          setIsAuthenticated(false);
        }
      }
    } catch (e) {
      console.error("[useAuth] Auth check error", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((returnTo?: string, forceLogin = false) => {
    // Use a small timeout to allow UI to update before redirecting
    setTimeout(() => {
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      if (forceLogin) params.set("prompt", "login");

      const url = `/api/auth/login?${params.toString()}`;
      globalThis.location.href = url;
    }, 10);
  }, []);

  return {
    isAuthenticated,
    loading,
    login,
    username,
  };
};
