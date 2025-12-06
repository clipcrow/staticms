import { withBrowser } from "./setup.ts";
import { assert, assertEquals } from "@std/assert";

Deno.test("E2E PoC: Verify Astral Launch", async () => {
  await withBrowser(async (browser) => {
    // 1. Verify browser launch
    assert(browser, "Browser should be launched");

    // 2. Open a generic page (e.g., example.com) to verify network and rendering
    // utilizing google.com as a stable external target for PoC
    const page = await browser.newPage("https://www.google.com");

    const title = await page.evaluate(() => document.title);
    console.log("Page title:", title);
    assertEquals(title, "Google");

    // 3. Simple interaction check (if needed, but launch & title is enough for PoC)
    await page.close();
  });
});
