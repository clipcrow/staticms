import { useCallback, useEffect, useState } from "react";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    const checkAuth = async () => {
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
          localStorage.removeItem("staticms_user");
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error("[useAuth] Auth check error", e);
        // On network error, we might want to retry, but for now we just fail
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

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
        localStorage.removeItem("staticms_user");
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.error("[useAuth] Auth check error", e);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((returnTo?: string, forceLogin = false) => {
    setIsLoggingIn(true);
    // Use a small timeout to allow UI to update before redirecting
    setTimeout(() => {
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      if (forceLogin) params.set("prompt", "login");

      const url = `/api/auth/login?${params.toString()}`;
      globalThis.location.href = url;
    }, 10);
  }, []);

  const loginSilently = useCallback((): Promise<boolean> => {
    setIsLoggingIn(true);
    return new Promise((resolve) => {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = "/api/auth/login?returnTo=/silent-auth";

      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000); // 5 second timeout for silent auth

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "STATICMS_AUTH_SUCCESS") {
          cleanup();
          // Re-check auth status
          checkAuth().then(() => {
            // checkAuth updates isAuthenticated state
            resolve(true);
          });
        }
      };

      const cleanup = () => {
        globalThis.removeEventListener("message", messageHandler);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        clearTimeout(timeoutId);
        // We don't set isLoggingIn to false here because if it failed,
        // we might immediately trigger normal login which sets it to true.
        // If it succeeded, we are authenticated.
      };

      globalThis.addEventListener("message", messageHandler);
      document.body.appendChild(iframe);
    });
  }, []);

  return {
    isAuthenticated,
    isLoggingIn,
    loading,
    login,
    loginSilently,
    username,
  };
};
