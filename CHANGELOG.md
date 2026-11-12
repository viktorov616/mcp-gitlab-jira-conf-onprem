# Changelog

## 0.3.0 — Confluence Server/Data Center

### Added

- Confluence Server/DC support: `CONFLUENCE_URL`, `CONFLUENCE_API_TOKEN` (Bearer PAT),
  optional `CONFLUENCE_USERNAME` for Basic auth on Confluence < 7.9.
- `jira_get_ticket_with_confluence_pages`: a ticket plus Markdown content of all linked
  Confluence pages (remote links and description URLs), with per-page errors.
- `jira_get_ticket_remote_links`, `confluence_get_page`, `confluence_search`,
  `confluence_get_child_pages`.
- Page URL formats: `pageId=`, `spaceKey=&title=`, `/display/`, `/spaces/…/pages/<id>`, `/x/<tiny>`.

- `MCP_READ_ONLY=true` hides and rejects tools that modify data.

### Changed

- Package / binary renamed to `mcp-gitlab-jira-conf-onprem` (was `mcp-gitlab-jira-onprem`), so it can be
  installed alongside the previous fork. Re-run `./install.sh` and update `command` in the MCP client config.
- `gitlab_get_merge_request_details` returns each file diff once (`files[]`), with old/new
  line numbers per line, instead of `fileDiffs` + `diffForPrompt` + `parsedDiffs`
  (~5× smaller). Removed always-empty `discussions`, `existingFeedback`, `fileContents`.
- Tool results are compact JSON (no indentation).
- `jira_get_ticket_details` no longer requests unused expansions (changelog, editmeta, …).
- Jest uses `src/tsconfig.json`.

## 0.2.0 — on-prem fork

Based on `mcp-gitlab-jira@0.1.9`.

### Fixed (Jira Server / Data Center)

- **Auth**: use Bearer Personal Access Token instead of Cloud Basic `email:apiToken`
  (`jira.js` `authentication.oauth2.accessToken`).
- **API version**: use `Version2Client` instead of `Version3Client` (Cloud API v3
  returns unusable/HTML payloads on many Server/DC instances).
- **Agile REST**: send `Authorization: Bearer <PAT>` instead of Basic.

### Changed

- Package / binary renamed to `mcp-gitlab-jira-onprem`.
- `ATLASSIAN_USER_EMAIL` is optional (not used for auth on Server/DC).
- `ATLASSIAN_SITE_NAME` must be a full base URL (`https://jira.example.com`).

### Unchanged

- GitLab tools and tool names (Cursor configs stay compatible if command is updated).
