import { useEffect, useState } from "react";

export interface User {
  login: string;
  avatar_url: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  /* DEBUG LOG */
  console.log("useAuth hook called");

  useEffect(() => {
    console.log("useAuth useEffect called");
    let mounted = true;

    async function checkAuth() {
      try {
        console.log("Fetching /api/user...");
        const res = await fetch("/api/user");
        if (res.status === 401) {
          if (mounted) {
            setAuthState({ user: null, loading: false, error: null });
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`Auth check failed: ${res.statusText}`);
        }
        const user = await res.json();

        // Persist user for draft keys (See US-05, DATA_MODEL.md)
        if (user && user.login) {
          localStorage.setItem("staticms_user", user.login);
        }

        if (mounted) {
          setAuthState({ user, loading: false, error: null });
        }
      } catch (e) {
        if (mounted) {
          setAuthState({
            user: null,
            loading: false,
            error: e instanceof Error ? e : new Error(String(e)),
          });
        }
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = () => {
    globalThis.location.href = `/api/auth/login?returnTo=${
      encodeURIComponent(
        globalThis.location.pathname,
      )
    }`;
  };

  const logout = () => {
    localStorage.removeItem("staticms_user");
    globalThis.location.href = "/api/auth/logout";
  };

  return { ...authState, login, logout };
}
