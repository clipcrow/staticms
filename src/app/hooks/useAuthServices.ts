import { useMemo } from "react";

export interface User {
  login?: string;
  username?: string;
  avatar_url?: string;
  name?: string;
}

export interface AuthServices {
  checkAuth: () => Promise<{ ok: boolean; status: number; user?: User }>;
  redirectToLogin: (returnTo?: string, forceLogin?: boolean) => void;
  storage: {
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    getItem: (key: string) => string | null;
  };
}

export function useAuthServices(): AuthServices {
  const checkAuth = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const user = await res.json();
        return { ok: true, status: res.status, user };
      }
      return { ok: false, status: res.status };
    } catch (e) {
      console.error("[AuthService] Check auth error", e);
      return { ok: false, status: 500 };
    }
  };

  const redirectToLogin = (returnTo?: string, forceLogin = false) => {
    // Use a small timeout to allow UI to update before redirecting
    setTimeout(() => {
      const params = new URLSearchParams();
      if (returnTo) params.set("returnTo", returnTo);
      if (forceLogin) params.set("prompt", "login");

      const url = `/api/auth/login?${params.toString()}`;
      globalThis.location.href = url;
    }, 10);
  };

  const storage = {
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
    getItem: (key: string) => localStorage.getItem(key),
  };

  return useMemo(() => ({
    checkAuth,
    redirectToLogin,
    storage,
  }), []);
}
