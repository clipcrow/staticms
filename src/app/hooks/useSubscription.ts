import { useEffect, useRef } from "react";
import { Content } from "../types.ts";

interface UseSubscriptionProps {
  currentContent: Content | null;
  prUrl: string | null;
  loadedBranch: string | null;
  body: string;
  // deno-lint-ignore no-explicit-any
  frontMatter: any;
  initialBody: string;
  // deno-lint-ignore no-explicit-any
  initialFrontMatter: any;
  prDescription: string;
  checkPrStatus: () => Promise<string | null>;
  resetContent: () => void;
  clearDraft: () => void;
  clearPrState: () => void;
  setIsPrLocked: (locked: boolean) => void;
  setPrUrl: (url: string | null) => void;
}

export const useSubscription = ({
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
}: UseSubscriptionProps) => {
  // Refs for accessing latest state in SSE callback
  const bodyRef = useRef(body);
  const frontMatterRef = useRef(frontMatter);
  const initialBodyRef = useRef(initialBody);
  const initialFrontMatterRef = useRef(initialFrontMatter);
  const prDescriptionRef = useRef(prDescription);
  const loadedBranchRef = useRef(loadedBranch);

  useEffect(() => {
    bodyRef.current = body;
  }, [body]);
  useEffect(() => {
    frontMatterRef.current = frontMatter;
  }, [frontMatter]);
  useEffect(() => {
    initialBodyRef.current = initialBody;
  }, [initialBody]);
  useEffect(() => {
    initialFrontMatterRef.current = initialFrontMatter;
  }, [initialFrontMatter]);
  useEffect(() => {
    prDescriptionRef.current = prDescription;
  }, [prDescription]);
  useEffect(() => {
    loadedBranchRef.current = loadedBranch;
  }, [loadedBranch]);

  // SSE Subscription
  useEffect(() => {
    const eventSource = new EventSource("/api/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "push" && currentContent) {
          const repoFullName = `${currentContent.owner}/${currentContent.repo}`;
          if (data.repo === repoFullName) {
            // Check branch match
            if (data.branch !== loadedBranchRef.current) {
              console.log(
                `Ignoring push to ${data.branch} (current: ${loadedBranchRef.current})`,
              );
              return;
            }

            // Check if file is in commits
            const fileChanged = data.commits.some((commit: {
              added: string[];
              modified: string[];
              removed: string[];
            }) => {
              const normalize = (p: string) => p.replace(/^\//, "");
              const path = normalize(currentContent.filePath);
              return (
                commit.added.some((f: string) => normalize(f) === path) ||
                commit.modified.some((f: string) => normalize(f) === path) ||
                commit.removed.some((f: string) => normalize(f) === path)
              );
            });

            if (fileChanged) {
              console.log("File changed remotely, checking status...");

              // Check for unsaved changes
              const isDirty = bodyRef.current !== initialBodyRef.current ||
                JSON.stringify(frontMatterRef.current) !==
                  JSON.stringify(initialFrontMatterRef.current) ||
                prDescriptionRef.current !== "";

              if (isDirty) {
                console.log(
                  "Remote change detected but local changes exist. Skipping reset.",
                );
                return;
              }

              if (prUrl) {
                checkPrStatus().then((status) => {
                  // If PR is open, we still need to update the content because the file changed
                  if (status === "open") {
                    resetContent();
                  }
                  if (status === "closed") {
                    clearDraft();
                    resetContent();
                  }
                });
              } else {
                resetContent();
              }
            }
          }
        } else if (data.type === "pull_request" && currentContent) {
          const repoFullName = `${currentContent.owner}/${currentContent.repo}`;
          if (data.repo === repoFullName && data.prUrl === prUrl) {
            if (data.action === "closed") {
              console.log("PR closed remotely, resetting...");
              setIsPrLocked(false);
              setPrUrl(null);

              // Clear local storage
              clearDraft();
              clearPrState();

              resetContent();
            }
          }
        }
      } catch (e) {
        console.error("Error parsing SSE event", e);
      }
    };
    return () => {
      eventSource.close();
    };
  }, [
    currentContent,
    prUrl,
    clearDraft,
    clearPrState,
    resetContent,
    checkPrStatus,
    setIsPrLocked,
    setPrUrl,
  ]);
};
