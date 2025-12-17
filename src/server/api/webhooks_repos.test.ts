import { assertSpyCalls, spy } from "@std/testing/mock";
import { assertEquals } from "@std/assert";
import { webhookHandler } from "@/server/api/webhooks.ts";
import { ServerSentEventTarget, testing } from "@oak/oak";
import * as sse from "@/server/sse.ts";

Deno.test("webhookHandler", async (t) => {
  // NOTE: webhookHandler uses crypto.subtle which requires async.
  // If WEBHOOK_SECRET is not set, it returns true. Ensure env is clean or set empty.
  Deno.env.set("GITHUB_WEBHOOK_SECRET", "");

  // Mock SSE Client
  const dispatchMessageSpy = spy();
  const mockTarget = {
    dispatchMessage: dispatchMessageSpy,
    addEventListener: (
      _type: string,
      _listener: EventListenerOrEventListenerObject,
    ) => {},
    dispatchEvent: (_event: Event) => true,
    removeEventListener: (
      _type: string,
      _callback: EventListenerOrEventListenerObject | null,
    ) => {},
  } as unknown as ServerSentEventTarget;

  // Add the mock client to SSE
  sse.addClient(mockTarget);

  await t.step(
    "broadcasts repository_update on installation event",
    async () => {
      const ctx = testing.createMockContext({
        path: "/api/webhook",
        method: "POST",
        headers: [["x-github-event", "installation"]],
      });

      const payload = {
        action: "created",
        installation: { id: 123 },
      };

      // Mock request body
      // deno-lint-ignore no-explicit-any
      (ctx.request as any).body = {
        text: () => Promise.resolve(JSON.stringify(payload)),
      };

      // Cast as any to avoid complex Oak type matching in tests
      // deno-lint-ignore no-explicit-any
      await webhookHandler(ctx as any);

      assertEquals(ctx.response.status, 200);
      assertSpyCalls(dispatchMessageSpy, 1);

      const sentData = JSON.parse(
        dispatchMessageSpy.calls[0].args[0] as string,
      );
      assertEquals(sentData, {
        type: "repository_update",
        event: "installation",
        action: "created",
      });
    },
  );

  await t.step("broadcasts repository_update on repository event", async () => {
    const ctx = testing.createMockContext({
      path: "/api/webhook",
      method: "POST",
      headers: [["x-github-event", "repository"]],
    });

    const payload = {
      action: "created",
      repository: { name: "new-repo" },
    };

    // deno-lint-ignore no-explicit-any
    (ctx.request as any).body = {
      text: () => Promise.resolve(JSON.stringify(payload)),
    };

    // deno-lint-ignore no-explicit-any
    await webhookHandler(ctx as any);

    assertEquals(ctx.response.status, 200);
    // Should be called again (total 2 times)
    assertSpyCalls(dispatchMessageSpy, 2);

    const sentData = JSON.parse(dispatchMessageSpy.calls[1].args[0] as string);
    assertEquals(sentData, {
      type: "repository_update",
      event: "repository",
      action: "created",
    });
  });
});
