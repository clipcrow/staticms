import { withBrowser } from "./setup.ts";
import { assert } from "@std/assert";

Deno.test("US-03: Content Browsing", async () => {
  await withBrowser(async (browser) => {
    const page = await browser.newPage("http://localhost:8000");
    await page.waitForSelector("body");

    // 1. Repository Selection Page
    // Click on the first repository "user/my-blog"
    const repoLinkSelector = ".repo-item"; // Assuming this class exists from US-02
    await page.waitForSelector(repoLinkSelector);

    // Get the first repo text to verify later
    const repoName = await page.evaluate(() => {
      const el = document.querySelector(".repo-item");
      return el?.querySelector(".header")?.textContent?.trim();
    });

    // Click it
    await page.evaluate(() => {
      const el = document.querySelector(".repo-item .header") as HTMLElement;
      if (el) el.click();
      else throw new Error("Repo item link not found");
    });

    // 2. Wait for navigation to /user/my-blog
    // Since this is SPA, we wait for the target page selector instead of waitForNavigation
    await page.waitForSelector(".content-browser-header");

    const url = await page.evaluate(() => location.href);
    assert(
      url.includes("/user/my-blog"),
      `URL should contain /user/my-blog, got ${url}`,
    );

    // 3. Verify Content Browser Header
    // The previous placeholder implementation has "owner/repo" in the header.
    // The new implementation should display "Collections" eventually.
    // US-03 Goal: "configで定義されたコレクションが表示されることを検証"

    // Verify that we are on the Content Browser page
    const header = await page.evaluate(() =>
      document.querySelector(".content-browser-header")?.textContent
    );
    assert(header?.includes("user my-blog"), "Header should show repo name");

    // 4. Verify Collections List
    // We expect the list of collections to NOT be empty.

    await page.waitForSelector(".collection-item", { timeout: 5000 });
    const collections = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".collection-item")).map((el) =>
        el.textContent
      )
    );
    assert(
      collections.some((c) => c?.includes("Posts")),
      "Should list 'Posts' collection",
    );

    // 5. Navigate to Article List
    // Click "Browse" on the "Posts" collection
    await page.evaluate(() => {
      // Find the collection item for "Posts"
      const items = Array.from(document.querySelectorAll(".collection-item"));
      const postItem = items.find((el) => el.textContent?.includes("Posts"));
      if (!postItem) throw new Error("Posts collection not found");

      // Find the button inside it
      const link = postItem.querySelector("a.button") as HTMLElement;
      if (link) link.click();
      else throw new Error("Browse button not found for Posts");
    });

    // Wait for Article List Header
    // We expect the URL to change and a list of entries to appear
    await page.waitForSelector(".article-list-header", { timeout: 5000 });

    const entryUrl = await page.evaluate(() => location.href);
    assert(
      entryUrl.includes("/user/my-blog/posts"),
      "URL should be /user/my-blog/posts",
    );

    // Check for some mock content (RED state: backend not implementing file list yet)
    await page.waitForSelector(".article-item", { timeout: 2000 });
    const entries = await page.evaluate(() =>
      document.querySelectorAll(".article-item").length
    );
    assert(entries > 0, "Should display at least one entry");

    // 6. Navigate back and check Singleton
    // Click breadcrumb to go back
    await page.evaluate(() => {
      const breadcrumb = document.querySelector(
        ".article-list-header .sub.header a",
      ) as HTMLElement;
      if (breadcrumb) breadcrumb.click();
      else throw new Error("Breadcrumb link not found");
    });

    await page.waitForSelector(".collection-item", { timeout: 2000 });

    // Click "Edit" on "Site Settings" singleton
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".collection-item"));
      const singletonItem = items.find((el) =>
        el.textContent?.includes("Site Settings")
      );
      if (!singletonItem) throw new Error("Site Settings singleton not found");

      const link = singletonItem.querySelector("a.button") as HTMLElement;
      if (link) link.click();
      else throw new Error("Edit button not found for Site Settings");
    });

    // Wait for Singleton Editor
    await page.waitForSelector(".singleton-editor-header", { timeout: 2000 });
    const singletonUrl = await page.evaluate(() => location.href);
    assert(
      singletonUrl.includes("/user/my-blog/site_settings"),
      "URL should be /user/my-blog/site_settings",
    );

    await page.close();
  });
});
