import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Content } from "../types.ts";
import { useRemoteContent } from "../hooks/useRemoteContent.ts";
import { useDraft } from "../hooks/useDraft.ts";
import { useSubscription } from "../hooks/useSubscription.ts";
import { ContentEditor } from "./ContentEditor.tsx";
import { getDraftKey, getPrKey } from "../hooks/utils.ts";

interface ContentEditorWrapperProps {
  content: Content;
}

export const ContentEditorWrapper: React.FC<ContentEditorWrapperProps> = ({
  content,
}) => {
  const navigate = useNavigate();

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
    handleReset,
    resetContent,
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
      getPrKey,
      setPrUrl,
      setHasDraft,
      setDraftTimestamp,
      setPrDescription,
    );
  }, [
    content,
    loadContent,
    setPrUrl,
    setHasDraft,
    setDraftTimestamp,
    setPrDescription,
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
        `/${content.owner}/${content.repo}/collection/${encodedCollectionPath}`,
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
      draftTimestamp={draftTimestamp}
      prDescription={prDescription}
      setPrDescription={setPrDescription}
      isSaving={isSaving}
      commits={commits}
      onSaveContent={() => saveContent(sha)}
      onReset={handleReset}
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
