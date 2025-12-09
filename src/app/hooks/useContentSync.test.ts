import "@/testing/setup_dom.ts";
import { assertSpyCall, spy, stub } from "@std/testing/mock";
import { renderHook, waitFor } from "@testing-library/react";
import { useContentSync } from "./useContentSync.ts";

Deno.test({
  name: "useContentSync",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async (t) => {
    const remoteContent = "---\ntitle: Remote\n---\nRemote Body";
    const remoteDraft = {
      frontMatter: { title: "Remote" },
      body: "Remote Body",
      pendingImages: [],
    };

    await t.step("Scenario: Initial Load (No Draft)", async () => {
      const setDraftSpy = spy();
      const showToastSpy = spy();
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(remoteContent)),
      );

      try {
        renderHook(() =>
          useContentSync({
            owner: "user",
            repo: "repo",
            filePath: "test.md",
            mode: "edit",
            loaded: true,
            draft: { frontMatter: {}, body: "", pendingImages: [] },
            fromStorage: false,
            setDraft: setDraftSpy,
            showToast: showToastSpy,
          })
        );

        await waitFor(() => {
          assertSpyCall(fetchStub, 0, {
            args: ["/api/repo/user/repo/contents/test.md"],
          });
        });

        // Should sync remote content
        await waitFor(() => {
          assertSpyCall(setDraftSpy, 0, {
            args: [remoteDraft, true, true],
          });
        });
      } finally {
        fetchStub.restore();
      }
    });

    await t.step("Scenario: Clean Sync (Draft matches Remote)", async () => {
      const setDraftSpy = spy();
      const showToastSpy = spy();
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => Promise.resolve(new Response(remoteContent)),
      );

      try {
        renderHook(() =>
          useContentSync({
            owner: "user",
            repo: "repo",
            filePath: "test.md",
            mode: "edit",
            loaded: true,
            // Draft matches remote exactly
            draft: remoteDraft,
            fromStorage: true,
            setDraft: setDraftSpy,
            showToast: showToastSpy,
          })
        );

        await waitFor(() => {
          assertSpyCall(fetchStub, 0);
        });

        // Should call setDraft with sync=true (Clearing storage)
        await waitFor(() => {
          // Args: val, loadedVal (undefined in hook call?), sync
          // In hook: setDraft(currentDraft, undefined, true)
          // Check 3rd arg is true
          assertSpyCall(setDraftSpy, 0, {
            args: [remoteDraft, true, true],
          });
        });
      } finally {
        fetchStub.restore();
      }
    });

    await t.step(
      "Scenario: Dirty Sync (Draft differs from Remote)",
      async () => {
        const setDraftSpy = spy();
        const showToastSpy = spy();
        const fetchStub = stub(
          globalThis,
          "fetch",
          () => Promise.resolve(new Response(remoteContent)),
        );

        const dirtyDraft = {
          ...remoteDraft,
          body: "My Local Changes",
        };

        try {
          renderHook(() =>
            useContentSync({
              owner: "user",
              repo: "repo",
              filePath: "test.md",
              mode: "edit",
              loaded: true,
              draft: dirtyDraft,
              fromStorage: true,
              setDraft: setDraftSpy,
              showToast: showToastSpy,
            })
          );

          await waitFor(() => {
            assertSpyCall(fetchStub, 0);
          });

          // Should call setDraft with sync=false
          await waitFor(() => {
            assertSpyCall(setDraftSpy, 0, {
              args: [dirtyDraft, true, false],
            });
          });
        } finally {
          fetchStub.restore();
        }
      },
    );

    await t.step("Scenario: Reload Triggered", async () => {
      const setDraftSpy = spy();
      const showToastSpy = spy();
      let callCount = 0;
      const fetchStub = stub(
        globalThis,
        "fetch",
        () => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(new Response(remoteContent)); // A
          }
          return Promise.resolve(
            new Response("---\ntitle: Updated\n---\nUpdated Body"),
          ); // B
        },
      );

      try {
        const { result } = renderHook(() =>
          useContentSync({
            owner: "user",
            repo: "repo",
            filePath: "test.md",
            mode: "edit",
            loaded: true,
            draft: remoteDraft, // Initially matches A
            fromStorage: true,
            setDraft: setDraftSpy,
            showToast: showToastSpy,
          })
        );

        // Wait for first fetch
        await waitFor(() => assertSpyCall(fetchStub, 0));

        // We expect setDraft to be called once for first sync
        await waitFor(() => assertSpyCall(setDraftSpy, 0));

        // Trigger Reload
        result.current.triggerReload();

        // Wait for second fetch
        await waitFor(() => assertSpyCall(fetchStub, 1));

        // Second fetch (B). Draft is still A.
        // A != B -> Sync=false.
        await waitFor(() => {
          // Assert setDraft called again (call index 1)
          assertSpyCall(setDraftSpy, 1, {
            args: [remoteDraft, true, false],
          });
        });
      } finally {
        fetchStub.restore();
      }
    });
  },
});
