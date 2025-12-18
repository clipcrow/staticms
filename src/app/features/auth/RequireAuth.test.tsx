import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { RequireAuth } from "./RequireAuth.tsx";
import { useAuth } from "@/app/hooks/useAuth.ts";

Deno.test({
  name: "RequireAuth Container Logic",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const createMockAuthHook = (
      state: { isAuthenticated: boolean; loading: boolean },
      loginSpy: () => void = () => {},
    ) => {
      // Return a hook function
      return () =>
        ({
          ...state,
          login: loginSpy,
          username: "test",
        }) as ReturnType<typeof useAuth>;
    };

    await t.step("Shows loader when loading", () => {
      const mockHook = createMockAuthHook({
        isAuthenticated: false,
        loading: true,
      });
      const { getByText, queryByTestId } = render(
        <RequireAuth useAuthHook={mockHook}>
          <div data-testid="content">Protected Content</div>
        </RequireAuth>,
      );

      const loader = getByText("Loading...");
      if (!loader) throw new Error("Loader not found");
      // Content should not be visible
      const content = queryByTestId("content");
      if (content) throw new Error("Content should not be visible loading");
    });

    await t.step("Calls login when not authenticated and not loading", () => {
      const loginSpy = spy();
      const mockHook = createMockAuthHook(
        { isAuthenticated: false, loading: false },
        loginSpy,
      );

      const { queryByTestId } = render(
        <RequireAuth useAuthHook={mockHook}>
          <div data-testid="content">Protected Content</div>
        </RequireAuth>,
      );

      assertSpyCalls(loginSpy, 1);
      // Content should not be visible (return null)
      const content = queryByTestId("content");
      if (content) throw new Error("Content should not be visible when unauth");
    });

    await t.step("Renders children when authenticated", () => {
      const loginSpy = spy();
      const mockHook = createMockAuthHook(
        { isAuthenticated: true, loading: false },
        loginSpy,
      );

      const { getByTestId } = render(
        <RequireAuth useAuthHook={mockHook}>
          <div data-testid="content">Protected Content</div>
        </RequireAuth>,
      );

      assertSpyCalls(loginSpy, 0);
      getByTestId("content"); // Should throw if not found
    });
  },
});
