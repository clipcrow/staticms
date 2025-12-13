import "@/testing/setup_dom.ts";
import { assert, assertEquals } from "@std/assert";
import { renderHook, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { useRepoContent } from "./useRepoContent.ts";

Deno.test({
  name: "useRepoContent Hook",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Loads content", async () => {
      // deno-lint-ignore no-explicit-any
      const mockFiles: any[] = [{ name: "foo.md", type: "file" }];
      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(
            new Response(JSON.stringify(mockFiles), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          ),
      );
      try {
        const { result } = renderHook(() => useRepoContent("o", "r", "p"));
        await waitFor(() => assert(!result.current.loading));

        assertEquals(result.current.files.length, 1);
        assertEquals(result.current.files[0].name, "foo.md");
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Skips if params missing", () => {
      const fetchSpy = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response("[]")),
      );
      try {
        const { result } = renderHook(() =>
          useRepoContent("o", "r" /* missing path */)
        );
        // Should not load
        assert(!result.current.loading);
        assertEquals(result.current.files, []);
        // fetch not called
        assertEquals(fetchSpy.calls.length, 0);
      } finally {
        fetchSpy.restore();
      }
    });
  },
});
