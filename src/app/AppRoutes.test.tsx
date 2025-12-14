import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes.tsx";
import { assertEquals } from "@std/assert";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

Deno.test({
  name: "AppRoutes routing test",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Mock Components for Routing Test
    // Dependency Injection pattern or jest.mock isn't available easily for ES modules in Deno without loader hooks.
    // So we will rely on integration testing or props injection if feasible.
    // For now, let's test if the correct path structure is matched using MemoryRouter.

    // Mock Components
    const MockRepositorySelector = () => (
      <div data-testid="repo-selector">Repo Selector</div>
    );
    const MockContentBrowser = () => (
      <div data-testid="content-browser">Content Browser</div>
    );

    // 1. Home Path
    const { findByTestId, getByText } = render(
      <HeaderProvider>
        <MemoryRouter initialEntries={["/"]}>
          <AppRoutes
            RepositorySelectorComponent={MockRepositorySelector}
            ContentBrowserComponent={MockContentBrowser}
          />
        </MemoryRouter>
      </HeaderProvider>,
    );

    assertEquals(
      await findByTestId("repo-selector"),
      getByText("Repo Selector"),
    );

    // 2. Repo Path (Note: cleanup is required if running in same test step or re-rendering)
    // To be clean, we can split into steps or just render in a new Router instance (actually Testing Lib cleanup happens automatically? No, manual cleanup in Deno is safer or render in separate steps).
  },
});

Deno.test({
  name: "AppRoutes routing to ContentBrowser",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const MockRepositorySelector = () => <div>Repo Selector</div>;
    const MockContentBrowser = () => (
      <div data-testid="content-browser">Content Browser</div>
    );

    const { findByTestId, getByText } = render(
      <HeaderProvider>
        <MemoryRouter initialEntries={["/user/my-repo"]}>
          <AppRoutes
            RepositorySelectorComponent={MockRepositorySelector}
            ContentBrowserComponent={MockContentBrowser}
          />
        </MemoryRouter>
      </HeaderProvider>,
    );

    // Auth check is async, so we must wait
    const contentBrowser = await findByTestId("content-browser", {}, {
      timeout: 3000,
    });
    assertEquals(
      contentBrowser,
      getByText("Content Browser"),
    );
  },
});
