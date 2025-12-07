import { assert } from "@std/assert";
import { withPage } from "./setup.ts";

Deno.test("US-01: Authentication Redirection", async () => {
  await withPage(async (page) => {
    // 1. Visit Root
    await page.goto("http://localhost:8000/", { waitUntil: "networkidle2" });

    // Should initially render or redirect.
    // Our RequireAuth redirects to /api/auth/login, which redirects to https://github.com/login/oauth/...

    // We wait for navigation.
    const url = page.url;
    console.log("Current URL:", url);

    if (url.includes("github.com")) {
      console.log("Verified redirection to GitHub");
      assert(true);
    } else if (url.includes("/api/auth/login")) {
      console.log("Redirected to auth endpoint");
      assert(true);
    } else {
      // Wait a bit
      await new Promise((r) => setTimeout(r, 2000));
      const newUrl = page.url;
      console.log("URL after wait:", newUrl);
      assert(
        newUrl.includes("github.com") || newUrl.includes("login"),
        "Should have redirected to GitHub",
      );
    }
  });
});
