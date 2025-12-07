import { launch } from "astral";

export async function withBrowser(
  testFn: (browser: Awaited<ReturnType<typeof launch>>) => Promise<void>,
) {
  const browser = await launch();
  try {
    await testFn(browser);
  } finally {
    await browser.close();
  }
}

export async function withPage(
  testFn: (
    page: Awaited<ReturnType<Awaited<ReturnType<typeof launch>>["newPage"]>>,
  ) => Promise<void>,
) {
  await withBrowser(async (browser) => {
    const page = await browser.newPage("http://localhost:8000"); // Base URL is tentative

    // Proxy browser console logs to Deno terminal
    // deno-lint-ignore no-explicit-any
    (page as any).on("console", (msg: any) => {
      console.log(`[Browser] ${msg.text}`);
    });

    await testFn(page);
  });
}
