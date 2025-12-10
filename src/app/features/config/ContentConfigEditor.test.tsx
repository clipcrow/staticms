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

    // Stub window.alert to prevent blocking/error during tests
    const alertStub = stub(globalThis, "alert", () => {});
    const onSaveSpy = stub({ onSave: () => {} }, "onSave");

    try {
      const onCancelSpy = stub({ onCancel: () => {} }, "onCancel");

      const { getByText } = render(
        <ContentConfigEditor
          owner="testuser"
          repo="testrepo"
          config={MOCK_CONFIG}
          mode="add"
          onCancel={onCancelSpy}
          onSave={onSaveSpy}
          // Inject valid initial data to bypass testing-library event issues in Deno
          initialData={{
            name: "", // Will be generated
            label: "New Col",
            path: "content/new.md",
            type: "singleton",
            binding: "file",
            fields: [],
            archetype: "",
          }}
        />,
      );

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
      alertStub.restore();
      cleanup();
    }
  },
});
