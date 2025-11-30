import { useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Content } from "./types.ts";
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

  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { selectedRepo, selectRepo, clearRepo } = useRepository();

  const handleLogout = async () => {
    await logout();
    clearRepo();
    setView("content-list");
  };

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
  } = useRemoteContent();

  const {
    prUrl,
    setPrUrl,
    prDescription,
    setPrDescription,
    isPrLocked,
    setIsPrLocked,
    prDetails,
    setPrDetails,
    checkPrStatus,
    clearPrState,
    getPrKey,
    hasDraft,
    draftTimestamp,
    setHasDraft,
    setDraftTimestamp,
    clearDraft,
    getDraftKey,
    saveContent,
    isSaving,
  } = useContentEditor(
    currentContent,
    body,
    frontMatter,
    initialBody,
    initialFrontMatter,
    setInitialBody,
    setInitialFrontMatter,
  );

  const resetContent = useCallback(() => {
    if (!currentContent) return;

    clearDraft();

    loadContent(
      currentContent,
      getDraftKey,
      getPrKey,
      setPrUrl,
      setHasDraft,
      setDraftTimestamp,
      setPrDescription,
    );
  }, [
    currentContent,
    clearDraft,
    loadContent,
    getDraftKey,
    getPrKey,
    setPrUrl,
    setHasDraft,
    setDraftTimestamp,
    setPrDescription,
  ]);

  useEffect(() => {
    if (prUrl) {
      checkPrStatus().then((status) => {
        if (status === "closed") {
          clearDraft();
          resetContent();
        }
      });
    } else {
      setIsPrLocked(false);
      setPrDetails(null);
    }
  }, [prUrl, checkPrStatus, clearDraft, resetContent]);

  const handleReset = () => {
    if (!currentContent) return;
    if (
      !confirm(
        "Are you sure you want to discard your local changes and reset to the remote content?",
      )
    ) return;

    resetContent();
  };

  // Removed checkPrStatus definition from here as it is now in usePullRequest hook

  // Removed loadedBranch refs and state as they are now in useRemoteContent hook
  // Refs for accessing latest state in SSE callback
  // SSE Subscription
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

  const loadContentData = (content: Content) => {
    loadContent(
      content,
      getDraftKey,
      getPrKey,
      setPrUrl,
      setHasDraft,
      setDraftTimestamp,
      setPrDescription,
    ).then(() => {
      // Transition to editor view after data is loaded
      setCurrentContent(content);
      setView("content-editor");
      setLoadingContentIndex(null);
    }).catch((e) => {
      console.error(e);
      setLoadingContentIndex(null);
    });
  };

  const handleSelectContent = (content: Content, index: number) => {
    setLoadingContentIndex(index);
    loadContentData(content);
  };

  // Removed useEffect for checkPrStatus as it is now in usePullRequest hook

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

  if (!selectedRepo) {
    return (
      <RepositorySelector
        onSelect={(repoFullName) => {
          selectRepo(repoFullName);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const [selectedRepoOwner, selectedRepoName] = selectedRepo.split("/");
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
        selectedRepo={selectedRepo}
        onEditContentConfig={handleEditContentConfig}
        onSelectContent={handleSelectContent}
        onAddNewContentToRepo={handleAddNewContentToRepo}
        loadingItemIndex={loadingContentIndex}
        onLogout={handleLogout}
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
      prDetails={prDetails}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
