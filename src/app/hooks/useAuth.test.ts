import "@/testing/setup_dom.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";
import { act, renderHook, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { useAuth } from "./useAuth.ts";

Deno.test({
  name: "useAuth Hook Scenarios",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    await t.step("Check Auth Success (Logged In)", async () => {
      localStorage.clear();
      const fetchStub = stub(globalThis, "fetch", () =>
        Promise.resolve(
          new Response(JSON.stringify({ login: "testuser" }), { status: 200 }),
        ));

      try {
        const { result } = renderHook(() => useAuth());

        // Initial loading
        assert(result.current.loading);

        // Wait for async checkAuth
        await waitFor(() => assertFalse(result.current.loading));

        assert(result.current.isAuthenticated);
        assertEquals(result.current.username, "testuser");
        assertEquals(localStorage.getItem("staticms_user"), "testuser");
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Check Auth Failed (401)", async () => {
      localStorage.clear();
      localStorage.setItem("staticms_user", "olduser");

      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(null, { status: 401 })),
      );

      try {
        const { result } = renderHook(() => useAuth());

        await waitFor(() => assertFalse(result.current.loading));

        assertFalse(result.current.isAuthenticated);
        assertEquals(result.current.username, null);
        // Should clear storage
        assertEquals(localStorage.getItem("staticms_user"), null);
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Login Redirect", async () => {
      // Reset location
      globalThis.history.replaceState(null, "", "http://localhost/");

      const fetchStub = stub(
        globalThis,
        "fetch",
        () =>
          Promise.resolve(new Response(JSON.stringify({}), { status: 200 })),
      );

      try {
        const { result } = renderHook(() => useAuth());

        await act(async () => {
          result.current.login("/return/path");
          await new Promise((r) => setTimeout(r, 20)); // wait for timeout inside hook
        });

        const url = new URL(globalThis.location.href);
        assert(url.pathname.includes("/api/auth/login"));
        assertEquals(url.searchParams.get("returnTo"), "/return/path");
      } finally {
        fetchStub.restore();
      }
    });
  },
});
