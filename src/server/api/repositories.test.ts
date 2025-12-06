import { assertEquals } from "@std/assert";
import { testing } from "@oak/oak";

import { listRepositories } from "./repositories.ts";

Deno.test("GET /api/repositories returns list", async () => {
  // Mock Context
  const ctx = testing.createMockContext({
    path: "/api/repositories",
    method: "GET",
  });

  await listRepositories(ctx);

  assertEquals(ctx.response.status, 200);
  assertEquals(ctx.response.type, "application/json");
  // Expect at least an array
  const body = ctx.response.body as unknown[];
  assertEquals(Array.isArray(body), true);
  // Ideally check for specific structure
});
