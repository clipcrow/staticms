import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Content } from "../types.ts";
import { useRemoteContent } from "../hooks/useRemoteContent.ts";
import { useDraft } from "../hooks/useDraft.ts";
import { useSubscription } from "../hooks/useSubscription.ts";
import { ContentEditor } from "../components/ContentEditor.tsx";
import { getDraftKey } from "../hooks/utils.ts";

interface ContentEditorWrapperProps {
  content: Content;
}

export const ContentEditorWrapper: React.FC<ContentEditorWrapperProps> = ({
  content,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // deno-lint-ignore no-explicit-any
  const initialData = (location.state as { initialData?: any })?.initialData;

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
    setHasDraft,
    draftTimestamp,
    setDraftTimestamp,
    clearDraft,
    saveContent,
    isSaving,
    resetContent,
    pendingImages,
    setPendingImages,
    hasUnsavedChanges,
  } = useDraft(
    content,
    body,
    frontMatter,
    initialBody,
    initialFrontMatter,
    setInitialBody,
    setInitialFrontMatter,
    loadContent,
  );

  useSubscription({
    currentContent: content,
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

  useEffect(() => {
    loadContent(
      content,
      getDraftKey,
      setHasDraft,
      setDraftTimestamp,
      setPrDescription,
      setPendingImages,
      false,
      initialData,
    );
  }, [
    content,
    loadContent,
    setHasDraft,
    setDraftTimestamp,
    setPrDescription,
    setPendingImages,
    initialData,
  ]);

  const handleBack = () => {
    navigate(`/${content.owner}/${content.repo}`);
  };

  const handleBackToCollection = () => {
    if (content.collectionPath) {
      // Navigate to collection
      // We need to encode the collection path
      const encodedCollectionPath = encodeURIComponent(content.collectionPath);
      navigate(
        `/${content.owner}/${content.repo}/${encodedCollectionPath}`,
      );
    } else {
      handleBack();
    }
  };

  return (
    <ContentEditor
      currentContent={content}
      body={body}
      setBody={setBody}
      frontMatter={frontMatter}
      setFrontMatter={setFrontMatter}
      isPrLocked={isPrLocked}
      prUrl={prUrl}
      hasDraft={hasDraft}
      setHasDraft={setHasDraft}
      draftTimestamp={draftTimestamp}
      setDraftTimestamp={setDraftTimestamp}
      prDescription={prDescription}
      setPrDescription={setPrDescription}
      pendingImages={pendingImages}
      setPendingImages={setPendingImages}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={isSaving}
      commits={commits}
      onSaveContent={() => saveContent(sha)}
      onReset={resetContent}
      onBack={handleBack}
      loading={editorLoading}
      prDetails={prDetails}
      isResetting={isResetting}
      onBackToCollection={content.collectionPath
        ? handleBackToCollection
        : undefined}
    />
  );
};
