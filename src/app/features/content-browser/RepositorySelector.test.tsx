import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { RepositorySelector } from "./RepositorySelector.tsx";

Deno.test({
  name: "RepositorySelector fetches and displays repos",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    // Mock fetch
    const fetchStub = stub(
      globalThis,
      "fetch",
      // @ts-ignore: mock response
      () =>
        Promise.resolve(
          new Response(JSON.stringify([
            {
              id: 1,
              name: "my-repo",
              full_name: "user/my-repo",
              description: "desc1",
            },
            {
              id: 2,
              name: "other-repo",
              full_name: "user/other-repo",
              description: "desc2",
            },
          ])),
        ),
    );

    try {
      const { findByText, getAllByRole } = render(
        <MemoryRouter>
          <RepositorySelector />
        </MemoryRouter>,
      );

      // Wait for items to appear (this implicitly waits for loading to disappear)
      const firstItem = await findByText("user/my-repo");
      assertEquals(!!firstItem, true);

      const items = getAllByRole("listitem");
      assertEquals(items.length, 2);
    } finally {
      fetchStub.restore();
    }
  },
});
