import { useNavigate, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";
import { ArticleList as V1ArticleList } from "@/app/components/common/ArticleList.tsx";
import {
  Content as V1Content,
  FileItem,
} from "@/app/components/editor/types.ts";

export function ArticleList() {
  const { owner, repo, collectionName } = useParams();
  const navigate = useNavigate();
  const { config, loading: configLoading, error: configError } =
    useContentConfig(owner, repo);

  // We use collectionName as the key to find definition
  const collectionDef = config?.collections.find((c) =>
    c.name === collectionName
  );
  const folder = collectionDef?.folder;

  const { files, loading: contentLoading, error: contentError } =
    useRepoContent(
      owner,
      repo,
      folder,
    );

  if (configLoading || (folder && contentLoading)) {
    return <div className="ui active centered inline loader"></div>;
  }

  if (configError) {
    return (
      <div className="ui negative message">
        Error loading config: {configError.message}
      </div>
    );
  }

  if (!collectionDef) {
    return (
      <div className="ui warning message">
        Collection "{collectionName}" not found.
      </div>
    );
  }

  // Adapter for V1 Content object
  const v1Content: V1Content = {
    owner: owner || "",
    repo: repo || "",
    filePath: folder || "",
    fields: collectionDef.fields?.map((f) => ({
      name: f.name,
      value: "",
      defaultValue: "",
    })) || [],
    name: collectionDef.label,
    type: "collection-files", // Simplified
    collectionName: collectionDef.name,
    collectionPath: folder,
  };

  // Convert files to compatible V1 FileItems if necessary
  // Assuming useRepoContent returns compatible items, we cast them.
  // We need 'sha' which might be missing in some v2 implementations?
  // Let's assume compatibility for now or map them.
  const v1Files: FileItem[] = files.map((f: any) => ({
    name: f.name,
    path: f.path,
    type: f.type,
    sha: f.sha || "unknown", // Fallback
    content: undefined,
  }));

  const handleCreateArticle = (name: string) => {
    // Generate filename logic
    let filename = name;
    if (!filename.endsWith(".md")) filename += ".md";
    // For navigation, we just need the filename part if inside collection
    navigate(
      `/${owner}/${repo}/${collectionName}/new?filename=${
        encodeURIComponent(filename)
      }`,
    ); // Pass via query param? Or just let Editor handle it?
    // Actually v1 expects this function to return a path string if successful, then calls onSelectArticle.
    // In v2 routing, we want to navigate to the "new" route.
    // But the V1 component calls onSelectArticle(path) if this returns a path.
    // So we can just return undefined and navigate manually here.

    // However, looking at v1 ArticleList:
    // const path = createArticle(newArticleName);
    // if (path) onSelectArticle(path);

    // If we want to support "Create", we should navigate to the new route.
    // But the new route `/:owner/:repo/:collectionName/new` handles creation.
    // We can just navigate there and let the user type the name?
    // BUT v1 ArticleList has an input field for "New article name".
    // If user typed "My Post", we want to pass that to the editor.

    // Let's navigate to `new` mode and pass filename in state or query.
    // We'll update ContentEditor to respect it later if needed.
    // For now, let's just return undefined to stop v1 component from doing prompt logic,
    // and navigate immediately.

    return undefined; // We navigate manually
  };

  // Override the internal handleCreateArticle of v1 by intercepting proper flow?
  // No, we are passing `createArticle` prop.
  // v1 ArticleList:
  // onClick={handleCreateArticle} -> calls createArticle(newArticleName)

  const handleCreateArticleProp = (name: string): string | undefined => {
    // Just navigate
    navigate(
      `/${owner}/${repo}/${collectionName}/${
        encodeURIComponent(name)
      }.md?mode=new`,
    );
    // Note: This route might be intercepted as edit route if we are not careful.
    // v2 routes: /:collectionName/new  vs /:collectionName/:articleName
    // If name is "foo.md", it matches :articleName.
    // If we want "new" mode with prefilled name, maybe we should use the /new route
    // and pass title via state.

    // Let's try navigating to /new.
    // But we need to pass the name.
    // For now, let's navigate to the "edit" route for a file that doesn't exist yet?
    // No, that triggers 404 fetch.

    // Let's stick to /new.
    navigate(`/${owner}/${repo}/${collectionName}/new`, {
      state: { initialTitle: name },
    });
    return undefined;
  };

  const handleSelectArticle = (path: string) => {
    // Path is usually full path e.g. "content/posts/foo.md"
    // We need just "foo.md"
    const filename = path.split("/").pop();
    navigate(`/${owner}/${repo}/${collectionName}/${filename}`);
  };

  return (
    <V1ArticleList
      contentConfig={v1Content}
      onSelectArticle={handleSelectArticle}
      files={v1Files}
      loading={contentLoading}
      error={contentError ? contentError.message : null}
      createArticle={handleCreateArticleProp}
      isCreating={false}
    />
  );
}
