import { createRoot } from "react-dom/client";
import { ContentList } from "./components/ContentList.tsx";
import { ContentSettings } from "./components/ContentSettings.tsx";
import { ContentEditor } from "./components/ContentEditor.tsx";
import { Login } from "./components/Login.tsx";
import { RepositorySelector } from "./components/RepositorySelector.tsx";
import { Header } from "./components/Header.tsx";
import { useAuth } from "./hooks/useAuth.ts";
import { useContentEditor } from "./hooks/useContentEditor.ts";
import { useRemoteContent } from "./hooks/useRemoteContent.ts";
import { useContentConfig } from "./hooks/useContentConfig.ts";
import { useNavigation } from "./hooks/useNavigation.ts";
import { useRepository } from "./hooks/useRepository.ts";
import { useSubscription } from "./hooks/useSubscription.ts";

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
    authLoading,
    logout,
  } = useAuth(clearRepo, setView);

  const {
    contents,
    configLoading,
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
  } = useContentConfig(setView);

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
  } = useContentEditor(
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

  // fallback loading state
  if (configLoading || authLoading) {
    return (
      <div className="ui container">
        <Header />
        <div className="ui active centered inline loader staticms-app-loader">
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!currentRepo) {
    return (
      <RepositorySelector
        onSelect={(repoFullName) => {
          selectRepo(repoFullName);
        }}
        onLogout={logout}
      />
    );
  }

  const [selectedRepoOwner, selectedRepoName] = currentRepo.split("/");
  const filteredContents = contents.filter((c) =>
    c.owner === selectedRepoOwner && c.repo === selectedRepoName
  );

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

  if (view === "content-list") {
    return (
      <ContentList
        contents={filteredContents}
        selectedRepo={currentRepo}
        onEditContentConfig={handleEditContentConfig}
        onSelectContent={handleSelectContent}
        onAddNewContentToRepo={handleAddNewContentToRepo}
        loadingItemIndex={loadingContentIndex}
        onLogout={logout}
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
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
