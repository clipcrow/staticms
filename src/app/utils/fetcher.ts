export const fetchWithAuth = async (
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const response = await fetch(input, init);
  if (response.status === 401) {
    try {
      if (!globalThis.location.href.includes("/api/auth/login")) {
        const current = globalThis.location.pathname +
          globalThis.location.search;
        globalThis.location.href = `/api/auth/login?returnTo=${
          encodeURIComponent(current)
        }`;
      }
      // Return a pending promise so the caller awaits forever (until page unload),
      // preventing UI error states from flashing.
      return new Promise<Response>(() => {});
    } catch (e) {
      console.error("Redirect failed", e);
    }
  }
  return response;
};
