import "@/testing/setup_dom.ts";
import { renderHook } from "@testing-library/react";
import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { useEventSource } from "./useEventSource.ts";

// Mock EventSource globally
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.readyState = 2; // CLOSED
  }
}

// Inject Mock
// deno-lint-ignore no-explicit-any
(globalThis as any).EventSource = MockEventSource;

Deno.test("useEventSource connects and receives messages", () => {
  const onEvent = spy();
  MockEventSource.instances = []; // Reset instances

  const { unmount } = renderHook(() => useEventSource("/api/events", onEvent));

  // 1. Verify Connection
  assertEquals(MockEventSource.instances.length, 1);
  const instance = MockEventSource.instances[0];
  assertEquals(instance.url, "/api/events");

  // 2. Simulate Message
  const data = { type: "test", payload: 123 };
  if (instance.onmessage) {
    instance.onmessage(
      new MessageEvent("message", {
        data: JSON.stringify(data),
      }),
    );
  }

  // 3. Verify Handler Call
  assertSpyCalls(onEvent, 1);
  assertEquals(onEvent.calls[0].args[0], data);

  // 4. Verify Cleanup
  unmount();
  assertEquals(instance.readyState, 2); // Closed
});
