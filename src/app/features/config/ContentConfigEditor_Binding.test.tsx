import "@/testing/setup_dom.ts";
import { render } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { ContentConfigEditor } from "./ContentConfigEditor.tsx";
import { Config } from "@/app/hooks/useContentConfig.ts";

Deno.test("ContentConfigEditor Container", async (t) => {
  const mockConfig: Config = {
    collections: [],
    branch: "main",
  };

  const noop = () => {};

  await t.step("Passes initial data to view", () => {
    // deno-lint-ignore no-explicit-any
    let capturedProps: any;
    // deno-lint-ignore no-explicit-any
    const MockView = (props: any) => {
      capturedProps = props;
      return null;
    };

    render(
      <ContentConfigEditor
        owner="test"
        repo="test-repo"
        config={mockConfig}
        mode="add"
        onCancel={noop}
        onSave={noop}
        ViewComponent={MockView}
      />,
    );

    assertEquals(capturedProps.repoInfo.owner, "test");
    assertEquals(capturedProps.mode, undefined); // ConfigForm doesn't take mode directly, but index
    assertEquals(capturedProps.editingIndex, null);
  });

  await t.step("Validates path and saves config on submit", async () => {
    // 1. Setup Spies
    const validatePathSpy = spy(
      (_o: string, _r: string, path: string) => {
        if (path === "existing") {
          return Promise.resolve({ exists: false, isDirectory: false }); // Simulate failure for specific path
        }
        return Promise.resolve({ exists: true, isDirectory: true });
      },
    );
    const saveConfigSpy = spy(async () => {});
    const onSaveSpy = spy();

    // 2. Mock Hook
    const mockApiHook = () => ({
      validatePath: validatePathSpy,
      saveConfig: saveConfigSpy,
    });

    // 3. Capture View Props
    // deno-lint-ignore no-explicit-any
    let capturedProps: any;
    // deno-lint-ignore no-explicit-any
    const MockView = (props: any) => {
      capturedProps = props;
      return null;
    };

    render(
      <ContentConfigEditor
        owner="test"
        repo="test-repo"
        config={mockConfig}
        mode="add"
        onCancel={noop}
        onSave={onSaveSpy}
        ViewComponent={MockView}
        useApiHook={mockApiHook}
      />,
    );

    // 4. Simulate Input (Update State via Props)
    // The View component calls setFormData. We can simulate this.
    const newData = {
      name: "test", // This gets overwritten by generator usually? No, sanitized uses formData.path as source
      label: "Test Content",
      path: "posts",
      type: "collection",
      fields: [],
    };

    // In strict Container Testing, if we want to test state updates,
    // we assume the View correctly calls setFormData.
    // ContentConfigEditor passes `setFormData` to View.
    // We call it manually, wrapping in act to ensure re-render updates the closure in onSave.
    // import { act } from "@testing-library/react"; // Need to add import
    await import("@testing-library/react").then(({ act }) => {
      act(() => {
        capturedProps.setFormData(newData);
      });
    });

    // 5. Trigger Save
    // We need to mock preventing default
    const mockEvent = { preventDefault: () => {} };
    await capturedProps.onSave(mockEvent);

    // 6. Assertions
    // Path validation should be called with "posts/index.md" (collection + directory logic check?)
    // Wait, "posts" type: "collection" -> directory bind?
    // Default binding is "file" in defaultCollection, but we set type="collection".
    // Let's check logic:
    // sanitizedCollection.binding default is "file".
    // validationPath logic in Editor:
    // if type=singleton && binding=directory -> add index.md
    // It does NOT add index.md for type=collection automatically here?
    //
    // Let's check ContentConfigEditor.tsx logic again.
    // Line 95: let validatePath = ...
    // Line 96: if (type === "singleton" && binding === "directory") ...

    // So for "collection", it validates "posts".

    // Validate arguments
    assertSpyCalls(validatePathSpy, 1);
    const validateArgs = validatePathSpy.calls[0].args;
    assertEquals(validateArgs[2], "posts");

    // Save should be called
    assertSpyCalls(saveConfigSpy, 1);

    // onSave callback should be called
    assertSpyCalls(onSaveSpy, 1);
  });
});
