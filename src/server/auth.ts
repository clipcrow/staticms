import { Context, Router } from "@oak/oak";
import { load } from "@std/dotenv";
import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";

// Load environment variables
await load({ export: true });

const GITHUB_CLIENT_ID = Deno.env.get("GITHUB_CLIENT_ID")?.trim();
const GITHUB_CLIENT_SECRET = Deno.env.get("GITHUB_CLIENT_SECRET")?.trim();

// Deno KV for session storage
const kv = await Deno.openKv();

export const authRouter = new Router();

// Helper: Session Management
async function createSession(accessToken: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  // Store session for 1 week
  await kv.set(["sessions", sessionId], accessToken, {
    expireIn: 60 * 60 * 24 * 7,
  });
  return sessionId;
}

export async function getSessionToken(ctx: Context): Promise<string | null> {
  const sessionId = await ctx.cookies.get("session_id");
  if (!sessionId) return null;
  const session = await kv.get(["sessions", sessionId]);
  return session.value as string | null;
}

// 1. Login Endpoint
authRouter.get("/api/auth/login", async (ctx) => {
  if (!GITHUB_CLIENT_ID) {
    ctx.throw(500, "GITHUB_CLIENT_ID not configured");
    return;
  }

  const returnTo = ctx.request.url.searchParams.get("returnTo");
  if (returnTo) {
    await ctx.cookies.set("auth_return_to", returnTo, {
      httpOnly: true,
      secure: false, // Set to true in prod
      sameSite: "lax",
      maxAge: 60 * 60, // 1 hour
    });
  }

  const redirectUrl = new URL("https://github.com/login/oauth/authorize");
  redirectUrl.searchParams.set("client_id", GITHUB_CLIENT_ID);
  redirectUrl.searchParams.set("scope", "repo,user,read:org");
  // State handling could be added here for CSRF protection

  ctx.response.redirect(redirectUrl.toString());
});

// 2. Callback Endpoint
authRouter.get("/api/auth/callback", async (ctx) => {
  const code = ctx.request.url.searchParams.get("code");
  if (!code) {
    ctx.throw(400, "Missing code");
    return;
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    ctx.throw(500, "GitHub OAuth not configured");
    return;
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      },
    );

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const accessToken = tokenData.access_token;

    // Verify token by fetching user
    const client = new GitHubUserClient(accessToken);
    const user = await client.getUser();
    console.log(`[Auth] Logged in as ${user.login}`);

    // Create Session
    const sessionId = await createSession(accessToken);
    await ctx.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: false, // Set to true in prod
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // Handle Return URL
    const returnTo = await ctx.cookies.get("auth_return_to") || "/";
    await ctx.cookies.delete("auth_return_to");

    ctx.response.redirect(returnTo);
  } catch (e) {
    console.error("[Auth] Callback Failed:", e);
    ctx.response.status = 500;
    ctx.response.body = "Authentication Failed";
  }
});

// 3. Current User Endpoint (for frontend check)
authRouter.get("/api/user", async (ctx) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);
    const user = await client.getUser();
    ctx.response.body = user;
  } catch (e) {
    if (e instanceof GitHubAPIError && e.status === 401) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Token expired or invalid" };
    } else {
      console.error(e);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal Server Error" };
    }
  }
});

// 4. Logout Endpoint
authRouter.get("/api/auth/logout", async (ctx) => {
  await ctx.cookies.delete("session_id");

  // Optionally remove from KV if you want strict logout,
  // but KV expiration handles it eventually.
  // Usually we just drop the cookie.

  ctx.response.redirect("/");
});
