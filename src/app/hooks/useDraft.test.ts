import "@/testing/setup_dom.ts";
import { assert, assertEquals, assertFalse } from "@std/assert";
import { act, renderHook } from "@testing-library/react";
import { useDraft } from "./useDraft.ts";

const TEST_KEY = "test_draft_key";
// deno-lint-ignore no-explicit-any
const INITIAL_DATA: any = { title: "Init", body: "Body", frontMatter: {} };

Deno.test("useDraft Hook Scenarios", async (t) => {
  localStorage.clear();

  await t.step("Initial state (Clean)", () => {
    localStorage.clear();
    const { result } = renderHook(() => useDraft(TEST_KEY, INITIAL_DATA));

    assert(result.current.loaded);
    assertFalse(result.current.fromStorage);
    assert(result.current.isSynced);
    assertEquals(result.current.draft, INITIAL_DATA);
  });

  await t.step("Save draft (Dirty)", () => {
    localStorage.clear();
    const { result } = renderHook(() => useDraft(TEST_KEY, INITIAL_DATA));

    act(() => {
      result.current.setDraft({ ...INITIAL_DATA, body: "Changed" });
    });

    assertFalse(result.current.isSynced);
    assertEquals(result.current.draft.body, "Changed");

    // Check Storage
    const saved = JSON.parse(localStorage.getItem(TEST_KEY) || "{}");
    assertEquals(saved.body, "Changed");
    assertEquals(saved.isDirty, true);
  });

  await t.step("Restore from storage", () => {
    localStorage.clear();
    const stored = { ...INITIAL_DATA, body: "Stored", isDirty: true };
    localStorage.setItem(TEST_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useDraft(TEST_KEY, INITIAL_DATA));

    assert(result.current.fromStorage);
    assertEquals(result.current.draft.body, "Stored");
    assertFalse(result.current.isSynced);
  });

  await t.step("Clear Draft", () => {
    localStorage.clear();
    const stored = { ...INITIAL_DATA, body: "Stored", isDirty: true };
    localStorage.setItem(TEST_KEY, JSON.stringify(stored));

    const { result } = renderHook(() => useDraft(TEST_KEY, INITIAL_DATA));

    act(() => {
      result.current.clearDraft();
    });

    assertEquals(localStorage.getItem(TEST_KEY), null);
    assertEquals(result.current.draft, INITIAL_DATA);
    assert(result.current.isSynced);
  });

  await t.step("Sync (Clean Save)", () => {
    localStorage.clear();
    const { result } = renderHook(() => useDraft(TEST_KEY, INITIAL_DATA));

    // Simulate saving and becoming synced
    act(() => {
      result.current.setDraft(INITIAL_DATA, undefined, true);
    });

    assert(result.current.isSynced);
    // If no PR, it should remove item
    assertEquals(localStorage.getItem(TEST_KEY), null);
  });

  await t.step("Sync with PR (Keep PR Info)", () => {
    localStorage.clear();
    const prData = { ...INITIAL_DATA, pr: { number: 1 } };
    const { result } = renderHook(() => useDraft(TEST_KEY, prData));

    act(() => {
      // Set draft with PR, and sync=true (Clean)
      result.current.setDraft(prData, undefined, true);
    });

    assert(result.current.isSynced);
    // Should keep in storage with isDirty: false
    const saved = JSON.parse(localStorage.getItem(TEST_KEY) || "{}");
    assertEquals(saved.isDirty, false);
    assertEquals(saved.pr.number, 1);
  });
});
