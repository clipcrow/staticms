import { afterEach } from "@std/testing/bdd";
import { cleanup } from "@testing-library/react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Setup HappyDOM environment
GlobalRegistrator.register({
  url: "http://localhost/",
});

// Robust Fetch Mock
const _originalFetch = globalThis.fetch;
globalThis.fetch = (input: RequestInfo | URL, _init?: RequestInit) => {
  const urlStr = input.toString();

  // 1. Mock Auth Check (default: authenticated)
  if (urlStr.endsWith("/api/user")) {
    return Promise.resolve(
      new Response(JSON.stringify({ login: "test-user" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // 1.5 Mock Repositories
  if (urlStr.includes("/api/repositories")) {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            id: 1,
            name: "my-repo",
            full_name: "user/my-repo",
            description: "desc1",
            owner: { login: "user" },
            permissions: { push: true },
          },
          {
            id: 2,
            name: "other-repo",
            full_name: "user/other-repo",
            description: "desc2",
            owner: { login: "user" },
            permissions: { push: true },
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }

  // 2. Mock Config
  if (urlStr.includes("/config")) {
    return Promise.resolve(
      new Response(
        "collections: [{name: 'posts', path: 'posts', fields: []}]",
        { status: 200 },
      ),
    );
  }

  // 3. Mock Content API
  if (urlStr.includes("/contents/")) {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          { name: "test.md", path: "test.md", sha: "123", type: "file" },
        ]),
        { status: 200 },
      ),
    );
  }

  // 3. Fallback: If it's a test-specific mock (stubbed elsewhere), it might have been overridden.
  // But if we are here, it means we are using this global mock.

  // Allow network requests for non-API calls if needed (rare in unit tests)
  // Or just return 404/Empty for safety to prevent ECONNREFUSED
  console.warn(`[MockFetch] Unhandled URL: ${urlStr}`);
  return Promise.resolve(new Response("Not Found", { status: 404 }));
};

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  // deno-lint-ignore no-explicit-any
  constructor(_url: string, _eventSourceInitDict?: any) {}
  close() {}
  // deno-lint-ignore no-explicit-any
  addEventListener(_type: string, _listener: any) {}
  removeEventListener() {}
}
// deno-lint-ignore no-explicit-any
(globalThis as any).EventSource = MockEventSource;

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Reset fetch if needed, but since we replaced globalThis.fetch permanently for the test runner session,
  // we might want to keep it or restore logic if we had stubs.
  // Sinons/Stubs usually wrap this.
});
