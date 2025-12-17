import { RouterContext } from "@oak/oak";
import { broadcastMessage } from "@/server/sse.ts";

async function verifySignature(
  headers: Headers,
  bodyText: string,
): Promise<boolean> {
  const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
  if (!secret) return true; // Skip verification if no secret (Dev mode?)

  const signature = headers.get("x-hub-signature-256");
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = Uint8Array.from(
    (signature.split("=")[1] || "").match(/.{1,2}/g)?.map((byte) =>
      parseInt(byte, 16)
    ) || [],
  );

  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(bodyText),
  );

  return verified;
}

export const webhookHandler = async (ctx: RouterContext<string>) => {
  try {
    const bodyText = await ctx.request.body.text();

    if (!(await verifySignature(ctx.request.headers, bodyText))) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid signature" };
      return;
    }

    const eventType = ctx.request.headers.get("x-github-event");
    const payload = JSON.parse(bodyText);

    if (eventType === "pull_request") {
      const { action, pull_request } = payload;
      const prNumber = pull_request.number;
      const merged = pull_request.merged;

      console.log(`Webhook received: PR #${prNumber} ${action}`);

      let status = "open";
      if (action === "closed") {
        status = merged ? "merged" : "closed";
      } else if (action === "reopened") {
        status = "open";
      }

      broadcastMessage({
        type: "pr_update",
        prNumber,
        status,
      });
    } else if (
      eventType === "installation" ||
      eventType === "installation_repositories" ||
      eventType === "repository"
    ) {
      const { action } = payload;
      console.log(`Webhook received: ${eventType} ${action}`);

      // Broadcast generic repository update to trigger refresh
      broadcastMessage({
        type: "repository_update",
        event: eventType,
        action,
      });
    }

    ctx.response.status = 200;
    ctx.response.body = { received: true };
  } catch (e) {
    console.error("Webhook processing failed:", e);
    ctx.response.status = 500;
  }
};
