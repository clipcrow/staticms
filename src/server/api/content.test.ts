import { assertEquals } from "@std/assert";
import { testing } from "@oak/oak";
import { stub } from "@std/testing/mock";
import { encodeBase64 } from "@std/encoding/base64";
import { deleteContent, getContent } from "./content.ts";
import { kv } from "@/server/auth.ts";

const SESSION_ID = "test-session-content";
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
}

Deno.test("GET /api/repo/:owner/:repo/contents/* returns file content", async () => {
  await setupAuth();

  const content = "Hello World";
  const encoded = encodeBase64(content);

  const mainStub = stub(globalThis, "fetch", () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          type: "file",
          encoding: "base64",
          size: content.length,
          name: "test.md",
          path: "content/test.md",
          content: encoded,
          sha: "test-sha",
        }),
        { status: 200 },
      ),
    );
  });

  try {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/contents/content/test.md`,
      method: "GET",
      params: { owner: OWNER, repo: REPO, 0: "content/test.md" },
    }) as unknown as Parameters<typeof getContent>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    await getContent(ctx);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.type, "text/markdown");
    assertEquals(ctx.response.body, content);
  } finally {
    mainStub.restore();
    await teardownAuth();
  }
});

Deno.test("GET /api/repo/:owner/:repo/contents/* returns directory listing", async () => {
  await setupAuth();

  const mainStub = stub(globalThis, "fetch", () => {
    return Promise.resolve(
      new Response(
        JSON.stringify([
          {
            type: "file",
            name: "post1.md",
            path: "content/posts/post1.md",
            sha: "sha1",
            size: 100,
          },
          {
            type: "dir",
            name: "sub",
            path: "content/posts/sub",
            sha: "sha2",
            size: 0,
          },
        ]),
        { status: 200 },
      ),
    );
  });

  try {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/contents/content/posts`,
      method: "GET",
      params: { owner: OWNER, repo: REPO, 0: "content/posts" },
    }) as unknown as Parameters<typeof getContent>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    await getContent(ctx);

    assertEquals(ctx.response.status, 200);
    assertEquals(ctx.response.type, "application/json");
    const body = ctx.response.body as Record<string, unknown>[];
    assertEquals(body.length, 2);
    assertEquals(body[0].name, "post1.md");
    assertEquals(body[1].type, "dir");
  } finally {
    mainStub.restore();
    await teardownAuth();
  }
});

Deno.test("DELETE /api/repo/:owner/:repo/contents/* deletes file", async () => {
  await setupAuth();

  const mainStub = stub(globalThis, "fetch", () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({ content: null, commit: { sha: "new-sha" } }),
        { status: 200 },
      ),
    );
  });

  try {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/contents/content/old.md`,
      method: "DELETE",
      params: { owner: OWNER, repo: REPO, 0: "content/old.md" },
    }) as unknown as Parameters<typeof deleteContent>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    // Mock body
    // deno-lint-ignore no-explicit-any
    (ctx.request as any).body = {
      json: () =>
        Promise.resolve({
          sha: "old-sha",
          message: "Delete old post",
          branch: "main",
        }),
    };

    await deleteContent(ctx);

    assertEquals(ctx.response.status, 200);
    assertEquals((ctx.response.body as { success: boolean }).success, true);
  } finally {
    mainStub.restore();
    await teardownAuth();
  }
});
