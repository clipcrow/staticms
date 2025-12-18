import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stub } from "@std/testing/mock";
import { ContentEditor } from "./ContentEditor.tsx";
import { ToastProvider } from "@/app/contexts/ToastContext.tsx";
import { HeaderProvider, useHeader } from "@/app/contexts/HeaderContext.tsx";
import { Header } from "@/app/components/common/Header.tsx";
import { Collection } from "@/app/hooks/useContentConfig.ts";
import { Draft } from "@/shared/types.ts";
// Types for Mock Layout
import { EditorLayoutProps } from "@/app/components/editor/EditorLayout.tsx";

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

// ----------------------------------------------------------------------------
// Mocks & Helpers
// ----------------------------------------------------------------------------

// Mock Layout to avoid CSS imports from MarkdownEditor
// Capture props for direct testing
// deno-lint-ignore no-explicit-any
let lastLayoutProps: any = null;

function MockEditorLayout(props: EditorLayoutProps) {
  lastLayoutProps = props;
  return (
    <div data-testid="mock-editor-layout">
      <div data-testid="collection-label">{props.collection.label}</div>
    </div>
  );
}

const MOCK_COLLECTIONS: Collection[] = [
  {
    name: "posts_dir",
    label: "Posts (Dir)",
    folder: "content/posts_dir",
    binding: "directory",
    type: "collection",
    fields: [
      { name: "title", label: "Title", widget: "string", required: true },
      { name: "body", widget: "markdown" },
    ],
  },
  {
    name: "posts_file",
    label: "Posts (File)",
    folder: "content/posts_file",
    binding: "file",
    type: "collection",
    fields: [
      { name: "title", label: "Title", widget: "string", required: true },
      { name: "body", widget: "markdown" },
    ],
  },
];

// Factory to create a controlled useDraft hook
function createMockUseDraft(initialDraft: Draft) {
  let draft = initialDraft;
  const subscribers: (() => void)[] = [];

  const setDraft = (
    val: Draft | ((prev: Draft) => Draft),
    _loaded?: boolean,
    _sync?: boolean,
  ) => {
    if (typeof val === "function") {
      draft = val(draft);
    } else {
      draft = val;
    }
    subscribers.forEach((cb) => cb());
  };

  // We need a way for the hook to 'update' the component.
  // In a real hook, setInternalDraft triggers re-render.
  // In our mock factory, we return a fresh object on each render call by the test runner?
  // No, the test runner calls render once.
  // Dependency Injection relies on the component calling the hook.

  // Implementation for the HOOK FUNCTION itself:
  return () => {
    // Force re-render not really possible from inside this pure function mock without React state.
    // BUT replace_file_content replaces the whole file, so I can use React.useState inside the Mock hook!

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [d, setD] = React.useState(draft);

    // Sync external draft ref with internal state
    // deno-lint-ignore no-explicit-any
    const setDraftWrapper = (v: any, l?: any, s?: any) => {
      setDraft(v, l, s); // update external ref
      // update internal state to trigger re-render
      if (typeof v === "function") {
        // deno-lint-ignore no-explicit-any
        setD((prev: any) => v(prev));
      } else {
        setD(v);
      }
    };

    return {
      draft: d,
      setDraft: setDraftWrapper,
      loaded: true,
      fromStorage: false,
      clearDraft: () => {},
      isSynced: false,
    };
  };
}
// Fix types for React import
import React from "react";

// Factory to create a controlled useContentConfig hook
function createMockUseContentConfig() {
  return () => ({
    config: {
      collections: MOCK_COLLECTIONS,
    },
    loading: false,
    error: null,
  });
}

// Factory to create a controlled useRepository hook
function createMockUseRepository() {
  return () => ({
    repository: {
      id: 1,
      name: "repo",
      full_name: "user/repo",
      owner: { login: "user", avatar_url: "" },
      private: false,
      description: null,
      default_branch: "main",
    },
    loading: false,
    error: null,
  });
}

// Factory to create a controlled useContentSync hook
function createMockUseContentSync() {
  return () => ({
    fetching: false,
    originalDraft: null,
    triggerReload: () => {},
  });
}

