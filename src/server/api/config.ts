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

  // We expect raw YAML body. Oak's request.body is a method in older/some versions but in standard Request it's a getter.
  // Oak's ctx.request.body() returns a Body object.
  // We want text.
  const body = ctx.request.body;
  if (body.type() !== "text") {
    ctx.response.status = 400;
    ctx.response.body = "Invalid body type";
    return;
  }
  const configYaml = await body.text();

  console.log(`[MockAPI] Saving config for ${repo}`);
  MOCK_CONFIGS[repo] = configYaml;

  ctx.response.status = 200;
  ctx.response.body = { success: true };
};
