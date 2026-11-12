# mcp-gitlab-jira-conf-onprem

MCP-сервер для GitLab, Jira Server/DC и Confluence Server/DC.

## 1. Установка

Нужен Node.js 18+.

```bash
git clone https://github.com/viktorov616/mcp-gitlab-jira-conf-onprem.git ~/tools/mcp-gitlab-jira-conf-onprem
cd ~/tools/mcp-gitlab-jira-conf-onprem
./install.sh
```

Скрипт выполнит `npm install`, `npm run build` и создаст команду `~/.local/bin/mcp-gitlab-jira-conf-onprem`. Проверьте, что `~/.local/bin` есть в `PATH`:

```bash
which mcp-gitlab-jira-conf-onprem
```

Если пусто — добавьте в `~/.bashrc` (или `~/.zshrc`) строку `export PATH="$HOME/.local/bin:$PATH"`.

## 2. Токены

Каждый сервис настраивается отдельно — достаточно тех, что нужны.

| Сервис | Где создать | Проверка (ожидаем `200`) |
|---|---|---|
| GitLab | Preferences → Access Tokens, scope `api` | `curl -s -o /dev/null -w "%{http_code}\n" -H "Private-Token: $GITLAB_ACCESS_TOKEN" "$GITLAB_URL/api/v4/user"` |
| Jira | Профиль → Personal Access Tokens | `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ATLASSIAN_API_TOKEN" "$ATLASSIAN_SITE_NAME/rest/api/2/myself"` |
| Confluence | Профиль → Settings → Personal Access Tokens | `curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CONFLUENCE_API_TOKEN" "$CONFLUENCE_URL/rest/api/user/current"` |

Токены Jira и Confluence — разные. Cloud-токены (`ATATT…`) не подойдут.

## 3. Переменные окружения

| Переменная | Пример |
|---|---|
| `GITLAB_URL` | `https://gitlab.example.com` |
| `GITLAB_ACCESS_TOKEN` | `glpat-…` |
| `ATLASSIAN_SITE_NAME` | `https://jira.example.com` — полный URL |
| `ATLASSIAN_API_TOKEN` | PAT из Jira |
| `CONFLUENCE_URL` | `https://wiki.example.com` или `https://example.com/confluence` — вместе с context path |
| `CONFLUENCE_API_TOKEN` | PAT из Confluence |
| `CONFLUENCE_USERNAME` | Только для Confluence < 7.9 (нет PAT): логин, а в `CONFLUENCE_API_TOKEN` — пароль |
| `MCP_READ_ONLY` | `true` — отключить инструменты, которые что-то меняют (комментарии, переходы, ветки, пайплайны) |

Не задали переменные сервиса — его инструменты не появятся. Чем меньше инструментов, тем меньше контекста модели они занимают.

## 4. Подключение

Во всех клиентах сервер запускается командой `mcp-gitlab-jira-conf-onprem`. Если клиент её не находит (GUI-приложения часто не видят `~/.local/bin`), укажите абсолютный путь — `/home/YOU/.local/bin/mcp-gitlab-jira-conf-onprem`.

### opencode — `~/.config/opencode/opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "gitlab-jira-conf": {
      "type": "local",
      "command": ["mcp-gitlab-jira-conf-onprem"],
      "enabled": true,
      "environment": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_ACCESS_TOKEN": "REPLACE_ME",
        "ATLASSIAN_SITE_NAME": "https://jira.example.com",
        "ATLASSIAN_API_TOKEN": "REPLACE_ME",
        "CONFLUENCE_URL": "https://wiki.example.com",
        "CONFLUENCE_API_TOKEN": "REPLACE_ME"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add gitlab-jira-conf \
  -e GITLAB_URL=https://gitlab.example.com \
  -e GITLAB_ACCESS_TOKEN=REPLACE_ME \
  -e ATLASSIAN_SITE_NAME=https://jira.example.com \
  -e ATLASSIAN_API_TOKEN=REPLACE_ME \
  -e CONFLUENCE_URL=https://wiki.example.com \
  -e CONFLUENCE_API_TOKEN=REPLACE_ME \
  -- mcp-gitlab-jira-conf-onprem
```

### Cursor — `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "gitlab-jira-conf": {
      "command": "mcp-gitlab-jira-conf-onprem",
      "args": [],
      "env": {
        "GITLAB_URL": "https://gitlab.example.com",
        "GITLAB_ACCESS_TOKEN": "REPLACE_ME",
        "ATLASSIAN_SITE_NAME": "https://jira.example.com",
        "ATLASSIAN_API_TOKEN": "REPLACE_ME",
        "CONFLUENCE_URL": "https://wiki.example.com",
        "CONFLUENCE_API_TOKEN": "REPLACE_ME"
      }
    }
  }
}
```

После изменения конфига полностью перезапустите Cursor — Reload Window часто оставляет старый процесс.

### Переход с `mcp-gitlab-jira-onprem`

Если раньше подключали старый форк командой `mcp-gitlab-jira-onprem`, замените её в конфиге на `mcp-gitlab-jira-conf-onprem` и добавьте переменные `CONFLUENCE_*`. Старую команду можно удалить: `rm ~/.local/bin/mcp-gitlab-jira-onprem`.

## 5. Использование

Попросите агента, например: «Возьми задачу PROJ-123 вместе с описанием из Confluence». Инструмент `jira_get_ticket_with_confluence_pages` вернёт тикет и текст всех связанных страниц — из блока «Confluence pages» и из ссылок в описании.

## Обновление

```bash
cd ~/tools/mcp-gitlab-jira-conf-onprem
git pull
./install.sh
```

Затем перезапустите MCP-клиент.

## Если не работает

- `curl` из раздела 2 должен возвращать `200` в том же окружении, где запущен клиент.
- Сервисы доступны только из корпоративной сети — при split-tunnel VPN добавьте их домены в direct/bypass.
- `command not found` / сервер не стартует — проверьте `which mcp-gitlab-jira-conf-onprem` или укажите в конфиге абсолютный путь.
- Логи сервера пишутся в stderr: при старте видно, какие сервисы инициализированы.
