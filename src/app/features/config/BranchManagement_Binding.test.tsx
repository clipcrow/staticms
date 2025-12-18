import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { BranchManagement } from "./BranchManagement.tsx";
import { BranchServices } from "@/app/hooks/useBranchServices.ts";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import { useEventSource } from "@/app/hooks/useEventSource.ts";

Deno.test({
  name: "BranchManagement Container Logic",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const mockRepo = {
      default_branch: "main",
      id: 1,
      name: "test-repo",
      full_name: "test/test-repo",
    };

    const mockConfig = {
      collections: [],
      branch: "main",
    };

    // Mock Factories
    const createMockRepoHook = (repoVal = mockRepo) =>
      (() => ({ repository: repoVal, loading: false })) as typeof useRepository;

    const createMockEventSource = () =>
      ((): void => {}) as typeof useEventSource;

    const createMockServices = (overrides?: Partial<BranchServices>) => {
      const services = {
        getUnmergedCommits: () => Promise.resolve([]),
        checkBranchExists: () => Promise.resolve(true),
        createBranch: async () => {},
        saveConfig: async () => {},
        createPr: () => Promise.resolve({ html_url: "http://pr", number: 1 }),
        confirm: () => true,
        alert: () => {},
        open: () => {},
        ...overrides,
      } as BranchServices;
      return () => services;
    };

    await t.step(
      "Initializes with default branch and loads unmerged commits",
      async () => {
        // 1. Spies
        const getUnmergedSpy = spy(() =>
          Promise.resolve([
            {
              sha: "1",
              commit: {
                message: "fix",
                author: { name: "me", date: "now" },
              },
              html_url: "url",
            },
          ])
        );

        // 2. Mock Services
        const mockServices = createMockServices({
          getUnmergedCommits: getUnmergedSpy,
        });

        // 3. Capture View
        // deno-lint-ignore no-explicit-any
        let capturedProps: any;
        // deno-lint-ignore no-explicit-any
        const MockView = (props: any) => {
          capturedProps = props;
          return null;
        };

        // 4. Render
        render(
          <BranchManagement
            owner="owner"
            repo="repo"
            initialConfig={{ ...mockConfig, branch: "dev" }} // Different branch to trigger diff
            onCancel={() => {}}
            onSave={() => {}}
            useRepositoryHook={createMockRepoHook()}
            useEventSourceHook={createMockEventSource()}
            useServicesHook={mockServices}
            ViewComponent={MockView}
          />,
        );

        await new Promise((r) => setTimeout(r, 10));

        assertSpyCalls(getUnmergedSpy, 1);
        assertEquals(capturedProps.config.branch, "dev");
      },
    );

    await t.step("Handles Branch Creation Flow", async () => {
      const checkSpy = spy(() => Promise.resolve(false)); // Not exist
      const confirmSpy = spy(() => true); // User says yes
      const createBranchSpy = spy(() => Promise.resolve());
      const saveConfigSpy = spy(() => Promise.resolve());
      const alertSpy = spy(() => {});

      const mockServices = createMockServices({
        checkBranchExists: checkSpy,
        confirm: confirmSpy,
        createBranch: createBranchSpy,
        saveConfig: saveConfigSpy,
        alert: alertSpy,
      });

      // deno-lint-ignore no-explicit-any
      let capturedProps: any;
      // deno-lint-ignore no-explicit-any
      const MockView = (props: any) => {
        capturedProps = props;
        return null;
      };

      render(
        <BranchManagement
          owner="owner"
          repo="repo"
          initialConfig={{ ...mockConfig }}
          onCancel={() => {}}
          onSave={() => {}}
          useRepositoryHook={createMockRepoHook()}
          useEventSourceHook={createMockEventSource()}
          useServicesHook={mockServices}
          ViewComponent={MockView}
        />,
      );

      // Change branch
      await import("@testing-library/react").then(({ act }) => {
        act(() => {
          capturedProps.setConfig({
            ...capturedProps.config,
            branch: "new-feature",
          });
        });
      });

      // Save
      await import("@testing-library/react").then(({ act }) => {
        return act(async () => {
          await capturedProps.onSave({ preventDefault: () => {} });
        });
      });

      assertSpyCalls(checkSpy, 1);
      assertSpyCalls(confirmSpy, 1);
      assertSpyCalls(createBranchSpy, 1);
      // deno-lint-ignore no-explicit-any
      const createArgs = createBranchSpy.calls[0].args as any[];
      assertEquals(createArgs[2], "new-feature");

      assertSpyCalls(saveConfigSpy, 1);
      assertSpyCalls(alertSpy, 1);
    });

    await t.step("Creates PR", async () => {
      const createPrSpy = spy(() =>
        Promise.resolve({ html_url: "http://pr", number: 1 })
      );
      const openSpy = spy(() => {});

      const mockServices = createMockServices({
        createPr: createPrSpy,
        open: openSpy,
      });

      // deno-lint-ignore no-explicit-any
      let capturedProps: any;
      // deno-lint-ignore no-explicit-any
      const MockView = (props: any) => {
        capturedProps = props;
        return null;
      };

      render(
        <BranchManagement
          owner="owner"
          repo="repo"
          initialConfig={{ ...mockConfig, branch: "feature" }}
          onCancel={() => {}}
          onSave={() => {}}
          useRepositoryHook={createMockRepoHook()}
          useEventSourceHook={createMockEventSource()}
          useServicesHook={mockServices}
          ViewComponent={MockView}
        />,
      );

      // Set PR Title
      await import("@testing-library/react").then(({ act }) => {
        act(() => {
          capturedProps.onPrTitleChange("My PR");
        });
      });

      // Create PR
      await import("@testing-library/react").then(({ act }) => {
        return act(async () => {
          await capturedProps.onCreatePr();
        });
      });

      assertSpyCalls(createPrSpy, 1);
      // deno-lint-ignore no-explicit-any
      const prArgs = createPrSpy.calls[0].args as any[];
      assertEquals(prArgs[2], "My PR"); // title
      assertEquals(prArgs[3], "feature"); // head
      assertEquals(prArgs[4], "main"); // base

      assertSpyCalls(openSpy, 1);
    });
  },
});
