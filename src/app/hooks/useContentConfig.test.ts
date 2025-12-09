import "@/testing/setup_dom.ts";
import { assert, assertEquals } from "@std/assert";
import { renderHook, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { useContentConfig } from "./useContentConfig.ts";

Deno.test({
  name: "useContentConfig Hook",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Loads and parses YAML config", async () => {
      const yamlConfig = `
collections:
  - name: posts
    label: Posts
    folder: content/posts`;

      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(yamlConfig, { status: 200 })),
      );

      try {
        const { result } = renderHook(() => useContentConfig("owner", "repo"));

        await waitFor(() => assert(!result.current.loading));

        assert(result.current.config);
        assertEquals(result.current.config?.collections[0].name, "posts");
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Handles fetch error", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(
            new Response(null, { status: 404, statusText: "Not Found" }),
          ),
      );
      try {
        const { result } = renderHook(() => useContentConfig("owner", "repo"));
        await waitFor(() => assert(!result.current.loading));

        assert(result.current.error);
        assert(result.current.error.message.includes("Failed to fetch"));
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Handles parsing error", async () => {
      const badYaml = `collections: [ unclosed: `;
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(badYaml, { status: 200 })),
      );
      try {
        const { result } = renderHook(() => useContentConfig("owner", "repo"));
        await waitFor(() => assert(!result.current.loading));

        assert(result.current.error);
        assert(result.current.error.message.includes("Failed to parse"));
      } finally {
        fetchStub.restore();
      }
    });
  },
});
