import "@/testing/setup_dom.ts";
import { assert, assertEquals } from "@std/assert";
import { renderHook, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { useRepositories } from "./useRepositories.ts";

// Mock EventSource globally
class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  close() {}
  // deno-lint-ignore no-explicit-any
  addEventListener(_type: string, _listener: any) {}
  removeEventListener() {}
}
// @ts-ignore: Mocking EventSource
globalThis.EventSource = MockEventSource;

Deno.test({
  name: "useRepositories Hook",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Loads repositories", async () => {
      // deno-lint-ignore no-explicit-any
      const mockRepos: any[] = [{
        id: 1,
        name: "repo1",
        full_name: "test/repo1",
        owner: { login: "u", avatar_url: "" },
      }];
      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockRepos), { status: 200 }),
          ),
      );

      try {
        const { result } = renderHook(() => useRepositories());
        assert(result.current.loading);

        await waitFor(() => assert(!result.current.loading));

        assertEquals(result.current.repos.length, 1);
        assertEquals(result.current.repos[0].name, "repo1");
        assertEquals(result.current.error, null);
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Handles error", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(null, { status: 500 })),
      );

      try {
        const { result } = renderHook(() => useRepositories());
        await waitFor(() => assert(!result.current.loading));

        assert(result.current.error?.includes("Failed to fetch"));
        assertEquals(result.current.repos, []);
      } finally {
        fetchStub.restore();
      }
    });
  },
});
