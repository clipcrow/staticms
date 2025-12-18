import "@/testing/setup_dom.ts";
import { assert, assertEquals } from "@std/assert";
import { renderHook } from "@testing-library/react";
import { assertSpyCalls, stub } from "@std/testing/mock";
import { useBranchServices } from "./useBranchServices.ts";

Deno.test({
  name: "useBranchServices Hook",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("getUnmergedCommits returns commits on success", async () => {
      const fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(
          new Response(JSON.stringify({ commits: [{ sha: "123" }] }), {
            status: 200,
          }),
        ));

      try {
        const { result } = renderHook(() => useBranchServices());
        const commits = await result.current.getUnmergedCommits(
          "o",
          "r",
          "b",
          "h",
        );

        assertEquals(commits.length, 1);
        assertEquals(commits[0].sha, "123");
        assertSpyCalls(fetchStub, 1);
        const url = fetchStub.calls[0].args[0] as string;
        assert(url.includes("/api/repo/o/r/compare?base=b&head=h"));
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("getUnmergedCommits returns empty on failure", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response("Err", { status: 500 })),
      );

      try {
        const { result } = renderHook(() => useBranchServices());
        const commits = await result.current.getUnmergedCommits(
          "o",
          "r",
          "b",
          "h",
        );
        assertEquals(commits, []);
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("checkBranchExists returns true if 200", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response("", { status: 200 })),
      );

      try {
        const { result } = renderHook(() => useBranchServices());
        const exists = await result.current.checkBranchExists("o", "r", "main");
        assertEquals(exists, true);
        assertSpyCalls(fetchStub, 1);
        assert(
          (fetchStub.calls[0].args[0] as string).endsWith("/branches/main"),
        );
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("createBranch posts data", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response("{}", { status: 200 })),
      );

      try {
        const { result } = renderHook(() => useBranchServices());
        await result.current.createBranch("o", "r", "feat");

        assertSpyCalls(fetchStub, 1);
        const req = fetchStub.calls[0];
        assertEquals(req.args[0], "/api/repo/o/r/branches");
        assertEquals(req.args[1]?.method, "POST");
        const body = JSON.parse(req.args[1]?.body as string);
        assertEquals(body.branchName, "feat");
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
        const { result } = renderHook(() => useBranchServices());
        await result.current.saveConfig("o", "r", {
          collections: [],
          branch: "main",
        });

        assertSpyCalls(fetchStub, 1);
        const req = fetchStub.calls[0];
        assertEquals(req.args[0], "/api/repo/o/r/config");
        assert((req.args[1]?.body as string).includes("branch: main"));
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("createPr posts data", async () => {
      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(
            new Response(JSON.stringify({ html_url: "url", number: 1 }), {
              status: 200,
            }),
          ),
      );

      try {
        const { result } = renderHook(() => useBranchServices());
        const pr = await result.current.createPr(
          "o",
          "r",
          "Title",
          "head",
          "base",
        );

        assertEquals(pr.number, 1);
        assertSpyCalls(fetchStub, 1);
        const body = JSON.parse(fetchStub.calls[0].args[1]?.body as string);
        assertEquals(body.title, "Title");
      } finally {
        fetchStub.restore();
      }
    });
  },
});