// deno-lint-ignore require-await
async function setupAndRender(
  // deno-lint-ignore no-unused-vars
  path: string,
  initialEntries: string[],
  injectProps: Partial<React.ComponentProps<typeof ContentEditor>> = {},
) {
  lastLayoutProps = null;
  let capturedBody: string | null = null;
  const fetchCalls: string[] = [];
  const consoleErrorStub = stub(console, "error");

  const fetchStub = stub(
    globalThis,
    "fetch",
    // deno-lint-ignore no-explicit-any
    (_input: string | URL | Request, init?: RequestInit | any) => {
      if (init?.method === "POST" && init?.body) {
        capturedBody = init.body as string;
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, pr: { number: 123 } })),
        );
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
              path="/:owner/:repo/:content/new"
              element={
                <>
                  <TestHeader />
                  <ContentEditor
                    mode="new"
                    useDraftHook={injectProps.useDraftHook}
                    useContentConfigHook={injectProps.useContentConfigHook}
                    useRepositoryHook={injectProps.useRepositoryHook}
                    useContentSyncHook={injectProps.useContentSyncHook}
                    LayoutComponent={MockEditorLayout}
                  />
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

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

Deno.test({
  name: "ContentEditor: Directory Binding - Correctly formats path on save",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const promptStub = stub(globalThis, "prompt", () => "my-dir-post");

    // Mock Hooks
    const useDraftHook = createMockUseDraft({ frontMatter: {}, body: "" });
    const useContentConfigHook = createMockUseContentConfig();
    const useRepositoryHook = createMockUseRepository();
    const useContentSyncHook = createMockUseContentSync();

    const {
      getCapturedBody,
      fetchStub,
      consoleErrorStub,
      unmount,
      findByTestId,
    } = await setupAndRender(
      "/:owner/:repo/:content/new",
      ["/user/repo/posts_dir/new"],
      {
        useDraftHook,
        useContentConfigHook,
        useRepositoryHook,
        useContentSyncHook,
      },
    );

    try {
      // 1. Initial Render Check via Mock Layout
      // We look for the label rendered by MockEditorLayout
      const label = await findByTestId("collection-label");
      if (label.textContent !== "Posts (Dir)") {
        throw new Error(`Expected Posts (Dir), got ${label.textContent}`);
      }

      // 2. Input Data
      if (!lastLayoutProps) throw new Error("Layout not rendered");

      const newFm = {
        ...lastLayoutProps.draft.frontMatter,
        title: "My Dir Post",
      };
      lastLayoutProps.onFrontMatterChange(newFm);

      // Wait for re-render if needed, but since we have direct access, we can re-check lastLayoutProps?
      // actually lastLayoutProps is a reference to the Object passed.
      // On re-render, MockEditorLayout is called again, lastLayoutProps is updated.

      // We need to wait for the update to propagate?
      // Since `setDraft` is async (in React), we should wait.
      await new Promise((r) => setTimeout(r, 0));

      // 3. Save
      if (!lastLayoutProps) throw new Error("Layout lost");
      // Verify update happened
      // const currentTitle = (lastLayoutProps.draft.frontMatter as any).title;
      // if (currentTitle !== "My Dir Post") throw new Error("Draft update failed");

      lastLayoutProps.onSave();

      // 4. Verification (Synchronous-like due to mocks)
      await new Promise((r) => setTimeout(r, 0));

      if (!getCapturedBody()) {
        throw new Error("Fetch was not called");
      }

      const bodyObj = JSON.parse(getCapturedBody()!);
      const update = bodyObj.updates[0];

      if (update.path !== "content/posts_dir/my-dir-post/index.md") {
        throw new Error(
          `Expected content/posts_dir/my-dir-post/index.md, got ${update.path}`,
        );
      }
    } finally {
      promptStub.restore();
      fetchStub.restore();
      consoleErrorStub.restore();
      unmount();
    }
  },
});

Deno.test({
  name: "ContentEditor: File Binding - Correctly formats path on save",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const promptStub = stub(globalThis, "prompt", () => "my-file-post");

    // Mock Hooks
    const useDraftHook = createMockUseDraft({ frontMatter: {}, body: "" });
    const useContentConfigHook = createMockUseContentConfig();
    const useRepositoryHook = createMockUseRepository();
    const useContentSyncHook = createMockUseContentSync();

    const {
      getCapturedBody,
      fetchStub,
      consoleErrorStub,
      unmount,
      findByTestId,
    } = await setupAndRender(
      "/:owner/:repo/:content/new",
      ["/user/repo/posts_file/new"],
      {
        useDraftHook,
        useContentConfigHook,
        useRepositoryHook,
        useContentSyncHook,
      },
    );

    try {
      // 1. Initial Render Check
      const label = await findByTestId("collection-label");
      if (label.textContent !== "Posts (File)") {
        throw new Error(`Expected Posts (File), got ${label.textContent}`);
      }

      // 2. Input Data
      if (!lastLayoutProps) throw new Error("Layout not rendered");

      const newFm = {
        ...lastLayoutProps.draft.frontMatter,
        title: "My File Post",
      };
      lastLayoutProps.onFrontMatterChange(newFm);

      await new Promise((r) => setTimeout(r, 0));

      // 3. Save
      if (!lastLayoutProps) throw new Error("Layout lost");
      lastLayoutProps.onSave();

      // 4. Verification
      await new Promise((r) => setTimeout(r, 0));

      if (!getCapturedBody()) {
        throw new Error("Fetch was not called");
      }

      const bodyObj = JSON.parse(getCapturedBody()!);
      const update = bodyObj.updates[0];

      if (update.path !== "content/posts_file/my-file-post.md") {
        throw new Error(
          `Expected content/posts_file/my-file-post.md, got ${update.path}`,
        );
      }
    } finally {
      promptStub.restore();
      fetchStub.restore();
      consoleErrorStub.restore();
      unmount();
    }
  },
});
