import { ReactNode, useEffect } from "react";
import { useAuth } from "@/app/hooks/useAuth.ts";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, login } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      login();
    }
  }, [loading, user]); // Removed `login` from deps as it's stable

  if (loading) {
    // Show a loading spinner or skeleton while checking auth
    return (
      <div className="ui active dimmer">
        <div className="ui text loader">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
