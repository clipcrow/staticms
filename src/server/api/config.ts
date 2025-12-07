import { RouterContext } from "@oak/oak";

// Temporary Mock Data for Config in KV
// In real impl, this would be fetched from Deno.KV
const MOCK_CONFIGS: Record<string, string> = {
  "my-blog": `
collections:
  - name: "posts"
    label: "Posts"
    type: "collection"
    folder: "content/posts"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Body", name: "body", widget: "markdown"}
  - name: "site_settings"
    label: "Site Settings"
    type: "singleton"
    file: "data/settings.json"
    fields:
      - {label: "Site Title", name: "site_title", widget: "string"}
`,
};

// GET /api/repo/:owner/:repo/config
export const getRepoConfig = (
  ctx: RouterContext<"/api/repo/:owner/:repo/config">,
) => {
  const { repo } = ctx.params;

  // For mock, we ignore owner and just check repo name
  const config = MOCK_CONFIGS[repo];

  if (config) {
    ctx.response.body = config; // Returns YAML string
    ctx.response.type = "text/yaml";
  } else {
    // Return default empty config or 404?
    // Let's return a default config for unknown repos to allow exploration
    ctx.response.body = `
collections:
  - name: "default_posts"
    label: "Default Posts"
    type: "collection"
    folder: "content/posts"
`;
    ctx.response.type = "text/yaml";
  }
};
// POST /api/repo/:owner/:repo/config
export const saveRepoConfig = async (
  ctx: RouterContext<"/api/repo/:owner/:repo/config">,
) => {
  const { repo } = ctx.params;

  // We expect raw YAML body. Use 'any' cast to bypass strict typing issues with Oak
  try {
    const body = ctx.request.body;
    // deno-lint-ignore no-explicit-any
    const configYaml = await (body as any).text();
    console.log(`[Config API] Received config update for ${repo}:`, configYaml);

    // Simple validation (check if not empty)
    if (!configYaml || !configYaml.trim()) {
      throw new Error("Empty config body");
    }

    MOCK_CONFIGS[repo] = configYaml;
    console.log(`[Config API] Saved config for ${repo}`);

    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (e) {
    console.error("[Config API] Error saving config:", e);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Failed to save config: " +
        (e instanceof Error ? e.message : String(e)),
    };
  }
};
