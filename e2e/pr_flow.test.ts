import { assert, assertEquals } from "@std/assert";
import { withPage } from "./setup.ts";

Deno.test("US-06: Save as Pull Request", async (t) => {
  await t.step("Create PR from Draft", async () => {
    await withPage(async (page) => {
      // 1. Setup Data for Test
      // Assume "staticms-user" and "posts" collection logic is same as before.
      // We can skip full navigation and go directly to new content page to speed up.

      // But we need to ensure config exists!
      // Reuse logic from US-04 or just manually inject config via API if needed.
      // However, since server is persistent (KV), previous tests might have set it up.
      // To be safe, we re-inject config.

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

      // Inject Config
      await (await fetch("http://localhost:8000/api/repo/user/my-blog/config", {
        method: "POST",
        body: JSON.stringify(configData),
      })).text();

      // 2. Go to New Post Page
      await page.goto("http://localhost:8000/user/my-blog/posts/new");
      await page.waitForSelector(".content-editor");

      // 3. Fill Content
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

        const bodyInput = document.querySelector(
          'textarea[name="body"]',
        ) as HTMLTextAreaElement;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          globalThis.window.HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        nativeTextAreaValueSetter?.call(bodyInput, "PR Content body...");
        bodyInput.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // Wait for autosave (optional but good for stability)
      await new Promise((r) => setTimeout(r, 500));

      // 4. Click Save
      await page.waitForSelector("button.primary");

      const initialText = await page.evaluate(() => {
        return document.querySelector("button.primary")?.textContent;
      });
      assertEquals(initialText?.trim(), "Save");

      await page.evaluate(() => {
        (document.querySelector("button.primary") as HTMLElement).click();
      });

      // 5. Verify State Changes
      // Button text should change to "Saving..." then "Locked..."
      // Since it's fast mock, we might miss "Saving...", so just wait for final state.

      await page.waitForFunction(() => {
        const btn = document.querySelector("button.primary");
        return btn?.textContent?.includes("Locked");
      });

      // 6. Verify Inputs are Disabled
      const inputsDisabled = await page.evaluate(() => {
        const input = document.querySelector(
          'input[name="title"]',
        ) as HTMLInputElement;
        const textarea = document.querySelector(
          'textarea[name="body"]',
        ) as HTMLTextAreaElement;
        return input.disabled && textarea.disabled;
      });
      assert(inputsDisabled, "Inputs should be disabled after PR creation");

      // 7. Verify PR Link
      const prLink = await page.evaluate(() => {
        const link = document.querySelector('a[href*="github.com"]');
        return link?.getAttribute("href");
      });

      // Mock returns prNumber 13
      assert(prLink?.includes("/pull/13"), "PR Link should point to PR #13");

      // 8. Test Unlock via Webhook (SSE)

      // Handle alert dialog automatically
      // deno-lint-ignore no-explicit-any
      page.addEventListener("dialog", (e: any) => {
        // e.detail is the Dialog object
        e.detail.accept();
      });

      // Simulate Webhook (Debug API)
      await (await fetch("http://localhost:8000/_debug/pr/13/status", {
        method: "POST",
        body: JSON.stringify({ status: "merged" }),
      })).text();

      // Wait for SSE update and Alert (Button should become enabled)
      // Note: The button text changes back to "Save" when prInfo becomes null.
      await page.waitForFunction(() => {
        const btn = document.querySelector("button.primary") as
          | HTMLButtonElement
          | null;
        return btn && !btn.disabled && btn.textContent === "Save";
      });

      // Verify Unlocked
      const inputsEnabled = await page.evaluate(() => {
        const input = document.querySelector(
          'input[name="title"]',
        ) as HTMLInputElement;
        return !input.disabled;
      });
      assert(inputsEnabled, "Inputs should be enabled after merge");
    });
  });
});
