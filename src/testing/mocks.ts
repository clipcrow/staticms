// Basic mock setup for fetch in Deno tests (since happy-dom/global-registrator handles DOM but fetch mocking is custom)

let originalFetch: typeof globalThis.fetch;

export function setupGlobalFetchMock() {
  if (!originalFetch) {
    originalFetch = globalThis.fetch;
  }
}

export function mockGlobalFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  globalThis.fetch = (input, init) => handler(input, init);
}

export function resetGlobalFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
}
