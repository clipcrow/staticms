import { withBrowser } from "./setup.ts";
import { assert } from "@std/assert";

Deno.test("US-02: Content Navigation Flow", async () => {
  await withBrowser(async (browser) => {
    const page = await browser.newPage("http://localhost:8000");
    await page.waitForSelector("body");

    // 1. Repository Selection Page
    // Click the first repository link
    const firstRepoLink = await page.$(".repo-item a.header");
    assert(firstRepoLink, "Repository link should exist");

    // Get the href to verify expected navigation
    // const href = await page.evaluate((el: any) => el.getAttribute("href"), firstRepoLink);

    // Click and wait for navigation
    // Note: Since we are going to implement Client-Side Routing (SPA),
    // we need to be careful. 'page.goto' is full load. Validating pushState updates might require waiting for selector change.
    await firstRepoLink.click();

    // Wait for the Content Browser header (to be implemented)
    // We expect a header that shows the repo name "user/my-repo"
    await page.waitForSelector(".content-browser-header", { timeout: 5000 });

    const url = await page.evaluate(() => globalThis.location.href);
    const headerText = await page.evaluate(() =>
      document.querySelector(".content-browser-header")?.textContent
    );

    assert(
      url.includes("/user/my-blog"),
      `URL should contain /user/my-blog, but got: ${url}`,
    );
    assert(
      headerText?.includes("user my-blog"),
      `Header should display repository name, got: ${headerText}`,
    );

    await page.close();
  });
});
