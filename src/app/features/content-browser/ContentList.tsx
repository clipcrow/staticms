import { useState } from "react";
import type { Collection } from "@/app/hooks/useContentConfig.ts";
import { useNavigate } from "react-router-dom";
import { Header } from "@/app/components/common/Header.tsx";
import { ContentListItem } from "@/app/components/common/ContentListItem.tsx";

interface ContentListProps {
  collections: Collection[];
  owner: string;
  repo: string;
}

export function ContentList({ collections, owner, repo }: ContentListProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");

  if (!collections || collections.length === 0) {
    return (
      <div className="ui container" style={{ marginTop: "2rem" }}>
        <Header
          breadcrumbs={[
            { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
          ]}
        />
        <div className="ui placeholder segment">
          <div className="ui icon header">
            <i className="file alternate outline icon"></i>
            No content definitions found.
          </div>
          <div className="inline">
            Please add collections to your staticms.config.yml.
          </div>
        </div>
      </div>
    );
  }

  const getDisplayName = (c: Collection) =>
    c.label || c.path || c.folder || c.file || c.name;

  const filteredCollections = collections.filter((c) =>
    getDisplayName(c).toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectContent = (collectionName: string) => {
    navigate(`/${owner}/${repo}/${collectionName}`);
  };

  const handleSettingsClick = (e: React.MouseEvent, collectionName: string) => {
    e.stopPropagation();
    // Navigate to settings editing page (Conceptual path)
    navigate(`/${owner}/${repo}/config/${collectionName}`);
  };

  const handleAddNewContent = () => {
    // Navigate to content type creation page (Conceptual path)
    navigate(`/${owner}/${repo}/config/new`);
  };

  return (
    <div className="ui container" style={{ marginTop: "2rem" }}>
      <Header
        breadcrumbs={[
          { label: `${owner}/${repo}`, to: `/${owner}/${repo}` },
        ]}
        rightContent={
          <div style={{ display: "flex", gap: "0.5em" }}>
            <div className="ui icon buttons basic">
              <button
                type="button"
                className={`ui button ${viewMode === "card" ? "active" : ""}`}
                onClick={() => setViewMode("card")}
                title="Card View"
              >
                <i className="th icon"></i>
              </button>
              <button
                type="button"
                className={`ui button ${viewMode === "list" ? "active" : ""}`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <i className="list icon"></i>
              </button>
            </div>
            <button
              type="button"
              className="ui primary button"
              onClick={handleAddNewContent}
            >
              <i className="plus icon"></i>
              Add New Content
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="ui segment secondary form">
        <div className="fields inline" style={{ margin: 0 }}>
          <div className="sixteen wide field">
            <div className="ui icon input fluid">
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="search icon"></i>
            </div>
          </div>
        </div>
      </div>

      {/* List Content */}
      {filteredCollections.length === 0
        ? <div className="ui message">No collections match your search.</div>
        : (
          <>
            {viewMode === "card" && (
              <div className="ui three stackable cards">
                {filteredCollections.map((c) => (
                  <div
                    className="card link"
                    key={c.name}
                    onClick={() => handleSelectContent(c.name)}
                  >
                    <div className="content">
                      <div className="header">
                        <i
                          className={`icon ${
                            c.type === "singleton"
                              ? "file outline"
                              : "folder outline"
                          }`}
                          style={{ marginRight: "0.5em" }}
                        >
                        </i>
                        {getDisplayName(c)}
                      </div>
                      <div className="meta">
                        {c.name}
                      </div>
                      <div className="description">
                        {c.type === "singleton"
                          ? "Singleton Content"
                          : "Collection of entries"}
                      </div>
                    </div>
                    <div className="extra content">
                      <button
                        type="button"
                        className="ui icon button basic right floated mini"
                        onClick={(e) => handleSettingsClick(e, c.name)}
                        title="Settings"
                      >
                        <i className="cog icon"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === "list" && (
              <div className="ui relaxed divided list">
                {filteredCollections.map((c) => (
                  <ContentListItem
                    key={c.name}
                    icon={
                      <i
                        className={`large icon ${
                          c.type === "singleton"
                            ? "file outline"
                            : "folder outline"
                        }`}
                      />
                    }
                    primaryText={getDisplayName(c)}
                    secondaryText={c.name}
                    actions={
                      <button
                        type="button"
                        className="ui icon button basic mini"
                        onClick={(e) => handleSettingsClick(e, c.name)}
                        title="Settings"
                      >
                        <i className="cog icon"></i>
                      </button>
                    }
                    onClick={() => handleSelectContent(c.name)}
                  />
                ))}
              </div>
            )}
          </>
        )}
    </div>
  );
}
