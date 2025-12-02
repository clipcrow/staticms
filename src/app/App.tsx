import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { ContentList } from "./components/ContentList.tsx";
import { ContentSettings } from "./components/ContentSettings.tsx";
import { ContentEditor } from "./components/ContentEditor.tsx";
import { ArticleList } from "./components/ArticleList.tsx";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { useAuth } from "./hooks/useAuth.ts";
import { useDraft } from "./hooks/useDraft.ts";
import { useRemoteContent } from "./hooks/useRemoteContent.ts";
import { useContentConfig } from "./hooks/useContentConfig.ts";
import { useRepository } from "./hooks/useRepository.ts";
import { useSubscription } from "./hooks/useSubscription.ts";
import { useCollection } from "./hooks/useCollection.ts";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState } from "react";
import { Content, ViewState } from "./types.ts";

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingContentIndex, setLoadingContentIndex] = useState<number | null>(
    null,
  );

  const currentContent = (location.state as { currentContent?: Content })
    ?.currentContent || null;

  const setCurrentContent = (content: Content | null) => {
    navigate(location.pathname, {
      state: { ...location.state, currentContent: content },
      replace: true,
    });
  };

  const setView = (view: ViewState) => {
    let path = "/";
    switch (view) {
      case "content-settings":
        path = "/settings";
        break;
      case "article-list":
        path = "/articles";
        break;
      case "content-editor":
        path = "/editor";
        break;
      case "content-list":
      default:
        path = "/";
        break;
    }
    navigate(path, { state: { currentContent } });
  };

  let view: ViewState = "content-list";
  if (location.pathname.startsWith("/settings")) view = "content-settings";
  else if (location.pathname.startsWith("/articles")) view = "article-list";
  else if (location.pathname.startsWith("/editor")) view = "content-editor";

  const {
    currentRepo,
    selectRepo,
    clearRepo,
  } = useRepository();

  const {
    isAuthenticated,
    logout,
    isLoggingOut,
    login,
    isLoggingIn,
  } = useAuth(clearRepo, setView);

  const {
    filteredContents,
    formData,
    setFormData,
    targetRepo,
    setTargetRepo,
    editingIndex,
    isSavingConfig,
    handleAddNewContentToRepo,
    handleEditContentConfig,
    handleSaveContentConfig,
    handleDeleteContent,
  } = useContentConfig(setView, currentRepo);

  const {
    body,
    setBody,
    frontMatter,
    setFrontMatter,
    initialBody,
    setInitialBody,
    initialFrontMatter,
    setInitialFrontMatter,
    sha,
    commits,
    editorLoading,
    loadedBranch,
    loadContent,
    isResetting,
  } = useRemoteContent();

  const {
    prUrl,
    setPrUrl,
    prDescription,
    setPrDescription,
    isPrLocked,
    setIsPrLocked,
    prDetails,
    checkPrStatus,
    clearPrState,
    hasDraft,
    draftTimestamp,
    clearDraft,
    saveContent,
    isSaving,
    handleReset,
    resetContent,
    handleSelectContent,
  } = useDraft(
    currentContent,
    body,
    frontMatter,
    initialBody,
    initialFrontMatter,
    setInitialBody,
    setInitialFrontMatter,
    loadContent,
    setCurrentContent,
    setView,
    setLoadingContentIndex,
  );

  const {
    files: articleFiles,
    loading: articleLoading,
    error: articleError,
    fetchFiles: fetchArticles,
    createArticle,
    isCreating: isCreatingArticle,
  } = useCollection(currentContent);

  useEffect(() => {
    if (view === "article-list" && currentContent) {
      fetchArticles();
    }
  }, [view, currentContent, fetchArticles]);

  useSubscription({
    currentContent,
    prUrl,
    loadedBranch,
    body,
    frontMatter,
    initialBody,
    initialFrontMatter,
    prDescription,
    checkPrStatus,
    resetContent,
    clearDraft,
    clearPrState,
    setIsPrLocked,
    setPrUrl,
  });

  if (!isAuthenticated) {
    return <Login onLogin={login} isLoggingIn={isLoggingIn} />;
  }

  return (
    <Routes>
      <Route
        path="/repo-selector"
        element={
          <RepositorySelector
            onSelect={(repoFullName) => {
              selectRepo(repoFullName);
              navigate("/");
            }}
            onLogout={logout}
            isLoggingOut={isLoggingOut}
          />
        }
      />
      <Route
        path="/settings"
        element={!currentRepo
          ? (
            <RepositorySelector
              onSelect={selectRepo}
              onLogout={logout}
              isLoggingOut={isLoggingOut}
            />
          )
          : (
            <ContentSettings
              formData={formData}
              setFormData={setFormData}
              editingIndex={editingIndex}
              onSave={handleSaveContentConfig}
              onCancel={() => {
                setTargetRepo(null);
                setView("content-list");
              }}
              onDelete={() => {
                if (editingIndex !== null) {
                  handleDeleteContent(editingIndex);
                }
              }}
              repoInfo={targetRepo!}
              loading={isSavingConfig}
            />
          )}
      />
      <Route
        path="/articles"
        element={!currentRepo
          ? (
            <RepositorySelector
              onSelect={selectRepo}
              onLogout={logout}
              isLoggingOut={isLoggingOut}
            />
          )
          : currentContent
          ? (
            <ArticleList
              contentConfig={currentContent}
              onBack={() => {
                setCurrentContent(null);
                setView("content-list");
              }}
              onSelectArticle={(path: string) => {
                return handleSelectContent(
                  {
                    ...currentContent,
                    filePath: path,
                    name: undefined,
                    type: "singleton",
                    collectionName: currentContent.name ||
                      currentContent.filePath,
                    collectionPath: currentContent.filePath,
                    collectionType: currentContent.type,
                  },
                  -1,
                );
              }}
              files={articleFiles}
              loading={articleLoading}
              error={articleError}
              createArticle={createArticle}
              isCreating={isCreatingArticle}
            />
          )
          : <div className="ui active centered inline loader"></div>}
      />
      <Route
        path="/editor"
        element={!currentRepo
          ? (
            <RepositorySelector
              onSelect={selectRepo}
              onLogout={logout}
              isLoggingOut={isLoggingOut}
            />
          )
          : currentContent
          ? (
            <ContentEditor
              currentContent={currentContent}
              onBack={() => {
                setCurrentContent(null);
                setView("content-list");
              }}
              body={body}
              setBody={setBody}
              frontMatter={frontMatter}
              setFrontMatter={setFrontMatter}
              onSaveContent={() => saveContent(sha)}
              commits={commits}
              prUrl={prUrl}
              isSaving={isSaving}
              hasDraft={hasDraft}
              draftTimestamp={draftTimestamp}
              prDescription={prDescription}
              setPrDescription={setPrDescription}
              isPrLocked={isPrLocked}
              onReset={handleReset}
              loading={editorLoading}
              isResetting={isResetting}
              prDetails={prDetails}
              onBackToCollection={() => {
                if (currentContent?.collectionPath) {
                  setCurrentContent({
                    ...currentContent,
                    filePath: currentContent.collectionPath,
                    type: currentContent.collectionType as
                      | "singleton"
                      | "collection-files"
                      | "collection-dirs",
                    name: currentContent.collectionName,
                    collectionName: undefined,
                    collectionPath: undefined,
                    collectionType: undefined,
                  });
                  setView("article-list");
                }
              }}
            />
          )
          : <div className="ui active centered inline loader"></div>}
      />
      <Route
        path="/"
        element={!currentRepo
          ? (
            <RepositorySelector
              onSelect={(repoFullName) => {
                selectRepo(repoFullName);
              }}
              onLogout={logout}
              isLoggingOut={isLoggingOut}
            />
          )
          : (
            <ContentList
              contents={filteredContents}
              selectedRepo={currentRepo}
              onEditContentConfig={handleEditContentConfig}
              onSelectContent={handleSelectContent}
              onAddNewContentToRepo={handleAddNewContentToRepo}
              loadingItemIndex={loadingContentIndex}
              onChangeRepo={clearRepo}
            />
          )}
      />
    </Routes>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>,
);
