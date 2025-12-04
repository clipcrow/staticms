import { useEffect } from "react";

export const SilentAuthCallback = () => {
  useEffect(() => {
    // Notify parent window about successful authentication
    // deno-lint-ignore no-window
    if (window.opener) {
      // deno-lint-ignore no-window
      window.opener.postMessage({ type: "STATICMS_AUTH_SUCCESS" }, "*");
      // deno-lint-ignore no-window
    } else if (window.parent && window.parent !== window) {
      // deno-lint-ignore no-window
      window.parent.postMessage({ type: "STATICMS_AUTH_SUCCESS" }, "*");
    }
  }, []);

  return (
    <div className="ui active centered inline loader">
      <div className="ui text loader">Completing authentication...</div>
    </div>
  );
};
