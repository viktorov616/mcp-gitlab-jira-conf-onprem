/**
 * Shared types for GitLab integration
 */

export interface GitLabConfig {
  url: string;
  accessToken: string;
}

export interface GitLabPosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  position_type: 'text';
  old_path: string;
  new_path: string;
  new_line?: number;
  old_line?: number;
}

export interface MergeRequestFileDiff {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'renamed' | 'modified';
  diff: string;
}

export interface GitLabMRDetails {
  projectPath: string;
  mrIid: string;
  projectId: number;
  title: string;
  authorName: string;
  webUrl: string;
  sourceBranch: string;
  targetBranch: string;
  base_sha: string;
  start_sha: string;
  head_sha: string;
  files: MergeRequestFileDiff[];
  approvals?: {
    approved_by: Array<{ user: { name: string; username: string } }>;
    approvals_left: number;
    approvals_required: number;
  };
}

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path_with_namespace: string;
  last_activity_at: string;
}

export interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  author: {
    name: string;
    username: string;
  };
  updated_at: string;
  web_url: string;
  project_name?: string;
}

export interface GitLabRelease {
  tag_name: string;
  name: string;
  description: string;
  created_at: string;
  released_at: string;
  // Add other relevant fields as needed
}

export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

export function parseGitLabMergeRequestUrl(url: string): {
  projectId: number;
  mrIid: number;
} {
  const match = url.match(
    /\/(?<projectId>[^/]+)\/(?:-\/)?merge_requests\/(?<mrIid>\d+)$/,
  );
  if (!match || !match.groups) {
    throw new Error(`Invalid GitLab Merge Request URL: ${url}`);
  }

  // For self-managed instances, the projectId can be a path (e.g., group/subgroup/project)
  // We need to convert this path to a project ID. This will be handled by the gitlabOnPremMcp.ts
  // For now, we'll just return the path as projectId and the mrIid.
  // The actual project ID resolution will happen in gitlabOnPremMcp.ts
  const projectId = match.groups.projectId;
  const mrIid = parseInt(match.groups.mrIid, 10);

  if (isNaN(mrIid)) {
    throw new Error(`Could not parse MR IID from URL: ${url}`);
  }

  // Return projectId as string for now, it will be resolved to number in gitlabOnPremMcp.ts
  return { projectId: projectId as any, mrIid };
}
