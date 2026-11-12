# Миграция со старых хаков

Если раньше правили `/usr/local/lib/node_modules/mcp-gitlab-jira` или
держали `~/.local/share/mcp-gitlab-jira-bearer`, перейдите на этот пакет.

## 1. Поставить новый пакет

```bash
cd /path/to/mcp-gitlab-jira-conf-onprem
./install.sh
```

## 2. Обновить `~/.cursor/mcp.json`

`command` должен быть `mcp-gitlab-jira-conf-onprem` или абсолютный путь из вывода `install.sh`.
Не используйте `mcp-gitlab-jira` (upstream) и `mcp-gitlab-jira-onprem` (предыдущий форк без Confluence).

## 3. Убрать старое (опционально)

```bash
# старые процессы
pkill -f '/usr/local/bin/mcp-gitlab-jira' || true
pkill -f 'mcp-gitlab-jira-bearer' || true

# локальный хак-копии
rm -rf ~/.local/share/mcp-gitlab-jira-bearer
rm -f ~/.local/bin/mcp-gitlab-jira-bearer
rm -f ~/.local/bin/mcp-gitlab-jira-onprem   # предыдущий форк
rm -f ~/.local/share/jira.service.js.patched

# глобальный npm (если больше не нужен upstream)
# sudo npm uninstall -g mcp-gitlab-jira
```

Патч в `/usr/local/.../jira.service.js` можно не трогать: Cursor больше
не должен его вызывать. При желании переустановите upstream:

```bash
sudo npm uninstall -g mcp-gitlab-jira
# или
sudo npm i -g mcp-gitlab-jira@0.1.9   # чистая версия без патча
```

## 4. Полный рестарт Cursor

Reload Window недостаточно — закройте Cursor и откройте снова, чтобы
подтянулись env и новый бинарник.
