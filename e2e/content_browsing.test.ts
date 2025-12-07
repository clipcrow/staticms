import { demoDelay, mockGitHubApi, TEST_BASE_URL, withPage } from "./setup.ts";
import { assert } from "@std/assert";
import { kv } from "@/server/auth.ts";
import { encodeBase64 } from "@std/encoding/base64";

Deno.test({
  name: "US-03: Content Browsing",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const sessionId = crypto.randomUUID();
    const fakeToken = "gho_fake_token";

    // 1. Setup Session
    await kv.set(["sessions", sessionId], fakeToken, {
      expireIn: 1000 * 60 * 60,
    });

    // 2. Mock Data
    const configContent = `
collections:
  - name: posts
    label: Posts
    folder: content/posts
    create: true
    type: collection
    fields:
      - { name: title, label: Title, widget: string }
  - name: site_settings
    label: Site Settings
    type: singleton
    files:
      - name: general
        label: General Settings
        file: content/settings/general.json
        fields:
            - { name: title, label: Site Title, widget: string }
`;
    const configBase64 = encodeBase64(configContent);

    const postsDir = [
      {
        name: "hello.md",
        path: "content/posts/hello.md",
        sha: "sha1",
        size: 123,
        url: "...",
        html_url: "...",
        git_url: "...",
        download_url: "...",
        type: "file",
      },
    ];

    // 3. Setup Mock API
    const apiMock = mockGitHubApi({
      "/user": () =>
        new Response(
          JSON.stringify({
            login: "test-user",
            avatar_url: "https://example.com/avatar.png",
          }),
        ),
      "/user/installations": () =>
        new Response(
          JSON.stringify({
            installations: [{ id: 12345, account: { login: "test-org" } }],
          }),
        ),
      "/user/installations/12345/repositories": () =>
        new Response(
          JSON.stringify({
            repositories: [
              {
                id: 101,
                name: "my-blog",
                full_name: "test-org/my-blog",
                private: false,
                default_branch: "main",
              },
            ],
          }),
        ),
      // Config File Mock
      "/repos/test-org/my-blog/contents/.github/staticms.yml": () => {
        console.log("[Mock] Fetching config.yml");
        return new Response(
          JSON.stringify({
            type: "file",
            encoding: "base64",
            size: configBase64.length,
            name: "staticms.yml",
            path: ".github/staticms.yml",
            content: configBase64,
            sha: "config_sha",
          }),
        );
      },
      // Posts Directory Mock
      "/repos/test-org/my-blog/contents/content/posts": () => {
        console.log("[Mock] Fetching posts directory");
        return new Response(JSON.stringify(postsDir));
      },
    });

    // 4. Run Test
    await withPage(async (page) => {
      try {
        // 4. Login & Visit
        await page.goto(`${TEST_BASE_URL}/api/test/login?id=${sessionId}`, {
          waitUntil: "load",
        });

        // Select Repository
        await demoDelay();
        await page.waitForSelector(".repo-item", { timeout: 2000 });

        // Click on test-org/my-blog
        await page.evaluate(() => {
          const links = Array.from(
            document.querySelectorAll(".repo-item .header"),
          );
          const target = links.find((l) =>
            l.textContent?.includes("my-blog")
          ) as HTMLElement;
          if (target) target.click();
          else throw new Error("Repo link not found");
        });

        // Verify Content Browser (Collections List)
        await demoDelay();
        await page.waitForSelector(".collection-item", { timeout: 5000 });

        const content = await page.content();
        assert(content.includes("Posts"), "Should display Posts collection");
        assert(
          content.includes("Site Settings"),
          "Should display Site Settings collection",
        );

        // Navigate to Collection (Posts)
        await demoDelay();
        await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll(".collection-item"),
          );
          const postsItem = items.find((i) => i.textContent?.includes("Posts"));
          const btn = postsItem?.querySelector("a.button") as HTMLElement;
          if (btn) btn.click();
          else throw new Error("Posts browse button not found");
        });

        // Verify Article List
        await demoDelay();
        await page.waitForSelector(".article-item", { timeout: 5000 });
        const articleContent = await page.content();
        assert(articleContent.includes("hello.md"), "Should list hello.md");

        // Go Back
        await demoDelay();
        await page.evaluate(() => {
          const breadcrumb = document.querySelector(
            ".article-list-header .sub.header a",
          ) as HTMLElement;
          if (breadcrumb) breadcrumb.click();
          else throw new Error("Breadcrumb not found");
        });
        await page.waitForSelector(".collection-item");

        // Navigate to Singleton (Site Settings -> General)
        await demoDelay();
        await page.evaluate(() => {
          const items = Array.from(
            document.querySelectorAll(".collection-item"),
          );
          const settingsItem = items.find((i) =>
            i.textContent?.includes("Site Settings")
          );
          const btn = settingsItem?.querySelector("a.button") as HTMLElement;
          if (btn) btn.click();
          else throw new Error("Site Settings button not found");
        });

        // Verify Singleton Editor
        await demoDelay();
        await page.waitForSelector(".singleton-editor-header");
        const settingsContent = await page.content();
        assert(
          settingsContent.includes("Editing: site_settings"),
          "Should show singleton editor header",
        );

        console.log(
          "Test finished successfully. Keeping browser open for 10 seconds...",
        );
        await demoDelay(); // FINAL WAIT
      } catch (e) {
        console.error("Test failed:", e);
        // Log page content for debugging
        try {
          const content = await page.content();
          console.log("Page Content at Failure:", content);
        } catch (_) { /* ignore */ }
        throw e;
      } finally {
        apiMock.restore();
        await kv.delete(["sessions", sessionId]);
      }
    });
  },
});
