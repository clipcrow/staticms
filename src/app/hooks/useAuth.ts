import { useCallback, useEffect, useState } from "react";
import { useAuthServices } from "@/app/hooks/useAuthServices.ts";

export const useAuth = (useServicesHook = useAuthServices) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  const services = useServicesHook();

  // Expose checkAuth for manual calls
  const checkAuth = useCallback(async () => {
    try {
      const result = await services.checkAuth();
      if (result.ok && result.user) {
        setIsAuthenticated(true);
        const login = result.user.login || result.user.username || "";
        setUsername(login);
        if (login) {
          services.storage.setItem("staticms_user", login);
        }
      } else {
        console.warn(
          "[useAuth] Auth check failed with status:",
          result.status,
        );
        if (result.status === 401 || result.status === 403) {
          services.storage.removeItem("staticms_user");
          setIsAuthenticated(false);
        }
      }
    } catch (e) {
      console.error("[useAuth] Auth check error", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [services]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback((returnTo?: string, forceLogin = false) => {
    services.redirectToLogin(returnTo, forceLogin);
  }, [services]);

  return {
    isAuthenticated,
    loading,
    login,
    username,
  };
};
