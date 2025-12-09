import { assertEquals, assertStringIncludes } from "@std/assert";
import { testing } from "@oak/oak";
import { stub } from "@std/testing/mock";
import { getRepoConfig, saveRepoConfig } from "./config.ts";
import { kv } from "@/server/auth.ts";

const SESSION_ID = "test-session-config";
const TOKEN = "mock-token";
const OWNER = "testuser";
const REPO = "testrepo";

// Helper to setup auth
async function setupAuth() {
  await kv.set(["sessions", SESSION_ID], TOKEN);
}

// Helper to teardown auth
async function teardownAuth() {
  await kv.delete(["sessions", SESSION_ID]);
  await kv.delete(["config", OWNER, REPO]);
}

Deno.test({
  name:
    "GET /api/repo/:owner/:repo/config returns unauthorized without session",
  fn: async () => {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/config`,
      method: "GET",
      params: { owner: OWNER, repo: REPO },
    }) as unknown as Parameters<typeof getRepoConfig>[0];

    await getRepoConfig(ctx);

    assertEquals(ctx.response.status, 401);
  },
});

Deno.test({
  name:
    "GET /api/repo/:owner/:repo/config returns default config when KV is empty",
  fn: async () => {
    await setupAuth();

    // Ensure KV is empty
    await kv.delete(["config", OWNER, REPO]);

    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/config`,
      method: "GET",
      params: { owner: OWNER, repo: REPO },
    }) as unknown as Parameters<typeof getRepoConfig>[0];

    // inject session cookie
    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    await getRepoConfig(ctx);

    await teardownAuth();

    assertEquals(ctx.response.status, 200); // 200 OK (default config doesn't set status explicitly, defaults to 200)
    assertStringIncludes(ctx.response.body as string, "Staticms Configuration");
    assertEquals(ctx.response.type, "text/yaml");
  },
});

Deno.test({
  name: "POST /api/repo/:owner/:repo/config saves config to KV",
  fn: async () => {
    await setupAuth();
    const configYaml = "collections:\n  - name: test\n    branch: main";

    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/config`,
      method: "POST",
      params: { owner: OWNER, repo: REPO },
      // Oak mock context body handling needs explicit setup usually,
      // but assuming we can mock request.body if needed.
    }) as unknown as Parameters<typeof saveRepoConfig>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    // Mock request.body.text()
    // deno-lint-ignore no-explicit-any
    (ctx.request as any).body = {
      text: () => Promise.resolve(configYaml),
      type: "text",
      value: configYaml,
    };

    // Mock GitHub API to avoid branch creation errors
    const fetchStub = stub(
      globalThis,
      "fetch",
      () => Promise.resolve(new Response("{}", { status: 200 })),
    );

    try {
      await saveRepoConfig(ctx);

      assertEquals(ctx.response.body, {
        message: "Configuration saved successfully (KV)",
      });

      // Verify KV
      const saved = await kv.get(["config", OWNER, REPO]);
      assertEquals(saved.value, configYaml);
    } finally {
      fetchStub.restore();
      await teardownAuth();
    }
  },
});
