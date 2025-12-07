import { Link, useParams } from "react-router-dom";
import { useContentConfig } from "@/app/hooks/useContentConfig.ts";
import { useRepoContent } from "@/app/hooks/useRepoContent.ts";

export function ArticleList() {
  const { owner, repo, collectionName } = useParams();
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

  if (contentError) {
    return (
      <div className="ui negative message">
        Error loading content: {contentError.message}
      </div>
    );
  }

  return (
    <div className="ui container" style={{ marginTop: "2em" }}>
      {/* Breadcrumb / Header */}
      <h1 className="ui header article-list-header">
        <i className="folder open icon"></i>
        <div className="content">
          {collectionDef.label}
          <div className="sub header">
            <Link to={`/${owner}/${repo}`}>
              {owner} {repo}
            </Link>{" "}
            / {collectionName}
          </div>
        </div>
        <Link
          to={`/${owner}/${repo}/${collectionName}/new`}
          className="ui right floated primary button"
        >
          <i className="plus icon"></i>
          New
        </Link>
      </h1>

      <div className="ui segment">
        {(!files || files.length === 0)
          ? <p>No articles found.</p>
          : (
            <div className="ui relaxed divided list">
              {files.map((file) => (
                <div className="item article-item" key={file.path}>
                  <i className="file outline middle aligned icon"></i>
                  <div className="content">
                    {/* Link to Editor: /:owner/:repo/:collectionName/:articleName */}
                    {/* Assuming file.name is the articleName for now */}
                    <div className="header">
                      <Link
                        to={`/${owner}/${repo}/${collectionName}/${file.name}`}
                      >
                        {file.name}
                      </Link>
                    </div>
                    <div className="description">Size: {file.size} bytes</div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
