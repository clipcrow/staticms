import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { assertEquals } from "@std/assert";
import { RepositorySelector } from "./RepositorySelector.tsx";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

Deno.test({
  name: "RepositorySelector fetches and displays repos",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { findByText, container } = render(
      <HeaderProvider>
        <MemoryRouter>
          <RepositorySelector />
        </MemoryRouter>
      </HeaderProvider>,
    );

    // Wait for items to appear (this implicitly waits for loading to disappear)
    const repoName = await findByText("my-repo", { exact: false });
    assertEquals(!!repoName, true);

    const items = container.querySelectorAll(".card");
    assertEquals(items.length, 2);
    // unmount(); // Let cleanup handle it
  },
});
