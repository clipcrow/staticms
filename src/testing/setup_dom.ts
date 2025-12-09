import { afterEach } from "@std/testing/bdd";
import { cleanup } from "@testing-library/react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Setup HappyDOM environment
GlobalRegistrator.register({
  url: "http://localhost/",
});

class MockEventSource {
  onmessage: ((event: MessageEvent) => void) | null = null;
  // deno-lint-ignore no-explicit-any
  constructor(_url: string, _eventSourceInitDict?: any) {}
  close() {}
  // deno-lint-ignore no-explicit-any
  addEventListener(_type: string, _listener: any) {}
  removeEventListener() {}
}
// deno-lint-ignore no-explicit-any
(globalThis as any).EventSource = MockEventSource;

// Cleanup after each test
afterEach(() => {
  cleanup();
});
