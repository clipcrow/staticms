import { withBrowser } from "./setup.ts";
import { assert } from "@std/assert";

Deno.test("US-02: Repository Selection", async () => {
  await withBrowser(async (browser) => {
    const page = await browser.newPage("http://localhost:8000");
    await page.waitForSelector("body");

    // Assume we are authenticated (or we mocked the auth state in future)
    // For now, we expect the home page to show the repository selector directly.

    // Check for Repository List ID or Class
    // The component should render a list of repositories.
    // Let's assume a "repository-list" id or class.

    // TODO: In later stages, we need to inject a mock session cookie here.

    // Check Header Text
    const header = await page.evaluate(() =>
      document.querySelector("h1")?.innerText
    );
    assert(
      header?.includes("Select Repository"),
      "Header should ask to select a repository",
    );

    // Check if at least one repository item exists
    // We will implementing a Mock API that returns sample repos.
    const repoItems = await page.evaluate(() =>
      document.querySelectorAll(".repo-item").length
    );
    assert(repoItems > 0, "Should display at least one repository");

    await page.close();
  });
});
