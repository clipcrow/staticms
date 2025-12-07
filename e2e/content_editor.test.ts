import { assert } from "@std/assert";
import { withPage } from "./setup.ts";

Deno.test("US-05: Content Editing & Draft", async (t) => {
  await t.step("Auto-saving draft and session resumption", async () => {
    await withPage(async (page) => {
      // 1. Setup: Add a collection "posts"
      await page.goto("http://localhost:8000/user/my-blog?action=add");
      await page.waitForSelector('form input[placeholder="Blog Posts"]');

      const configYaml = [
        "- label: Title",
        "  name: title",
        "  widget: string",
        "- label: Body",
        "  name: body",
        "  widget: markdown",
      ].join("\n");

      await page.evaluate((yaml: string) => {
        const textarea = document.querySelector("textarea");
        if (textarea) {
          textarea.value = yaml;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, { args: [configYaml] });

      // Fill basic inputs with React-compatible event dispatch
      const fillInput = async (selector: string, value: string) => {
        await page.evaluate(({ s, v }: { s: string; v: string }) => {
          const el = document.querySelector(s) as HTMLInputElement;
          if (el) {
            // React hack for controlled inputs
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              globalThis.window.HTMLInputElement.prototype,
              "value",
            )?.set;
            const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
              globalThis.window.HTMLTextAreaElement.prototype,
              "value",
            )?.set;

            const setter = el.tagName === "TEXTAREA"
              ? nativeTextAreaValueSetter
              : nativeInputValueSetter;

            if (setter) {
              setter.call(el, v);
            } else {
              el.value = v;
            }
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, { args: [{ s: selector, v: value }] });
      };

      await fillInput('input[placeholder="Blog Posts"]', "Posts");
      await fillInput('input[placeholder="posts"]', "posts");
      await fillInput('input[placeholder="content/posts"]', "content/posts");

      // Submit
      await page.evaluate(() => {
        (document.querySelector('button[type="submit"]') as HTMLButtonElement)
          .click();
      });
      // Wait for reload
      await page.waitForFunction(() => !location.search.includes("action="));
      await new Promise((r) => setTimeout(r, 2000));

      // 2. Navigate to Article List
      await page.evaluate(() => {
        // Click "Browse" on the first item (Posts)
        const items = Array.from(document.querySelectorAll(".collection-item"));
        const postsItem = items.find((i) =>
          i.querySelector(".header")?.textContent === "Posts"
        );
        const browseBtn = postsItem?.querySelector(
          "a.button.primary",
        ) as HTMLElement;
        browseBtn?.click();
      });

      await page.waitForSelector(".article-list-header");
      await page.waitForSelector("a.ui.button"); // Wait for New button

      // 3. Click "New" (This button needs to be implemented)
      // Expecting a button with text "New Posts" or just "New"
      await page.evaluate(() => {
        const newBtn = Array.from(document.querySelectorAll("button, a.button"))
          .find((b) => b.textContent?.includes("New"));
        if (!newBtn) {
          throw new Error(
            "New button not found. HTML: " +
              document.body.innerHTML.substring(0, 500),
          );
        }
        (newBtn as HTMLElement).click();
      });

      // 4. Wait for Editor
      // URL should be /user/my-blog/posts/new
      await page.waitForSelector(".content-editor");
      const url = await page.evaluate(() => location.href);
      assert(url.includes("/new"), "Should be on new article page");

      // 5. Edit Content (Title & Body)
      await fillInput('input[name="title"]', "My Draft Title");

      // Markdown editor might be a textarea or contenteditable. Assuming textarea for MVP or simple implementation
      // Or if using a library, we need a specific selector.
      // Let's assume a textarea for body for now.
      await fillInput('textarea[name="body"]', "Draft content...");

      // 5.5. Image Drop Test
      await page.evaluate(() => {
        const textarea = document.querySelector('textarea[name="body"]');
        if (!textarea) return;

        // Create a dummy file
        // Note: In a real browser this works, but in Puppeteer/Astral sometimes we need to be careful with File constructor support.
        // Assuming modern environment.
        const content = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG Header signature
        const file = new File([content], "test.png", { type: "image/png" });

        // Mimic Drop Event
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const event = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer,
        });

        textarea.dispatchEvent(event);
      });

      // Wait for file reader and state update
      await new Promise((r) => setTimeout(r, 1000));

      // Check textarea content immediately
      const bodyAfterDrop = await page.evaluate(() => {
        return (document.querySelector(
          'textarea[name="body"]',
        ) as HTMLTextAreaElement)?.value;
      });
      assert(
        bodyAfterDrop.includes("![test.png](images/test.png)"),
        `Image markdown should be inserted. Got: ${bodyAfterDrop}`,
      );

      // 6. Reload Page WITHOUT Saving
      await new Promise((r) => setTimeout(r, 1000)); // Wait for autosave

      await page.reload();
      await page.waitForSelector(".content-editor");

      // 7. Verify Content Restored
      const titleValue = await page.evaluate(() => {
        return (document.querySelector(
          'input[name="title"]',
        ) as HTMLInputElement)?.value;
      });
      const bodyValue = await page.evaluate(() => {
        return (document.querySelector(
          'textarea[name="body"]',
        ) as HTMLTextAreaElement)?.value;
      });

      assert(
        titleValue === "My Draft Title",
        "Title should be restored from draft",
      );
      assert(
        bodyValue?.includes("Draft content..."),
        "Body should contain original text",
      );
      assert(
        bodyValue?.includes("![test.png](images/test.png)"),
        "Body should contain image link restored from draft",
      );
    });
  });
});
