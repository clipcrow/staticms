import "@/testing/setup_dom.ts";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { stub } from "@std/testing/mock";
import { assertSpyCalls } from "@std/testing/mock";
import { assertEquals, assertExists } from "@std/assert";
import { ContentConfigEditor } from "./ContentConfigEditor.tsx";
import { Config } from "@/app/hooks/useContentConfig.ts";

const MOCK_CONFIG: Config = {
  collections: [
    {
      name: "existing-col",
      label: "Existing Collection",
      type: "collection",
      path: "content/existing",
      fields: [],
    },
  ],
};

Deno.test({
  name: "ContentConfigEditor: Renders form with initial data",
  fn: () => {
    const { getByDisplayValue } = render(
      <ContentConfigEditor
        owner="testuser"
        repo="testrepo"
        config={MOCK_CONFIG}
        initialData={MOCK_CONFIG.collections[0]}
        mode="edit"
        onCancel={() => {}}
        onSave={() => {}}
      />,
    );

    assertExists(getByDisplayValue("Existing Collection"));
    assertExists(getByDisplayValue("content/existing"));
    cleanup();
  },
});

Deno.test({
  name: "ContentConfigEditor: Saves new configuration via API",
  fn: async () => {
    const fetchStub = stub(
      globalThis,
      "fetch",
      () => Promise.resolve(new Response(null, { status: 200 })),
    );

    const onSaveSpy = stub({ onSave: () => {} }, "onSave");

    try {
      const { getByText, getByPlaceholderText } = render(
        <ContentConfigEditor
          owner="testuser"
          repo="testrepo"
          config={MOCK_CONFIG}
          mode="add"
          onCancel={() => {}}
          onSave={onSaveSpy}
        />,
      );

      // Fill form (Using simple selectors assuming labels)
      // Note: Actual implementation uses ContentSettings which is complex.
      // We might need to rely on placeholder or name attributes if labels aren't clear.
      // Based on ContentSettings implementation (v1), it renders Semantic UI form.

      // Let's assume we can find inputs by label or structure.
      // If ContentSettings is a "black box" here, we should check what it renders.
      // But typically we can find by label "Label" and "Path".

      // For now, let's look for inputs.
      // Since ContentSettings might be complex, let's verify if we can interact.

      // Simulating user input for a new collection
      // Type is default singleton.

      // Label input
      const labelInput = getByPlaceholderText(
        "e.g. Blog Post",
      ) as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: "New Col" } });

      // Path input
      // Binding default is file, so placeholder is "content/about.md"
      const pathInput = getByPlaceholderText(
        "content/about.md",
      ) as HTMLInputElement;
      fireEvent.change(pathInput, { target: { value: "content/new.md" } });

      // Wait for React state update to reflect in DOM (re-render)
      await waitFor(() => {
        assertEquals(pathInput.value, "content/new.md");
      });

      // Save button (Button text is "Add" when editingIndex/mode is null/"add")
      const saveBtn = getByText("Add");
      fireEvent.click(saveBtn);

      await waitFor(() => {
        assertSpyCalls(onSaveSpy, 1);
      });

      // Verify fetch call payload
      const call = fetchStub.calls[0];
      assertEquals(call.args[0], "/api/repo/testuser/testrepo/config");
      const body = await new Response(call.args[1]?.body as BodyInit).text();

      // Body should contain the new collection in YAML
      assertEquals(body.includes("name: content-new-md"), true); // Generated ID
      assertEquals(body.includes("label: New Col"), true);
    } finally {
      fetchStub.restore();
      cleanup();
    }
  },
});
