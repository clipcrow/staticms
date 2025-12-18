import { fetchWithAuth } from "@/app/utils/fetcher.ts";
import { Config } from "@/app/hooks/useContentConfig.ts";
import yaml from "js-yaml";
import { useMemo } from "react";

export interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export interface PullRequest {
  html_url: string;
  number: number;
}

export interface BranchServices {
  getUnmergedCommits: (
    owner: string,
    repo: string,
    base: string,
    head: string,
  ) => Promise<Commit[]>;
  checkBranchExists: (
    owner: string,
    repo: string,
    branch: string,
  ) => Promise<boolean>;
  createBranch: (owner: string, repo: string, branch: string) => Promise<void>;
  saveConfig: (owner: string, repo: string, config: Config) => Promise<void>;
  createPr: (
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
  ) => Promise<PullRequest>;
  confirm: (message: string) => boolean;
  alert: (message: string) => void;
  open: (url: string) => void;
}

export function useBranchServices(): BranchServices {
  const getUnmergedCommits = async (
    owner: string,
    repo: string,
    base: string,
    head: string,
  ) => {
    try {
      const res = await fetchWithAuth(
        `/api/repo/${owner}/${repo}/compare?base=${base}&head=${head}`,
      );
      if (res.ok) {
        const data = await res.json();
        return data.commits || [];
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const checkBranchExists = async (
    owner: string,
    repo: string,
    branch: string,
  ) => {
    const res = await fetchWithAuth(
      `/api/repo/${owner}/${repo}/branches/${branch}`,
    );
    return res.status !== 404;
  };

  const createBranch = async (
    owner: string,
    repo: string,
    branchName: string,
  ) => {
    const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchName }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create branch");
    }
  };

  const saveConfig = async (owner: string, repo: string, config: Config) => {
    const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/config`, {
      method: "POST",
      headers: { "Content-Type": "text/yaml" },
      body: yaml.dump(config),
    });

    if (!res.ok) {
      throw new Error("Failed to save repository config");
    }
  };

  const createPr = async (
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
  ) => {
    const res = await fetchWithAuth(`/api/repo/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        head,
        base,
        body: "Created from Staticms Branch Management",
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create PR");
    }
    return await res.json();
  };

  const confirm = (message: string) => globalThis.confirm(message);
  const alert = (message: string) => globalThis.alert(message);
  const open = (url: string) => globalThis.open(url, "_blank");

  return useMemo(() => ({
    getUnmergedCommits,
    checkBranchExists,
    createBranch,
    saveConfig,
    createPr,
    confirm,
    alert,
    open,
  }), []);
}
