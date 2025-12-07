import { RouterContext } from "@oak/oak";

const MOCK_CONFIG = `
collections:
  - name: "posts"
    label: "Posts"
    folder: "content/posts"
    create: true
    fields:
      - {label: "Title", name: "title", widget: "string"}
      - {label: "Body", name: "body", widget: "markdown"}
  - name: "settings"
    label: "Settings"
    files:
      - file: "data/settings.json"
        label: "Global Settings"
        fields:
          - {label: "Site Title", name: "site_title", widget: "string"}
`;

// Mock data for directory listing
const MOCK_POSTS = [
  {
    name: "hello-world.md",
    path: "content/posts/hello-world.md",
    sha: "shaxx1",
    size: 1024,
    url: "",
    html_url: "",
    git_url: "",
    download_url: "",
    type: "file",
    _links: { self: "", git: "", html: "" },
  },
  {
    name: "second-post.md",
    path: "content/posts/second-post.md",
    sha: "shaxx2",
    size: 2048,
    url: "",
    html_url: "",
    git_url: "",
    download_url: "",
    type: "file",
    _links: { self: "", git: "", html: "" },
  },
];

export const getContent = (
  ctx: RouterContext<string>,
) => {
  // when using (.*), the matched path is in params[0]
  // params will be { owner: "...", repo: "...", 0: "path/to/file" }
  const path = ctx.params[0] || ctx.params.path;

  console.log(`[MockAPI] Get Content: ${path}`);

  if (path === "staticms.config.yml") {
    ctx.response.body = MOCK_CONFIG;
    ctx.response.type = "text/yaml";
    return;
  }

  if (path === "content/posts") {
    ctx.response.body = MOCK_POSTS;
    ctx.response.type = "application/json";
    return;
  }

  // Fallback for other files
  ctx.response.status = 404;
  ctx.response.body = "Not found (Mock)";
};
