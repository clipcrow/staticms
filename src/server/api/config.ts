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
