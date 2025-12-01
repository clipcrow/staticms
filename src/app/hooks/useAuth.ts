import { useCallback, useEffect, useState } from "react";
import { ViewState } from "../types.ts";

export const useAuth = (
  clearRepo: () => void,
  setView: (view: ViewState) => void,
) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  const logout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await fetch("/api/auth/logout");
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setAuthLoading(false);
      setIsAuthenticated(false);
      clearRepo();
      setView("content-list");
    }
  }, [clearRepo, setView]);

  return {
    isAuthenticated,
    authLoading,
    logout,
  };
};
