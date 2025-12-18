import "@/testing/setup_dom.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { renderHook } from "@testing-library/react";
import { assertSpyCalls, stub } from "@std/testing/mock";
import { useContentConfigApi } from "./useContentConfigApi.ts";

Deno.test({
  name: "useContentConfigApi Hook",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("validatePath returns check result", async () => {
      const fetchStub = stub(globalThis, "fetch", (input) => {
        const url = input.toString();
        if (url.endsWith("exists")) {
          return Promise.resolve(
            new Response("[]", {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          );
        }
        if (url.endsWith("missing")) {
          return Promise.resolve(new Response("Not Found", { status: 404 }));
        }
        return Promise.resolve(new Response("Err", { status: 500 }));
      });

      try {
        const { result } = renderHook(() => useContentConfigApi());

        // Exist (Directory)
        const res1 = await result.current.validatePath("o", "r", "exists");
        assertEquals(res1.exists, true);
        assertEquals(res1.isDirectory, true);

        // Not Exist
        const res2 = await result.current.validatePath("o", "r", "missing");
        assertEquals(res2.exists, false);

        // Error
        await assertRejects(() =>
          result.current.validatePath("o", "r", "error")
        );
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("saveConfig posts yaml", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response("{}", { status: 200 })),
      );

      try {
        const { result } = renderHook(() => useContentConfigApi());
        await result.current.saveConfig("o", "r", { collections: [] });

        assertSpyCalls(fetchStub, 1);
        const req = fetchStub.calls[0];
        assertEquals(req.args[0], "/api/repo/o/r/config");
        assertEquals(req.args[1]?.method, "POST");
        assert((req.args[1]?.body as string).includes("collections: []"));
      } finally {
        fetchStub.restore();
      }
    });
  },
});
