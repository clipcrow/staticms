import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ContentEditor } from "./ContentEditor.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";

const MOCK_YAML_CONFIG = `
collections:
  - name: "settings"
    label: "Settings"
    type: "singleton"
    path: "data/settings.yml"
    fields:
      - name: "site_title"
        label: "Site Title"
        widget: "string"
      - name: "description"
        label: "Description"
        widget: "string"
`.trim();

const MOCK_YAML_CONTENT = `site_title: My Awesome Site
description: The best site
`;

Deno.test({
  name: "ContentEditor: renders YAML editor for singleton .yml files",
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
          return Promise.resolve(new Response(MOCK_YAML_CONFIG));
        }
        if (url.includes("/data/settings.yml")) {
          return Promise.resolve(new Response(MOCK_YAML_CONTENT));
        }
        if (url.includes("/api/repo/user/repo/contents/data")) {
          // Return empty directory list
          return Promise.resolve(new Response(JSON.stringify([])));
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
      const { findByText, queryByTestId, findByDisplayValue, unmount } = render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/user/repo/settings"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:collectionName"
                element={<ContentEditor />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>,
      );

      // Verify Config Load
      await findByText("Settings");

      // Verify Fields loaded (FrontMatterItemEditor)
      await findByDisplayValue("My Awesome Site");

      // Verify Markdown Editor is NOT present (Goal)
      // Note: Currently it IS present, so this test might fail initially (Red).
      // Or we can assert it is present for now, and then after I implement the logic, I change the test to expect null.
      // TDD: I write the test expecting the DESIRED behavior.

      const mdEditor = queryByTestId("mock-md-editor");
      if (mdEditor) {
        throw new Error("Markdown editor should not be present for YAML files");
      }

      unmount();
    } finally {
      fetchStub.restore();
    }
  },
});
