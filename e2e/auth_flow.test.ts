import { assert } from "@std/assert";
import { withPage } from "./setup.ts";

Deno.test({
  name: "US-01: Authentication Redirection",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
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

      // Verify we reached GitHub or the Login endpoint
      assert(
        url.includes("github.com") || url.includes("/api/auth/login"),
        `Should have redirected to GitHub, got ${url}`,
      );

      // Stop here. We cannot verify the callback flow because GitHub redirects to port 8000,
      // but this test server runs on 8001.验证
    });
  },
});
