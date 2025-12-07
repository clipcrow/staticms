import { ReactNode, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth.ts";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      login();
    }
  }, [loading, isAuthenticated, login]);

  if (loading) {
    // Show a loading spinner or skeleton while checking auth
    return (
      <div className="ui active dimmer">
        <div className="ui text loader">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
