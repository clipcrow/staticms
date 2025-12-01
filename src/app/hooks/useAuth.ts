import { useCallback, useEffect, useState } from "react";
import { ViewState } from "../types.ts";

export const useAuth = (
  clearRepo: () => void,
  setView: (view: ViewState) => void,
) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userRes = await fetch("/api/user");
        if (userRes.ok) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(() => {
    setIsLoggingIn(true);
    // Add a small delay to allow the loading spinner to render/animate
    // before the browser starts the navigation/unload process.
    setTimeout(() => {
      globalThis.location.href = "/api/auth/login";
    }, 500);
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout");
      setIsAuthenticated(false);
      clearRepo();
      setView("content-list");
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setIsLoggingOut(false);
    }
  }, [clearRepo, setView]);

  return {
    isAuthenticated,
    isLoggingOut,
    isLoggingIn,
    login,
    logout,
  };
};
