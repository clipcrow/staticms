import type { MouseEvent } from "react";

/**
 * Creates a mock React MouseEvent with default values.
 * Allows overriding properties via the `overrides` argument.
 */
export const createMockEvent = (overrides: Partial<MouseEvent> = {}) => {
  return {
    button: 0,
    preventDefault: () => {},
    stopPropagation: () => {},
    ...overrides,
  } as unknown as MouseEvent;
};
