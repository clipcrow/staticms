import { useEffect, useRef } from "react";

// deno-lint-ignore no-explicit-any
type EventHandler = (data: any) => void;

/**
 * A hook to subscribe to Server-Sent Events.
 * It handles connection management and message parsing.
 * The handler callback is ref-stable, so it won't cause reconnections on re-renders.
 */
export function useEventSource(url: string, onEvent: EventHandler) {
  const onEventRef = useRef(onEvent);

  // Keep the latest callback in a ref
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Call the latest handler
        if (onEventRef.current) {
          onEventRef.current(data);
        }
      } catch (e) {
        console.error("Failed to parse SSE message", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      // Optional: Add recovery logic or expose error state
    };

    // Cleanup on unmount or URL change
    return () => {
      eventSource.close();
    };
  }, [url]);
}
