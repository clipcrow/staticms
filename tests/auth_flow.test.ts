import { withBrowser } from "./setup.ts";
import { assertEquals } from "@std/assert";

Deno.test("US-01: Authentication Flow", async () => {
  await withBrowser(async (browser) => {
    // 1. Visit Home Page
    const page = await browser.newPage("http://localhost:8000");

    // Wait for the page to load content
    await page.waitForSelector("body");

    // In a real V1 auth flow, accessing root should redirect to GitHub (or /api/auth/login).
    // For now, verified that we can access the page.
    // Once Auth Middleware is implemented, this test should expect a redirect or mock the auth state.

    const title = await page.evaluate(() => document.title);
    assertEquals(title, "Staticms v2");

    // TODO: Verify redirect to GitHub when unauthenticated
    // const url = page.url();
    // assert(url.includes("github.com/login"), "Should redirect to GitHub");

    await page.close();
  });
});
