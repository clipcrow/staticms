import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ArticleList } from "./ArticleList.tsx";
import { HeaderProvider, useHeader } from "@/app/contexts/HeaderContext.tsx";
import { Header } from "@/app/components/common/Header.tsx";

// Helper component to render header from context
function TestHeader() {
  const { breadcrumbs, title, rightContent } = useHeader();
  return (
    <Header
      breadcrumbs={breadcrumbs}
      title={title}
      rightContent={rightContent}
    />
  );
}

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
      if (url.match(/\/api\/repo\/[^/]+\/[^/]+$/)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              name: "repo",
              owner: { login: "user" },
              default_branch: "main",
              configured_branch: "main",
            }),
            { headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.includes("/content/posts")) {
        return Promise.resolve(
          new Response(JSON.stringify(MOCK_FILES), {
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });

    try {
      const { findByText } = render(
        <HeaderProvider>
          <MemoryRouter initialEntries={["/user/repo/posts"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:content"
                element={
                  <>
                    <TestHeader />
                    <ArticleList />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </HeaderProvider>,
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
