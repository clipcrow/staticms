import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { ArticleList } from "./ArticleList.tsx";
import { ArticleListServices } from "@/app/hooks/useArticleListServices.ts";
import { FileItem } from "@/shared/types.ts";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GitHubFile, useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useRepository } from "@/app/hooks/useRepositories.ts";
import { HeaderProvider } from "@/app/contexts/HeaderContext.tsx";

Deno.test({
  name: "ArticleList Container Logic",
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
      collections: [
        {
          name: "posts",
          path: "content/posts",
          type: "collection",
          binding: "file",
        },
      ],
      branch: "main",
    };

    // Mock Hooks Factories - Cast to specific hook types to satisfy strict checks
    const createMockRepoHook = () =>
      (() => ({
        repository: mockRepo,
        loading: false,
      })) as typeof useRepository;

    const createMockConfigHook = (configVal = mockConfig) =>
      (() => ({
        config: configVal,
        loading: false,
        error: null,
      })) as typeof useContentConfig;

    const createMockContentHook = (files: GitHubFile[] = []) =>
      (() => ({
        files: files,
        loading: false,
        error: null,
      })) as typeof useRepoContent;

    const createMockServices = (overrides?: Partial<ArticleListServices>) => {
      const services = {
        getDrafts: () => [],
        createDraft: () => {},
        deleteFile: async () => {},
        reloadPage: () => {},
        getCurrentUser: () => "user",
        ...overrides,
      } as ArticleListServices;
      return () => services;
    };

    await t.step("Loads data and renders view with correct props", () => {
      // 1. Spies
      const getDraftsSpy = spy(() => []);

      // 2. Mock Hooks
      const mockServices = createMockServices({ getDrafts: getDraftsSpy });
      const mockContentHook = createMockContentHook([
        {
          name: "hello.md",
          path: "content/posts/hello.md",
          type: "file",
          sha: "abc",
          size: 100,
        },
      ] as unknown as GitHubFile[]);

      // 3. Capture View
      // deno-lint-ignore no-explicit-any
      let capturedProps: any;
      // deno-lint-ignore no-explicit-any
      const MockView = (props: any) => {
        capturedProps = props;
        return null;
      };

      render(
        <HeaderProvider>
          <MemoryRouter initialEntries={["/owner/repo/posts"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:content"
                element={
                  <ArticleList
                    useRepositoryHook={createMockRepoHook()}
                    useContentConfigHook={createMockConfigHook()}
                    useRepoContentHook={mockContentHook}
                    useServicesHook={mockServices}
                    ViewComponent={MockView}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </HeaderProvider>,
      );

      // 4. Assertions
      // Drafts should be scanned
      assertSpyCalls(getDraftsSpy, 1);

      // Check View Props
      assertEquals(capturedProps.owner, "owner");
      assertEquals(capturedProps.repo, "repo");
      assertEquals(capturedProps.collectionName, "posts");
      assertEquals(capturedProps.files.length, 1);
      assertEquals(capturedProps.files[0].name, "hello.md");
    });

    await t.step("Combines drafts and filtered files", () => {
      // 1. Mock Data
      const remoteFiles = [
        { name: "remote.md", path: "remote.md", type: "file", sha: "r1" },
      ];
      const draftFiles = [
        { name: "draft.md", path: "draft.md", type: "file", sha: "draft" },
      ];

      // 2. Mock Services
      const mockServices = createMockServices({
        getDrafts: () => draftFiles as FileItem[],
      });
      const mockContentHook = createMockContentHook(
        remoteFiles as unknown as GitHubFile[],
      );

      // 3. Capture View
      // deno-lint-ignore no-explicit-any
      let capturedProps: any;
      // deno-lint-ignore no-explicit-any
      const MockView = (props: any) => {
        capturedProps = props;
        return null;
      };

      render(
        <HeaderProvider>
          <MemoryRouter initialEntries={["/owner/repo/posts"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:content"
                element={
                  <ArticleList
                    useRepositoryHook={createMockRepoHook()}
                    useContentConfigHook={createMockConfigHook()}
                    useRepoContentHook={mockContentHook}
                    useServicesHook={mockServices}
                    ViewComponent={MockView}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </HeaderProvider>,
      );

      // 4. Assertions
      // Should have 2 files (remote + draft)
      assertEquals(capturedProps.files.length, 2);
      assertEquals(
        capturedProps.files.some((f: FileItem) => f.name === "draft.md"),
        true,
      );
      assertEquals(
        capturedProps.files.some((f: FileItem) => f.name === "remote.md"),
        true,
      );
    });

    await t.step("Deletes file via service", async () => {
      // 1. Spies
      const deleteFileSpy = spy(async () => {});
      const reloadPageSpy = spy(() => {});

      const mockServices = createMockServices({
        deleteFile: deleteFileSpy,
        reloadPage: reloadPageSpy,
      });

      // 2. Capture View
      // deno-lint-ignore no-explicit-any
      let capturedProps: any;
      // deno-lint-ignore no-explicit-any
      const MockView = (props: any) => {
        capturedProps = props;
        return null;
      };

      // Need async act? ViewComponent render is sync but effects run.
      // Render
      render(
        <HeaderProvider>
          <MemoryRouter initialEntries={["/owner/repo/posts"]}>
            <Routes>
              <Route
                path="/:owner/:repo/:content"
                element={
                  <ArticleList
                    useRepositoryHook={createMockRepoHook()}
                    useContentConfigHook={createMockConfigHook()}
                    useRepoContentHook={createMockContentHook([])}
                    useServicesHook={mockServices}
                    ViewComponent={MockView}
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </HeaderProvider>,
      );

      // 3. Trigger Delete Flow
      // First request delete (sets state)
      const target = {
        name: "del.md",
        path: "del.md",
        sha: "SHA",
        type: "file",
      };

      // Update state
      await import("@testing-library/react").then(({ act }) => {
        act(() => {
          capturedProps.onDeleteRequest(target);
        });
      });

      // Confirm delete
      await import("@testing-library/react").then(({ act }) => {
        // onDeleteConfirm is async
        return act(async () => {
          await capturedProps.onDeleteConfirm();
        });
      });

      // 4. Assertions
      assertSpyCalls(deleteFileSpy, 1);
      // deno-lint-ignore no-explicit-any
      const deleteArgs = deleteFileSpy.calls[0].args as any[];
      assertEquals(deleteArgs[2], "del.md"); // path
      assertEquals(deleteArgs[3], "SHA"); // sha

      assertSpyCalls(reloadPageSpy, 1);
    });
  },
});
