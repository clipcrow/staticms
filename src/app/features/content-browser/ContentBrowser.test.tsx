import "@/testing/setup_dom.ts";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ContentBrowser } from "./ContentBrowser.tsx";
import { assertEquals, assertExists } from "@std/assert";
import { assertSpyCall, stub } from "@std/testing/mock";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

Deno.test({
  name: "ContentBrowser: fetches config and displays collections",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // 1. Mock fetch
    const mockConfig = `
collections:
  - name: "posts"
    label: "Posts"
    folder: "content/posts"
  - name: "pages"
    label: "Pages"
    files: 
      - file: "content/about.md"
        label: "About Page"
`;

    const fetchStub = stub(globalThis, "fetch", () =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(mockConfig),
        json: () => Promise.reject("Not JSON"),
      } as Response));

    try {
      // 2. Render Component
      const { getByText } = render(
        <HeaderProvider>
          <MemoryRouter initialEntries={["/repo/user/my-blog"]}>
            <Routes>
              <Route path="/repo/:owner/:repo" element={<ContentBrowser />} />
            </Routes>
          </MemoryRouter>
        </HeaderProvider>,
      );

      // 4. Verify Fetch Call
      // Wait for effect
      await waitFor(() => assertExists(getByText("Posts")));

      // Check if "Pages" is also there
      assertExists(getByText("Pages"));

      // Verify fetch arguments
      // We expect it to fetch the config file.
      assertSpyCall(fetchStub, 0);
      const url = fetchStub.calls[0].args[0] as string;
      assertEquals(url.includes("user/my-blog"), true);
      assertEquals(url.includes("config"), true); // Expecting 'config' in path
    } finally {
      fetchStub.restore();
    }
  },
});
