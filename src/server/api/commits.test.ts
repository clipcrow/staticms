import { assertEquals, assertExists } from "@std/assert";
import { testing } from "@oak/oak";
import { stub } from "@std/testing/mock";
import { batchCommitHandler } from "./commits.ts";
import { kv } from "@/server/auth.ts";

const SESSION_ID = "test-session-commits";
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

Deno.test("POST /api/repo/:owner/:repo/batch-commit creates commit without PR", async () => {
  await setupAuth();

  const mockSha = "mock-sha";
  const fetchStub = stub(globalThis, "fetch", (input, init) => {
    const url = input.toString();
    const _headers = init?.headers; // check token?

    // 1. getBranch
    if (url.includes("/git/ref/heads/") || url.includes("/git/refs/heads/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            object: { sha: mockSha },
          }),
          { status: 200 },
        ),
      );
    }
    // 2. createBlob
    if (url.endsWith("/git/blobs")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "blob-sha",
          }),
          { status: 201 },
        ),
      );
    }
    // 3. createTree
    if (url.endsWith("/git/trees")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "tree-sha",
          }),
          { status: 201 },
        ),
      );
    }
    // 4. createCommit
    if (url.endsWith("/git/commits")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "new-commit-sha",
            message: "test commit",
          }),
          { status: 201 },
        ),
      );
    }
    // 5. updateRef
    if (url.includes("/git/refs/heads/")) { // PATCH
      return Promise.resolve(
        new Response(
          JSON.stringify({
            object: { sha: "new-commit-sha" },
          }),
          { status: 200 },
        ),
      );
    }

    return Promise.resolve(new Response("Not Found", { status: 404 }));
  });

  try {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/batch-commit`,
      method: "POST",
      params: { owner: OWNER, repo: REPO },
    }) as unknown as Parameters<typeof batchCommitHandler>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    // Mock body
    // deno-lint-ignore no-explicit-any
    (ctx.request as any).body = {
      json: () =>
        Promise.resolve({
          message: "Test commit",
          updates: [{ path: "test.md", content: "hello" }],
          createPr: false,
        }),
    };

    await batchCommitHandler(ctx);

    if (ctx.response.status !== 200 && !ctx.response.body) {
      // console.log error?
    }

    // Oak defaults status to 200 when body is set
    assertEquals(ctx.response.status, 200);

    const body = ctx.response.body as {
      success: boolean;
      commit: { sha: string };
      pr?: unknown;
    };
    assertEquals(body.success, true);
    assertEquals(body.commit.sha, "new-commit-sha");
    assertEquals(body.pr, undefined);
  } finally {
    fetchStub.restore();
    await teardownAuth();
  }
});

Deno.test("POST /api/repo/:owner/:repo/batch-commit creates PR", async () => {
  await setupAuth();

  const mockSha = "base-sha";
  const fetchStub = stub(globalThis, "fetch", (input, init) => {
    const url = input.toString();
    const method = init?.method || "GET";

    // 1. getBranch (Base)
    if (method === "GET" && url.includes("/git/ref")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            object: { sha: mockSha },
          }),
          { status: 200 },
        ),
      );
    }

    // 1.5 createBranch (POST to refs)
    if (method === "POST" && url.endsWith("/git/refs")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            ref: "refs/heads/new-branch",
            object: { sha: mockSha },
          }),
          { status: 201 },
        ),
      );
    }

    // 2. createBlob
    if (url.endsWith("/git/blobs")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "blob-sha",
          }),
          { status: 201 },
        ),
      );
    }
    // 3. createTree
    if (url.endsWith("/git/trees")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "tree-sha",
          }),
          { status: 201 },
        ),
      );
    }
    // 4. createCommit
    if (url.endsWith("/git/commits")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            sha: "new-commit-sha",
          }),
          { status: 201 },
        ),
      );
    }
    // 5. updateRef
    if (method === "PATCH" && url.includes("/git/refs/heads/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            object: { sha: "new-commit-sha" },
          }),
          { status: 200 },
        ),
      );
    }
    // 6. createPullRequest
    if (url.endsWith("/pulls")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            number: 101,
            html_url: "http://github.com/pr/101",
            state: "open",
            user: { login: "test" },
            head: { ref: "new-branch" },
          }),
          { status: 201 },
        ),
      );
    }

    return Promise.resolve(new Response("Not Found " + url, { status: 404 }));
  });

  try {
    const ctx = testing.createMockContext({
      path: `/api/repo/${OWNER}/${REPO}/batch-commit`,
      method: "POST",
      params: { owner: OWNER, repo: REPO },
    }) as unknown as Parameters<typeof batchCommitHandler>[0];

    ctx.request.headers.set("Cookie", `session_id=${SESSION_ID}`);

    // Mock body
    // deno-lint-ignore no-explicit-any
    (ctx.request as any).body = {
      json: () =>
        Promise.resolve({
          message: "Test PR",
          updates: [{ path: "test.md", content: "hello" }],
          createPr: true,
          newBranchName: "feat/test",
        }),
    };

    await batchCommitHandler(ctx);

    const body = ctx.response.body as {
      success: boolean;
      pr: { number: number };
    };
    assertEquals(body.success, true);
    assertExists(body.pr);
    assertEquals(body.pr.number, 101);
  } finally {
    fetchStub.restore();
    await teardownAuth();
  }
});
