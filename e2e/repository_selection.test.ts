import { mockGitHubApi, TEST_BASE_URL, withPage } from "./setup.ts";
import { assert } from "@std/assert";
import { kv } from "@/server/auth.ts";

Deno.test("US-02: Repository Selection", async () => {
  // 1. Setup Auth (Seed KV)
  // Use the SAME kv instance as the server
  const sessionId = crypto.randomUUID();
  const fakeToken = "gho_fake_token_for_test";

  // Store session as per src/server/auth.ts structure
  await kv.set(["sessions", sessionId], fakeToken, {
    expireIn: 1000 * 60 * 60, // 1 hour
  });

  // 2. Setup Mock
  const apiMock = mockGitHubApi({
    "/user": () =>
      new Response(
        JSON.stringify({
          login: "test-user",
          avatar_url: "https://example.com/avatar.png",
        }),
      ),
    "/user/installations": () =>
      new Response(
        JSON.stringify({
          installations: [
            { id: 12345, account: { login: "test-org" } },
          ],
        }),
      ),
    "/user/installations/12345/repositories": () =>
      new Response(
        JSON.stringify({
          repositories: [
            {
              id: 101,
              name: "repo-1",
              full_name: "test-org/repo-1",
              private: true,
            },
            {
              id: 102,
              name: "repo-2",
              full_name: "test-org/repo-2",
              private: false,
            },
          ],
        }),
      ),
  });

  try {
    await withPage(async (page) => {
      // 3. Navigate with Test Session ID (Server sets cookie)
      await page.goto(`${TEST_BASE_URL}/api/test/login?id=${sessionId}`, {
        waitUntil: "networkidle2",
      });

      // 4. (No reload needed)

      // 5. Assertions
      const content = await page.content();

      assert(content.includes("repo-1"), "Should display 'repo-1'");
      assert(content.includes("repo-2"), "Should display 'repo-2'");
      assert(content.includes("test-org"), "Should display org name");
    });
  } finally {
    // Cleanup
    apiMock.restore();
    await kv.delete(["sessions", sessionId]);
    // Do not close kv as it is shared
  }
});
