import { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import jsyaml from "js-yaml";
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

  const [isSaving, setIsSaving] = useState(false);

  const {
    body,
    setBody,
    frontMatter,
    setFrontMatter,
    initialBody,
    setInitialBody,
    initialFrontMatter,
    setInitialFrontMatter,
    customFields,
    setCustomFields,
    sha,
    commits,
    editorLoading,
    loadedBranch,
    loadContent,
  } = useRemoteContent();

  const {
    prUrl,
    setPrUrl,
    isPrOpen,
    setIsPrOpen,
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
  } = useContentEditor(
    currentContent,
    view,
    body,
    frontMatter,
    initialBody,
    initialFrontMatter,
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

  const handleSaveContent = async () => {
    if (!currentContent) return;
    setIsSaving(true);
    setPrUrl(null); // Clear PR URL state temporarily until new PR is created

    // Reconstruct content with Front Matter
    const isYaml = currentContent.filePath.endsWith(".yaml") ||
      currentContent.filePath.endsWith(".yml");
    let finalContent = body;

    if (currentContent.fields && currentContent.fields.length > 0) {
      // Only include fields that are defined in the config
      if (Array.isArray(frontMatter)) {
        // For array, we map over each item and filter/merge fields
        const newFM = frontMatter.map((item) => {
          const fmToSave: Record<string, unknown> = {};
          currentContent.fields.forEach((field) => {
            fmToSave[field.name] = item[field.name] || "";
          });
          return { ...item, ...fmToSave };
        });

        try {
          const yamlString = jsyaml.dump(newFM);
          if (isYaml) {
            finalContent = yamlString;
          } else {
            // Arrays are typically only for pure YAML files, but just in case
            finalContent = `---\n${yamlString}---\n${body}`;
          }
        } catch (e) {
          console.error("Error dumping yaml", e);
          finalContent = body;
        }
      } else {
        const fmToSave: Record<string, unknown> = {};
        currentContent.fields.forEach((field) => {
          fmToSave[field.name] = frontMatter[field.name] || "";
        });

        // If there are other existing FM keys not in config, should we keep them?
        // For now, let's merge existing FM with configured fields to avoid data loss
        const mergedFM = { ...frontMatter, ...fmToSave };

        if (Object.keys(mergedFM).length > 0) {
          try {
            const yamlString = jsyaml.dump(mergedFM);
            if (isYaml) {
              finalContent = yamlString;
            } else {
              finalContent = `---\n${yamlString}---\n${body}`;
            }
          } catch (e) {
            console.error("Error dumping yaml", e);
            // Fallback to raw body if YAML fails
            finalContent = body;
          }
        }
      }
    } else if (
      (Array.isArray(frontMatter) && frontMatter.length > 0) ||
      (!Array.isArray(frontMatter) && Object.keys(frontMatter).length > 0)
    ) {
      // If no fields configured but FM exists, preserve it
      try {
        const yamlString = jsyaml.dump(frontMatter);
        if (isYaml) {
          finalContent = yamlString;
        } else {
          finalContent = `---\n${yamlString}---\n${body}`;
        }
      } catch (e) {
        console.error("Error dumping yaml", e);
        finalContent = body;
      }
    } else if (isYaml) {
      // YAML file with no fields/frontMatter? Should probably be empty object or empty string
      finalContent = "";
    }

    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const HH = String(now.getHours()).padStart(2, "0");
      const MM = String(now.getMinutes()).padStart(2, "0");
      const generatedTitle = `STATICMS ${yyyy}${mm}${dd}${HH}${MM}`;

      console.log(
        `[handleSaveContent] Sending branch: "${currentContent.branch}"`,
      );

      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: currentContent.owner,
          repo: currentContent.repo,
          path: currentContent.filePath,
          branch: currentContent.branch,
          content: finalContent,
          message: prDescription || "Update content via Staticms",
          title: generatedTitle,
          description: prDescription,
          sha,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrUrl(data.prUrl);

        // Save PR URL to local storage
        const prKey = getPrKey(currentContent);
        localStorage.setItem(prKey, data.prUrl);

        // Clear draft on success
        clearDraft();
        setIsPrOpen(false);
        setPrDescription("");

        // Update initial state to prevent "Unsaved Changes" detection
        setInitialBody(body);
        setInitialFrontMatter(frontMatter);

        // Fetch PR details immediately
        checkPrStatus();
      } else {
        console.error("Failed to create PR: " + data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

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
      customFields={customFields}
      setCustomFields={setCustomFields}
      onSaveContent={handleSaveContent}
      commits={commits}
      prUrl={prUrl}
      isSaving={isSaving}
      hasDraft={hasDraft}
      draftTimestamp={draftTimestamp}
      prDescription={prDescription}
      setPrDescription={setPrDescription}
      isPrOpen={isPrOpen}
      setIsPrOpen={setIsPrOpen}
      isPrLocked={isPrLocked}
      onReset={handleReset}
      loading={editorLoading}
      prDetails={prDetails}
    />
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
