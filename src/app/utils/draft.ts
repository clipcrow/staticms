export function getDraftKeyPrefix(
  user: string,
  owner: string,
  repo: string,
  collection: string,
) {
  // Assuming 'main' branch for now, matching ContentEditor logic
  return `draft_${user}|${owner}|${repo}|main|${collection}/`;
}

export function countDrafts(prefix: string): number {
  if (typeof localStorage === "undefined") return 0;
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      count++;
    }
  }
  return count;
}
