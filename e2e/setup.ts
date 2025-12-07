import { launch } from "astral";
import { app } from "@/server/app.ts";
import { stub } from "@std/testing/mock";

export const TEST_PORT = 8001;
export const TEST_BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

export async function withBrowser(
  testFn: (browser: Awaited<ReturnType<typeof launch>>) => Promise<void>,
) {
  // Start Server
  const controller = new AbortController();
  const signal = controller.signal;

  const serverPromise = app.listen({ port: TEST_PORT, signal });
  console.log(`Test server running on ${TEST_BASE_URL}`);

  // Default to headless unless E2E_HEADLESS is set to "false"
  // Or usage of E2E_DEMO env var to toggle modes
  const headless = Deno.env.get("E2E_HEADLESS") !== "false";

  try {
    const browser = await launch({ headless });
    try {
      await testFn(browser);
    } finally {
      await browser.close();
    }
  } finally {
    controller.abort();
    await serverPromise.catch(() => {}); // Ignore abort error
  }
}

export async function withPage(
  testFn: (
    page: Awaited<ReturnType<Awaited<ReturnType<typeof launch>>["newPage"]>>,
  ) => Promise<void>,
) {
  await withBrowser(async (browser) => {
    const page = await browser.newPage(TEST_BASE_URL);

    // Proxy browser console logs to Deno terminal
    // deno-lint-ignore no-explicit-any
    page.addEventListener("console", (e: any) => {
      console.log(`[Browser] ${e.detail.text}`);
    });
    // deno-lint-ignore no-explicit-any
    page.addEventListener("pageerror", (e: any) => {
      console.error(`[Browser Error] ${e.detail}`);
    });

    await testFn(page);
  });
}

/**
 * Mock global fetch for GitHub API calls.
 */
export function mockGitHubApi(
  handlers: Record<string, (req: Request) => Response | Promise<Response>>,
) {
  const originalFetch = globalThis.fetch;
  const fetchStub = stub(globalThis, "fetch", (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);

    // Filter for GitHub API
    if (url.hostname === "api.github.com") {
      // Sort keys by length descending to match most specific paths first
      const sortedPaths = Object.keys(handlers).sort((a, b) =>
        b.length - a.length
      );

      for (const path of sortedPaths) {
        if (url.pathname === path) {
          const handler = handlers[path];
          return Promise.resolve(handler(req));
        }
      }
    }

    // Fallback to real fetch if not intercepted (or throw if we want strict mocking)
    // For local server calls (from browser), we must allow them.
    return originalFetch.call(globalThis, input, init);
  });

  return fetchStub;
}

// Helper for demo delays
export async function demoDelay() {
  const delay = parseInt(Deno.env.get("E2E_DELAY") || "0", 10);
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay));
  }
}
