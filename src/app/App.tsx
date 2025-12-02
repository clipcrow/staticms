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
import { useNavigation } from "./hooks/useNavigation.ts";
import { useRepository } from "./hooks/useRepository.ts";
import { useSubscription } from "./hooks/useSubscription.ts";
import { useCollection } from "./hooks/useCollection.ts";

function App() {
  const {
    view,
    setView,
    currentContent,
    setCurrentContent,
    loadingContentIndex,
    setLoadingContentIndex,
  } = useNavigation();

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

  if (!currentRepo) {
    return (
      <RepositorySelector
        onSelect={(repoFullName) => {
          selectRepo(repoFullName);
        }}
        onLogout={logout}
        isLoggingOut={isLoggingOut}
      />
    );
  }

  if (view === "content-settings") {
    return (
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
    );
  }

  if (view === "article-list" && currentContent) {
    return (
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
              collectionName: currentContent.name || currentContent.filePath,
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
    );
  }

  if (view === "content-list") {
    return (
      <ContentList
        contents={filteredContents}
        selectedRepo={currentRepo}
        onEditContentConfig={handleEditContentConfig}
        onSelectContent={handleSelectContent}
        onAddNewContentToRepo={handleAddNewContentToRepo}
        loadingItemIndex={loadingContentIndex}
        onChangeRepo={clearRepo}
      />
    );
  }

  // If view is "content-editor" or any other view not explicitly handled,
  // and currentContent is available, render ContentEditor.
  // This assumes currentContent will be set when view is "content-editor".
  return (
    <ContentEditor
      currentContent={currentContent!}
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
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
