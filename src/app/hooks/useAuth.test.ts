import "@/testing/setup_dom.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";
import { act, renderHook, waitFor } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { useAuth } from "./useAuth.ts";
import { AuthServices } from "@/app/hooks/useAuthServices.ts";

Deno.test({
  name: "useAuth Hook Scenarios",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const createMockServices = (overrides?: Partial<AuthServices>) => {
      const services = {
        checkAuth: () =>
          Promise.resolve({
            ok: true,
            status: 200,
            user: { login: "testuser" },
          }),
        redirectToLogin: () => {},
        storage: {
          setItem: () => {},
          removeItem: () => {},
          getItem: (key: string) => key === "staticms_user" ? "testuser" : null,
        },
        ...overrides,
      } as AuthServices;
      return () => services;
    };

    await t.step("Check Auth Success (Logged In)", async () => {
      const setItemSpy = spy();
      // Cast to unknown first to avoid exact signature mismatch issues with Spy vs Function if any
      const mockStorage = {
        setItem: setItemSpy,
        removeItem: () => {},
        getItem: () => null,
      } as unknown as AuthServices["storage"];

      const mockServices = createMockServices({
        storage: mockStorage,
      });

      const { result } = renderHook(() => useAuth(mockServices));

      // Initial loading
      assert(result.current.loading);

      // Wait for async checkAuth
      await waitFor(() => assertFalse(result.current.loading));

      assert(result.current.isAuthenticated);
      assertEquals(result.current.username, "testuser");
      assertSpyCalls(setItemSpy, 1);
      assertEquals(setItemSpy.calls[0].args, ["staticms_user", "testuser"]);
    });

    await t.step("Check Auth Failed (401)", async () => {
      const removeItemSpy = spy();
      const mockStorage = {
        setItem: () => {},
        removeItem: removeItemSpy,
        getItem: () => "olduser",
      } as unknown as AuthServices["storage"];

      const mockServices = createMockServices({
        checkAuth: () => Promise.resolve({ ok: false, status: 401 }),
        storage: mockStorage,
      });

      const { result } = renderHook(() => useAuth(mockServices));

      await waitFor(() => assertFalse(result.current.loading));

      assertFalse(result.current.isAuthenticated);
      assertEquals(result.current.username, null);
      assertSpyCalls(removeItemSpy, 1);
      assertEquals(removeItemSpy.calls[0].args, ["staticms_user"]);
    });

    await t.step("Login Redirect", async () => {
      const redirectSpy = spy();
      const mockServices = createMockServices({
        redirectToLogin: redirectSpy,
      });

      const { result } = renderHook(() => useAuth(mockServices));

      // Wait for initial check (doesn't matter for this test but cleaner)
      await waitFor(() => assertFalse(result.current.loading));

      await act(() => {
        result.current.login("/return/path");
      });

      assertSpyCalls(redirectSpy, 1);
      assertEquals(redirectSpy.calls[0].args, ["/return/path", false]);
    });
  },
});
