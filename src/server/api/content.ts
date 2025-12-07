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

    // Check if we are requesting config file
    if (path === "staticms.config.yml" || path === ".github/staticms.yml") {
      // Special handling for config to support fallback
      try {
        // deno-lint-ignore no-explicit-any
        const data: any = await client.getContent(owner, repo, path);
        // Config file should be a file
        if (Array.isArray(data)) throw new Error("Config path is a directory");

        const binary = decodeBase64(data.content.replace(/\n/g, ""));
        const text = new TextDecoder().decode(binary);

        ctx.response.body = text;
        ctx.response.type = "text/yaml";
        return;
      } catch (e) {
        if (e instanceof GitHubAPIError && e.status === 404) {
          // Config not found
          ctx.response.status = 404;
          ctx.response.body = "Config not found";
          return;
        }
        throw e;
      }
    }

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
