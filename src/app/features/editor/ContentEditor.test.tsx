import "@/testing/setup_dom.ts";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ContentEditor } from "./ContentEditor.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";

const MOCK_CONFIG = `
collections:
  - name: "posts"
    label: "Posts"
    folder: "content/posts"
    fields:
      - name: "title"
        label: "Title"
        widget: "string"
      - name: "body"
        label: "Body"
        widget: "markdown"
`.trim();

const MOCK_CONTENT_BODY = "Body content";
const MOCK_CONTENT = `---
title: Hello World
---
${MOCK_CONTENT_BODY}`;

Deno.test({
  name: "ContentEditor: renders editor with content",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Mock Fetch
    const fetchStub = stub(
      globalThis,
      "fetch",
      (input: string | URL | Request) => {
        const url = input.toString();
        if (url.endsWith("/config")) {
          return Promise.resolve(new Response(MOCK_CONFIG));
        }
        if (url.includes("/content/posts/hello.md")) {
          return Promise.resolve(new Response(MOCK_CONTENT));
        }
        // Mock Repository Info
        if (
          url.includes("/api/repo/") && !url.endsWith("/config") &&
          !url.includes("/contents/")
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ default_branch: "main" })),
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
      const { findByText, findByTestId, findByDisplayValue, unmount } = render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/user/repo/posts/hello.md"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:content/:article"
                element={<ContentEditor />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );

      // Verify Config Load (Breadcrumb)
      await findByText("Posts");
      await findByText("hello.md");

      // Verify FrontMatter content (Title)
      await findByDisplayValue("Hello World");

      // Verify Body (Mocked Editor)
      await findByTestId("mock-md-editor");
      const textarea = await findByTestId(
        "mock-md-editor-textarea",
      ) as HTMLTextAreaElement;

      // Wait for content to populate
      await waitFor(() => {
        if (textarea.value !== MOCK_CONTENT_BODY) {
          throw new Error(
            `Content mismatch. Expected: ${MOCK_CONTENT_BODY}, Actual: ${textarea.value}`,
          );
        }
      });

      unmount();
    } finally {
      fetchStub.restore();
    }
  },
});
