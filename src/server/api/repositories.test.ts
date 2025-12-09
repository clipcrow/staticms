import { assertEquals } from "@std/assert";
import { testing } from "@oak/oak";
import { stub } from "@std/testing/mock";
import { listRepositories } from "./repositories.ts";
import { kv } from "@/server/auth.ts";

Deno.test("GET /api/repositories returns list", async () => {
  const mainStub = stub(globalThis, "fetch", () => {
    // Mock both installations and repositories calls with a merged response
    return Promise.resolve(
      new Response(
        JSON.stringify({
          installations: [{ id: 123 }],
          repositories: [{
            id: 1,
            name: "repo",
            full_name: "test/repo",
            owner: { login: "test", avatar_url: "" },
          }],
        }),
        { status: 200 },
      ),
    );
  });

  const sessionId = "test-session-id";
  await kv.set(["sessions", sessionId], "mock-github-token");

  try {
    const ctx = testing.createMockContext({
      path: "/api/repositories",
      method: "GET",
    });

    // Set cookie via headers
    ctx.request.headers.set("Cookie", `session_id=${sessionId}`);

    await listRepositories(ctx);

    if (ctx.response.status !== 200) {
      console.log("Response Body:", ctx.response.body);
    }
    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.type, "application/json");

    const body = ctx.response.body as unknown[];
    assertEquals(Array.isArray(body), true);
    // deno-lint-ignore no-explicit-any
    assertEquals((body as any[])[0].name, "repo");
  } finally {
    mainStub.restore();
    await kv.delete(["sessions", sessionId]);
  }
});
