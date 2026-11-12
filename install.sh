#!/usr/bin/env bash
# Install mcp-gitlab-jira-conf-onprem for the current user (no sudo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${HOME}/.local/bin"
WRAPPER="${BIN_DIR}/mcp-gitlab-jira-conf-onprem"

cd "$ROOT"

echo "==> npm install"
npm install

echo "==> build"
npm run build

echo "==> install launcher → ${WRAPPER}"
mkdir -p "${BIN_DIR}"
cat > "${WRAPPER}" <<EOF
#!/usr/bin/env bash
exec node "${ROOT}/dist/index.js" "\$@"
EOF
chmod +x "${WRAPPER}"

echo
echo "OK: ${WRAPPER}"
echo
echo "Add to PATH if needed:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo
echo "opencode: \"command\": [\"mcp-gitlab-jira-conf-onprem\"]"
echo
echo "Cursor ~/.cursor/mcp.json:"
echo "  {\"mcpServers\":{\"gitlab-jira-conf\":{\"command\":\"${WRAPPER}\",\"args\":[]}}}"
echo
echo "Or copy examples/mcp.json and fill env tokens."
echo "Then fully restart the MCP client."
echo
echo "Verify PAT:"
echo '  curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ATLASSIAN_API_TOKEN" "$ATLASSIAN_SITE_NAME/rest/api/2/myself"'
