import { RouterContext } from "@oak/oak";
import { getSessionToken } from "@/server/auth.ts";
import { GitHubAPIError, GitHubUserClient } from "@/server/github.ts";
import { decodeBase64 } from "@std/encoding/base64";

export const getContent = async (
  ctx: RouterContext<string>,
) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  // params will be { owner: "...", repo: "...", 0: "path/to/file" }
  const { owner, repo } = ctx.params;
  const path = ctx.params[0] || ctx.params.path || "";

  if (!owner || !repo) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing owner or repo" };
    return;
  }

  try {
    const client = new GitHubUserClient(token);

    // deno-lint-ignore no-explicit-any
    const data: any = await client.getContent(owner, repo, path);

    if (Array.isArray(data)) {
      // Directory
      // deno-lint-ignore no-explicit-any
      ctx.response.body = data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
        size: item.size,
      }));
      ctx.response.type = "application/json";
    } else {
      // File
      const binary = decodeBase64(data.content.replace(/\n/g, ""));

      // Simple MIME type detection
      const ext = data.name.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "svg": "image/svg+xml",
        "webp": "image/webp",
        "json": "application/json",
        "md": "text/markdown",
        "yml": "text/yaml",
        "yaml": "text/yaml",
      };

      const contentType = mimeTypes[ext] || "text/plain";
      ctx.response.type = contentType;

      // Return text for text-based formats to ensure proper encoding handling in client if needed,
      // though fetching binary blob is also fine. But client usually expects text for Markdown.
      const isText = [
        "json",
        "md",
        "yml",
        "yaml",
        "xml",
        "html",
        "css",
        "js",
        "txt",
        "svg",
      ].includes(ext);

      if (isText) {
        ctx.response.body = new TextDecoder().decode(binary);
      } else {
        ctx.response.body = binary;
      }
    }
  } catch (e) {
    if (e instanceof GitHubAPIError && e.status === 404) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Not Found" };
    } else {
      console.error("Failed to fetch content:", e);
      ctx.response.status = 500;
      ctx.response.body = { error: "Internal Server Error" };
    }
  }
};

export const deleteContent = async (
  ctx: RouterContext<string>,
) => {
  const token = await getSessionToken(ctx);
  if (!token) {
    ctx.response.status = 401;
    ctx.response.body = { error: "Unauthorized" };
    return;
  }

  const { owner, repo } = ctx.params;
  const path = ctx.params[0] || ctx.params.path || "";

  if (!owner || !repo || !path) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing owner, repo, or path" };
    return;
  }

  try {
    const body = await ctx.request.body.json();
    const { sha, branch = "main", message } = body;

    if (!sha || !message) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Missing sha or message" };
      return;
    }

    const client = new GitHubUserClient(token);
    await client.deleteFile(owner, repo, path, message, sha, branch);

    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (e) {
    console.error("Delete failed", e);
    // deno-lint-ignore no-explicit-any
    const status = (e as any).status || 500;
    ctx.response.status = status;
    // deno-lint-ignore no-explicit-any
    ctx.response.body = { error: (e as any).message || "Delete failed" };
  }
};
