import { assert } from "@std/assert";
import {
  closeKv,
  kv,
  loginAsTestUser,
  TEST_BASE_URL,
  withPage,
} from "./setup.ts";

Deno.test("US-05: Content Editing & Draft", async (t) => {
  await t.step("Auto-saving draft and session resumption", async () => {
    try {
      await withPage(async (page) => {
        // Seed Config directly
        await kv.set(
          ["config", "user", "my-blog"],
          JSON.stringify({
            collections: [
              {
                name: "posts",
                label: "Posts",
                type: "collection",
                path: "content/posts",
                fields: [
                  { name: "title", widget: "string" },
                  { name: "body", widget: "markdown" },
                ],
              },
            ],
          }),
        );

        const { apiStub } = await loginAsTestUser(page, "testuser", {
          "/repos/user/my-blog/contents/.github/staticms.yml": () =>
            new Response(JSON.stringify({ message: "Not Found" }), {
              status: 404,
            }),
          "/repos/user/my-blog/contents/content/posts": () =>
            new Response(JSON.stringify([]), { status: 200 }),
        });

        try {
          // 2. Navigate to Article List
          await page.goto(`${TEST_BASE_URL}/user/my-blog/posts`);

          // Wait for list to load
          await page.waitForSelector('input[placeholder^="New article name"]');

          // 3. Create New Article
          // Type name
          await page.evaluate(() => {
            const input = document.querySelector(
              'input[placeholder^="New article name"]',
            ) as HTMLInputElement;
            if (input) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                globalThis.window.HTMLInputElement.prototype,
                "value",
              )?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, "my-new-post");
              } else {
                input.value = "my-new-post";
              }
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
          });

          // Click Create
          await page.evaluate(() => {
            const createBtn = Array.from(
              document.querySelectorAll("button.ui.primary.button"),
            )
              .find((b) => b.textContent?.includes("Create"));
            if (!createBtn) {
              throw new Error("Create button not found");
            }
            (createBtn as HTMLElement).click();
          });

          // 4. Wait for Editor
          await page.waitForSelector(".content-editor");
          const editorUrl = await page.evaluate(() => location.href);
          assert(editorUrl.includes("/new"), "Should be on new article page");

          // 5. Edit Content (Title & Body)
          const fillInput = async (selector: string, value: string) => {
            await page.evaluate(({ s, v }: { s: string; v: string }) => {
              const el = document.querySelector(s) as HTMLInputElement;
              if (el) {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                  globalThis.window.HTMLInputElement.prototype,
                  "value",
                )?.set;
                const nativeTextAreaValueSetter = Object
                  .getOwnPropertyDescriptor(
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

          await fillInput('input[name="title"]', "My Draft Title");
          await fillInput(".content-editor textarea", "Draft content...");

          // 5.5. Image Drop Test
          await page.evaluate(() => {
            const textarea = document.querySelector(".content-editor textarea");
            if (!textarea) return;

            const content = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG Header signature
            const file = new File([content], "test.png", { type: "image/png" });

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
              ".content-editor textarea",
            ) as HTMLTextAreaElement)?.value;
          });
          assert(
            bodyAfterDrop.includes("![test.png](test.png)"),
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
              ".content-editor textarea",
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
            bodyValue?.includes("![test.png](test.png)"),
            "Body should contain image link restored from draft",
          );
        } finally {
          apiStub.restore();
        }
      });
    } finally {
      closeKv();
    }
  });
});
