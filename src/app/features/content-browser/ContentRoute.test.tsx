import "@/testing/setup_dom.ts";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ContentRoute } from "./ContentRoute.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

const MOCK_CONFIG = `
collections:
  - name: "posts"
    label: "Posts"
    folder: "content/posts"
    fields:
      - name: "title"
        widget: "string"
  - name: "site_settings"
    label: "Settings"
    type: "singleton"
    path: "content/settings.md"
    fields:
      - name: "title"
        widget: "string"
`.trim();

const MOCK_CONTENT = "---\ntitle: Test\n---\nBody";

Deno.test({
  name: "ContentRoute: renders ArticleList for collection type",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      (input: string | URL | Request) => {
        const url = input.toString();
        if (url.endsWith("/config")) {
          return Promise.resolve(new Response(MOCK_CONFIG));
        }
        if (url.includes("/contents")) {
          return Promise.resolve(new Response(JSON.stringify([]))); // Empty list
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      },
    );

    try {
      const { findByPlaceholderText, queryByTestId } = render(
        <HeaderProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/user/repo/posts"]}>
              <Routes>
                <Route
                  path="/:owner/:repo/:content"
                  element={<ContentRoute />}
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </HeaderProvider>,
      );

      // Should render ArticleList -> "Filter articles..." input
      await findByPlaceholderText("Filter articles...");

      // Should NOT render editor
      const editor = queryByTestId("mock-md-editor");
      if (editor) {
        throw new Error("Editor should not be present in ArticleList view");
      }
    } finally {
      fetchStub.restore();
      cleanup();
    }
  },
});

Deno.test({
  name: "ContentRoute: renders ContentEditor for singleton type",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      (input: string | URL | Request) => {
        const url = input.toString();
        if (url.endsWith("/config")) {
          return Promise.resolve(new Response(MOCK_CONFIG));
        }
        // Singleton editor will fetch the file
        if (url.includes("content/settings.md")) {
          return Promise.resolve(
            new Response(JSON.stringify({
              content: btoa(MOCK_CONTENT),
              sha: "123",
              path: "content/settings.md",
            })),
          );
        }
        if (url.includes("/api/user")) {
          return Promise.resolve(
            new Response(JSON.stringify({ login: "testuser" })),
          );
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      },
    );

    try {
      const { findByTestId, queryByPlaceholderText } = render(
        <HeaderProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/user/repo/site_settings"]}>
              <Routes>
                <Route
                  path="/:owner/:repo/:content"
                  element={<ContentRoute />}
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </HeaderProvider>,
      );

      // Should render ContentEditor -> ContentEditor -> MockMDEditor
      await findByTestId("mock-md-editor");

      // Should NOT render ArticleList filter
      // Add a small delay to ensure any potential ArticleList rendering would have happened (if it was race condition)
      // Though findByTestId generally waits.
      const filter = queryByPlaceholderText("Filter articles...");
      if (filter) {
        throw new Error(
          "ArticleList filter should not be present in Singleton view",
        );
      }
    } finally {
      fetchStub.restore();
      cleanup();
    }
  },
});

Deno.test({
  name: "ContentRoute: renders warning for unknown collection",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      (_input: string | URL | Request) => {
        // Return config, but we will request bad-collection
        return Promise.resolve(new Response(MOCK_CONFIG));
      },
    );

    try {
      const { findByText } = render(
        <HeaderProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={["/user/repo/unknown-col"]}>
              <Routes>
                <Route
                  path="/:owner/:repo/:content"
                  element={<ContentRoute />}
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </HeaderProvider>,
      );

      await findByText('Content "unknown-col" not found in configuration.');
    } finally {
      fetchStub.restore();
      cleanup();
    }
  },
});
