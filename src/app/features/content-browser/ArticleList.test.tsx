import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ArticleList } from "./ArticleList.tsx";

const MOCK_CONFIG = `
collections:
  - name: "posts"
    label: "Posts"
    folder: "content/posts"
`;

const MOCK_FILES = [
  {
    name: "test-post.md",
    path: "content/posts/test-post.md",
    size: 100,
    type: "file",
    sha: "dummy-sha",
  },
];

Deno.test({
  name: "ArticleList: displays entries based on config",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const fetchStub = stub(globalThis, "fetch", (input) => {
      const url = input.toString();
      if (url.endsWith("/config")) {
        return Promise.resolve(new Response(MOCK_CONFIG));
      }
      if (url.includes("/content/posts")) {
        return Promise.resolve(new Response(JSON.stringify(MOCK_FILES)));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    try {
      const { findByText } = render(
        // New path: /:owner/:repo/:collectionName
        <MemoryRouter initialEntries={["/user/repo/posts"]}>
          <Routes>
            <Route
              path="/:owner/:repo/:collectionName"
              element={<ArticleList />}
            />
          </Routes>
        </MemoryRouter>,
      );

      // Should verify Header
      await findByText("Posts");

      // Should verify Entry Item
      await findByText("test-post.md");
    } finally {
      fetchStub.restore();
    }
  },
});
