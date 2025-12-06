import { spy } from "@std/testing/mock";

/**
 * Mocks global localStorage with an in-memory store and spies.
 * Returns the mock object and a reset function.
 */
export function setupLocalStorageMock() {
  const store: Record<string, string> = {};

  const mock = {
    getItem: spy((key: string) => store[key] || null),
    setItem: spy((key: string, value: string) => {
      store[key] = String(value);
    }),
    clear: spy(() => {
      for (const key in store) delete store[key];
    }),
    removeItem: spy((key: string) => {
      delete store[key];
    }),
    key: spy((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    writable: true,
  });

  const reset = () => {
    // Clear data
    for (const key in store) delete store[key];

    // Re-create spies to clear call history
    mock.getItem = spy((key: string) => store[key] || null);
    mock.setItem = spy((key: string, value: string) => {
      store[key] = String(value);
    });
    mock.clear = spy(() => {
      for (const key in store) delete store[key];
    });
    mock.removeItem = spy((key: string) => {
      delete store[key];
    });
    mock.key = spy((index: number) => Object.keys(store)[index] || null);
  };

  return { mock, store, reset };
}
