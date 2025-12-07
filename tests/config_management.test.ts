import { withBrowser } from "./setup.ts";
import { assert } from "@std/assert";

Deno.test("US-04: Content Configuration Management", async () => {
  await withBrowser(async (browser) => {
    const page = await browser.newPage("http://localhost:8000");
    page.addEventListener(
      "console",
      (e) => console.log(`[Browser] ${e.detail.text}`),
    );
    await page.waitForSelector("body");

    // 1. Navigate to Dashboard (Skip Repo Selection by direct URL if possible, but let's follow flow for realism)
    const repoLinkSelector = ".repo-item";
    await page.waitForSelector(repoLinkSelector);
    await page.evaluate(() => {
      const el = document.querySelector(".repo-item .header") as HTMLElement;
      if (el) el.click();
    });
    await page.waitForSelector(".content-browser-header");

    // 2. Add New Content
    // Click "Add New Content"
    const addBtnSelector = "button.ui.primary.button"; // The floating button
    await page.waitForSelector(addBtnSelector);
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const addBtn = btns.find((b) =>
        b.textContent?.includes("Add New Content")
      );
      if (addBtn) addBtn.click();
      else throw new Error("Add New Content button not found");
    });

    // Verify URL
    const urlAdd = await page.evaluate(() => location.href);
    assert(urlAdd.includes("action=add"), "URL should contain action=add");

    // Fill Form
    await page.waitForSelector("form");

    // Helper to fill input compatible with React
    const fillInput = async (selector: string, value: string) => {
      await page.evaluate((arg: { selector: string; value: string }) => {
        const { selector, value } = arg;
        const input = document.querySelector(selector) as HTMLInputElement;
        if (input) {
          // React overrides the value setter, so we need to call the native one
          // to ensure the 'input' event triggers a state change.
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            globalThis.HTMLInputElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true })); // Safe measure
        } else {
          throw new Error(`Selector ${selector} not found`);
        }
      }, { args: [{ selector, value }] });
    };

    // Helper for textarea
    const fillTextarea = async (selector: string, value: string) => {
      await page.evaluate((arg: { selector: string; value: string }) => {
        const { selector, value } = arg;
        const input = document.querySelector(selector) as HTMLTextAreaElement;
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            globalThis.HTMLTextAreaElement.prototype,
            "value",
          )?.set;
          nativeInputValueSetter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          throw new Error(`Selector ${selector} not found`);
        }
      }, { args: [{ selector, value }] });
    };

    // Name input (2nd field usually)
    await fillInput('input[placeholder="posts"]', "news"); // Name
    await fillInput('input[placeholder="Blog Posts"]', "News"); // Label
    await fillInput('input[placeholder="content/posts"]', "content/news"); // Folder

    // Fields YAML
    await fillTextarea(
      "textarea",
      "- {label: 'Title', name: 'title', widget: 'string'}",
    );

    // Submit
    await Promise.all([
      page.waitForNavigation({ waitUntil: "load" }),
      page.evaluate(() => {
        const submitBtn = document.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement;
        submitBtn.click();
      }),
    ]);

    // Wait for reload (Dashboard should appear again)
    // The reload happens, so we wait for content-browser-header and the NEW item
    await page.waitForSelector(".content-browser-header");

    // Check if "News" is in the list
    await page.waitForSelector(".collection-item");
    const collections = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".collection-item .header")).map(
        (el) => el.textContent,
      )
    );
    assert(
      collections.includes("News"),
      "Should list 'News' collection after add",
    );

    // 3. Edit Content
    // Find "Config" button for "News"
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".collection-item"));
      const newsItem = items.find((el) => el.textContent?.includes("News"));
      if (!newsItem) throw new Error("News item not found");

      const configBtn = newsItem.querySelector("a.button.basic") as HTMLElement; // Config button
      if (configBtn) configBtn.click();
      else throw new Error("Config button not found");
    });

    // Verify URL
    await page.waitForSelector("form"); // reusing wait for form
    const urlEdit = await page.evaluate(() => location.href);
    assert(urlEdit.includes("action=edit"), "URL should contain action=edit");
    assert(urlEdit.includes("target=news"), "URL should contain target=news");

    // Change Label
    await fillInput('input[placeholder="Blog Posts"]', "Latest News");

    // Submit
    await page.evaluate(() => {
      const submitBtn = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      submitBtn.click();
    });

    try {
      await page.waitForNavigation({ waitUntil: "load" });
    } catch {
      const errorMsg = await page.evaluate(() => {
        const el = document.querySelector(".ui.negative.message");
        return el ? el.textContent : null;
      });
      if (errorMsg) {
        throw new Error(`Submit (Edit) failed with error: ${errorMsg}`);
      }
    }

    // Wait for reload and verification
    await page.waitForSelector(".content-browser-header");

    const collectionsAfter = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".collection-item .header")).map(
        (el) => el.textContent,
      )
    );
    assert(
      collectionsAfter.includes("Latest News"),
      "Should list 'Latest News' collection after edit",
    );

    await page.close();
  });
});
