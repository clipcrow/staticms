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

    // Verify value
    const textareaVal = await page.evaluate(() =>
      (document.querySelector("textarea") as HTMLTextAreaElement).value
    );
    console.log("Textarea value:", textareaVal);
    assert(textareaVal.includes("Title"), "Textarea should be updated");

    // Submit
    await page.evaluate(() => {
      const submitBtn = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement;
      submitBtn.click();
    });

    // Wait for the URL to change back to NOT having ?action=add
    // Explicit wait to allow reload to happen
    await new Promise((r) => setTimeout(r, 2000));

    // Check for error message
    const errorMsg = await page.evaluate(() => {
      const el = document.querySelector(".ui.negative.message");
      return el ? (el as HTMLElement).innerText : null;
    });
    if (errorMsg) {
      console.error("Config Save Error:", errorMsg);
      throw new Error(`Config Save Error: ${errorMsg}`);
    }

    const urlAfterAdd = await page.evaluate(() => location.href);
    console.log("URL after add submit:", urlAfterAdd);
    assert(
      !urlAfterAdd.includes("action="),
      `Action param should be cleared, got ${urlAfterAdd}`,
    );

    // Check if "News" is in the list
    await page.waitForSelector(".collection-item");
    const collectionHeaders = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".collection-item .header")).map(
        (el) => el.textContent,
      )
    );
    assert(
      collectionHeaders.includes("News"),
      "Should list 'News' collection after add",
    );

    // Check duplication
    const newsCount = collectionHeaders.filter((h) => h === "News").length;
    assert(newsCount === 1, "Should have exactly one 'News' item");

    // 3. Edit Content
    // Find "Config" button for "News"
    await page.evaluate(() => {
      // Find the item with header "News"
      const items = Array.from(document.querySelectorAll(".collection-item"));
      const newsItem = items.find((item) =>
        item.querySelector(".header")?.textContent === "News"
      );
      if (!newsItem) throw new Error("News item not found");

      // Find Config button
      const configBtn = Array.from(newsItem.querySelectorAll("a.button")).find(
        (a) => a.textContent?.trim() === "Config",
      ) as HTMLElement;
      if (!configBtn) throw new Error("Config button not found for News");

      configBtn.click();
    });

    // Wait for editor
    await page.waitForSelector("form");
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

    // Wait for return to dashboard
    await page.waitForFunction(() => !location.search.includes("action="));

    // Wait for DOM stabilization
    await new Promise((r) => setTimeout(r, 2000));

    await page.waitForSelector(".collection-item", { timeout: 15000 }); // Ensure items are loaded

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
