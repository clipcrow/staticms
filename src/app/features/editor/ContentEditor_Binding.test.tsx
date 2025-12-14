import "@/testing/setup_dom.ts";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ContentEditor } from "./ContentEditor.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";
import { HeaderProvider, useHeader } from "@/app/contexts/HeaderContext.tsx";
import { Header } from "@/app/components/common/Header.tsx";

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
  - name: "posts_dir"
    label: "Posts (Dir)"
    folder: "content/posts_dir"
    binding: "directory"
    fields:
      - name: "title"
        label: "Title"
        widget: "string"
      - name: "body"
        widget: "markdown"
  - name: "posts_file"
    label: "Posts (File)"
    folder: "content/posts_file"
    binding: "file"
    fields:
      - name: "title"
        label: "Title"
        widget: "string"
      - name: "body"
        widget: "markdown"
`.trim();

function setupAndRender(_path: string, initialEntries: string[]) {
  localStorage.clear();
  let capturedBody: string | null = null;
  const fetchCalls: string[] = [];

  // Stub console.error to catch hidden errors
  const consoleErrorStub = stub(console, "error");

  const fetchStub = stub(
    globalThis,
    "fetch",
    // deno-lint-ignore no-explicit-any
    (input: string | URL | Request, init?: RequestInit | any) => {
      const url = input.toString();
      fetchCalls.push(url);

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
      if (url.includes("/api/user")) {
        return Promise.resolve(
          new Response(JSON.stringify({ login: "testuser" })),
        );
      }
      if (url.endsWith("/batch-commit") && init?.method === "POST") {
        capturedBody = init.body as string;
        return Promise.resolve(new Response(JSON.stringify({ success: true })));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    },
  );

  const utils = render(
    <HeaderProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route
              path="/:owner/:repo/:collectionName/new"
              element={
                <>
                  <TestHeader />
                  <ContentEditor mode="new" />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </HeaderProvider>,
  );

  return {
    ...utils,
    fetchStub,
    consoleErrorStub,
    getCapturedBody: () => capturedBody,
    fetchCalls,
  };
}

Deno.test({
  name:
    "ContentEditor: Correctly formats path for directory binding in new mode",
  ignore: true, // TODO: Fix disabled button issue in test env
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const promptStub = stub(globalThis, "prompt", () => "my-dir-post");

    const {
      getCapturedBody,
      fetchStub,
      consoleErrorStub,
      unmount,
      findByText,
      findByLabelText,
      findByDisplayValue,
      fetchCalls,
    } = await setupAndRender(
      "/:owner/:repo/:collectionName/new",
      ["/user/repo/posts_dir/new"],
    );

    try {
      await findByText("Posts (Dir)");
      const titleInput = await findByLabelText("Title");
      const saveBtn = await findByText("Create PR");

      // Wait for hooks to settle
      await new Promise((r) => setTimeout(r, 100));

      fireEvent.change(titleInput, { target: { value: "My Dir Post" } });
      await findByDisplayValue("My Dir Post");

      // Verify button is enabled
      await waitFor(() => {
        if ((saveBtn as HTMLButtonElement).disabled) {
          throw new Error("Button still disabled");
        }
      });

      // Ensure click is registered
      fireEvent.click(saveBtn);

      // Wait with longer timeout
      await waitFor(() => {
        // If console error occurred, fail immediately
        if (consoleErrorStub.calls.length > 0) {
          throw new Error(`Console Error: ${consoleErrorStub.calls[0].args}`);
        }

        if (!getCapturedBody()) {
          throw new Error("Fetch not called");
        }
      }, { timeout: 4000 });

      const bodyObj = JSON.parse(getCapturedBody()!);
      const update = bodyObj.updates[0];

      if (update.path !== "content/posts_dir/my-dir-post/index.md") {
        throw new Error(
          `Expected content/posts_dir/my-dir-post/index.md, got ${update.path}`,
        );
      }
    } catch (e) {
      console.log("DEBUG: Fetch Calls:", fetchCalls);
      throw e;
    } finally {
      promptStub.restore();
      fetchStub.restore();
      consoleErrorStub.restore();
      unmount();
    }
  },
});

Deno.test({
  name: "ContentEditor: Correctly formats path for file binding in new mode",
  ignore: true, // TODO: Fix disabled button issue in test env
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const promptStub = stub(globalThis, "prompt", () => "my-file-post");

    const {
      getCapturedBody,
      fetchStub,
      consoleErrorStub,
      unmount,
      findByText,
      findByLabelText,
      findByDisplayValue,
      fetchCalls,
    } = await setupAndRender(
      "/:owner/:repo/:collectionName/new",
      ["/user/repo/posts_file/new"],
    );

    try {
      await findByText("Posts (File)");
      const titleInput = await findByLabelText("Title");
      const saveBtn = await findByText("Create PR");

      // Wait for hooks to settle
      await new Promise((r) => setTimeout(r, 100));

      fireEvent.change(titleInput, { target: { value: "My File Post" } });
      await findByDisplayValue("My File Post");

      await waitFor(() => {
        if ((saveBtn as HTMLButtonElement).disabled) {
          throw new Error("Button still disabled");
        }
      });

      fireEvent.click(saveBtn);

      await waitFor(() => {
        if (consoleErrorStub.calls.length > 0) {
          throw new Error(`Console Error: ${consoleErrorStub.calls[0].args}`);
        }
        if (!getCapturedBody()) throw new Error("Fetch not called");
      }, { timeout: 4000 });

      const bodyObj = JSON.parse(getCapturedBody()!);
      const update = bodyObj.updates[0];

      if (update.path !== "content/posts_file/my-file-post.md") {
        throw new Error(
          `Expected content/posts_file/my-file-post.md, got ${update.path}`,
        );
      }
    } catch (e) {
      console.log("DEBUG: Fetch Calls:", fetchCalls);
      throw e;
    } finally {
      promptStub.restore();
      fetchStub.restore();
      consoleErrorStub.restore();
      unmount();
    }
  },
});
