import { assert } from "@std/assert";
import { withPage } from "./setup.ts";

Deno.test("US-01: Authentication Redirection", async () => {
  await withPage(async (page) => {
    // page.url is already TEST_BASE_URL/ from setup.ts opening it.
    // However, RequireAuth will trigger redirection.

    // 1. Wait for redirection
    // Since we are not mocked, and RequireAuth redirects to /api/auth/login, then to GitHub.
    // We expect the URL to change.

    // We might need to wait for network idle to ensure redirect happened
    try {
      await page.waitForNavigation({
        waitUntil: "networkidle2",
      });
    } catch {
      // Timeout means redirection might have finished quickly or stuck
    }

    const url = page.url;
    console.log("Current URL:", url);

    assert(
      url.includes("github.com") || url.includes("/api/auth/login") ||
        url.includes("returnTo"),
      `Should have redirected to GitHub or login endpoint, got ${url}`,
    );
  });
});
