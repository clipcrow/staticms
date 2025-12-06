import { RouterContext } from "@oak/oak";

// Temporary Mock Data
const MOCK_REPOS = [
  {
    id: 12345,
    name: "my-blog",
    full_name: "user/my-blog",
    description: "My personal blog",
    private: false,
    updated_at: new Date().toISOString(),
  },
  {
    id: 67890,
    name: "staticms-site",
    full_name: "org/staticms-site",
    description: "Documentation site",
    private: true,
    updated_at: new Date().toISOString(),
  },
];

export const listRepositories = (ctx: RouterContext<string>) => {
  // In future: Fetch from GitHub API using user's token
  ctx.response.body = MOCK_REPOS;
  ctx.response.type = "application/json";
};
