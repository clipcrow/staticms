import { useCallback, useEffect, useState } from "react";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userRes = await fetch("/api/user");
        if (userRes.ok) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback((returnTo?: string) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      const url = returnTo
        ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
        : "/api/auth/login";
      globalThis.location.href = url;
    }, 0);
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout");
      setIsAuthenticated(false);
      // Navigation to login will happen automatically because isAuthenticated becomes false
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  return {
    isAuthenticated,
    isLoggingOut,
    isLoggingIn,
    loading,
    login,
    logout,
  };
};
