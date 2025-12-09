import "@/testing/setup_dom.ts";
import { render, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { RequireAuth } from "./RequireAuth.tsx";

Deno.test({
  name: "RequireAuth",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Renders children when authenticated", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ login: "user" }), { status: 200 }),
          ),
      );

      try {
        const { findByText } = render(
          <RequireAuth>
            <div data-testid="child">Protected Content</div>
          </RequireAuth>,
        );

        await findByText("Protected Content");
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Redirects to login when not authenticated", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(null, { status: 401 })),
      );

      const originalHref = globalThis.location.href;

      try {
        render(
          <RequireAuth>
            <div>Protected</div>
          </RequireAuth>,
        );

        // Should verify redirect
        await waitFor(() => {
          const href = globalThis.location.href;
          assertEquals(
            href.includes("/api/auth/login"),
            true,
            `Expected login url, got ${href}`,
          );
        });
      } finally {
        fetchStub.restore();
        // Reset href
        globalThis.location.href = originalHref;
      }
    });

    await t.step("Shows loading state initially", async () => {
      // Create a controlled promise to simulate loading delay
      let resolveFetch: (val: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });

      const fetchStub = stub(
        globalThis,
        "fetch",
        () => fetchPromise,
      );

      try {
        const { getByText, findByText } = render(
          <RequireAuth>
            <div>Protected</div>
          </RequireAuth>,
        );

        // Initial render should show loading
        getByText("Loading...");

        // Resolve fetch
        resolveFetch!(
          new Response(JSON.stringify({ login: "user" }), { status: 200 }),
        );

        // Should eventually show content
        await findByText("Protected");
      } finally {
        fetchStub.restore();
      }
    });
  },
});
