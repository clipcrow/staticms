import { assert, assertEquals } from "@std/assert";
import {
  demoDelay,
  loginAsTestUser,
  TEST_BASE_URL,
  withPage,
} from "./setup.ts";

// US-01: Authentication Redirection
Deno.test("US-01: Authentication Redirection", async () => {
  await withPage(async (page) => {
    // 1. Visit Root
    await page.goto(`${TEST_BASE_URL}/`, { waitUntil: "networkidle2" });

    // Should redirect to GitHub (or /api/auth/login)
    const url = page.url;
    console.log("Current URL:", url);

    if (url.includes("github.com") || url.includes("/api/auth/login")) {
      assert(true, "Redirected to auth/github");
    } else {
      // Check for redirect meta or wait
      await new Promise((r) => setTimeout(r, 1000));
      const newUrl = page.url;
      assert(
        newUrl.includes("github.com") || newUrl.includes("/api/auth/login"),
        `Should have redirected. Got: ${newUrl}`,
      );
    }
  });
});

Deno.test({
  name: "US-06: Save as Pull Request & US-07: Unlock",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Create PR from Draft -> Lock -> Unlock", async () => {
      await withPage(async (page) => {
        // 1. Login & Mock GitHub API
        // We need to verify which calls are made.
        const ghMocks = {
          // Mock Batch Commit sub-calls
          "regex:/repos/octocat/my-blog/git/.*": () =>
            new Response(JSON.stringify({ sha: "dummy-sha" })),

          // Mock Create PR
          "/repos/octocat/my-blog/pulls": () =>
            new Response(
              JSON.stringify({
                number: 13,
                html_url: "https://github.com/octocat/my-blog/pull/13",
                state: "open",
              }),
              { status: 201 },
            ),

          // Mock Config
          "/repos/octocat/my-blog/contents/.github/staticms.yml": () =>
            new Response(
              JSON.stringify({ message: "Not Found" }),
              { status: 404 },
            ),

          // Mock getting tree or initial content (might be needed for uniqueness check or base sha)
          "regex:/repos/octocat/my-blog/contents/.*": () =>
            new Response(JSON.stringify({ message: "Not Found" }), {
              status: 404,
            }),
        };

        const { apiStub } = await loginAsTestUser(page, "octocat", ghMocks);

        try {
          // 2. Setup Data (Content Config)
          const configData = {
            collections: [
              {
                type: "collection",
                name: "posts",
                label: "Posts",
                folder: "content/posts",
                fields: [
                  { name: "title", label: "Title", widget: "string" },
                  { name: "body", label: "Body", widget: "markdown" },
                ],
              },
            ],
          };

          // Inject Config via API (Authenticated session)
          await (await fetch(
            `${TEST_BASE_URL}/api/repo/octocat/my-blog/config`,
            {
              method: "POST",
              headers: {},
              body: JSON.stringify(configData),
            },
          )).text();

          // 3. Go to New Post Page
          await page.goto(
            `${TEST_BASE_URL}/octocat/my-blog/posts/new`,
          );
          await page.waitForSelector(".content-editor");

          // Force filename via prompt mock
          await page.evaluate(() => {
            // @ts-ignore: Mocking prompt
            globalThis.window.prompt = () => "test-pr-post.md";
          });

          // 4. Fill Content
          await page.evaluate(() => {
            const titleInput = document.querySelector(
              'input[name="title"]',
            ) as HTMLInputElement;
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              globalThis.window.HTMLInputElement.prototype,
              "value",
            )?.set;
            nativeInputValueSetter?.call(titleInput, "PR Test Title");
            titleInput.dispatchEvent(new Event("input", { bubbles: true }));
          });

          // Wait for draft save
          await demoDelay();

          // 5. Verify Draft Label (Orange)
          await page.waitForSelector(".ui.label.orange");
          const draftLabel = await page.evaluate(() => {
            return document.querySelector(".ui.label.orange")?.textContent;
          });
          assert(
            draftLabel?.includes("Draft") || false,
            `Should verify draft label. Got: ${draftLabel}`,
          );

          // 6. Click "Create PR"
          // Button should say "Create PR"
          const btnText = await page.evaluate(() => {
            return document.querySelector("button.primary")?.textContent;
          });
          assertEquals(btnText?.trim(), "Create PR");

          await page.evaluate(() => {
            (document.querySelector("button.primary") as HTMLElement).click();
          });

          // 7. Verify Locked State & "Locked (PR Open)" or "Locked..."
          await page.waitForFunction(() => {
            const btn = document.querySelector("button.primary");
            return btn?.textContent?.includes("Locked") || false;
          });

          // 8. Verify PR Link Label (Teal, "In Review (#13)")
          const prLabelText = await page.evaluate(() => {
            const el = document.querySelector('a[href*="github.com"]');
            return el?.textContent?.trim();
          });
          assertEquals(prLabelText, "In Review (#13)");

          // 9. Unlock via Webhook (SSE)
          // Setup listener for dialog (alert/confirm)
          await page.evaluate(() => {
            // @ts-ignore: Mocking confirm
            globalThis.window.confirm = () => true;
          });

          // Simulate Webhook
          await (await fetch(`${TEST_BASE_URL}/_debug/pr/13/status`, {
            method: "POST",
            body: JSON.stringify({ status: "merged" }),
          })).text();

          // 10. Verify Unlock & Approved Label
          await page.waitForSelector(".ui.label.purple"); // Approved badge
          const approvedText = await page.evaluate(() => {
            return document.querySelector(".ui.label.purple")?.textContent;
          });
          assertEquals(approvedText?.trim(), "Approved");

          const unlockedBtnText = await page.evaluate(() => {
            const btn = document.querySelector("button.primary");
            return {
              text: btn?.textContent,
              disabled: (btn as HTMLButtonElement).disabled,
            };
          });

          // Should be enabled and say "Create PR"
          assert(!unlockedBtnText.disabled, "Button should be enabled");
          assertEquals(unlockedBtnText.text?.trim(), "Create PR");
        } finally {
          apiStub.restore();
        }
      });
    });
  },
});
