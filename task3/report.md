# Task 3 — Telegram Learning Bot: Development Report

## Overview

Built a Telegram bot on n8n that lets users submit URLs to learn from (Teacher AI) and quiz themselves on saved material (Examiner AI). Three commands: `/start`, `/learn <url>`, `/quiz`. Data persists across sessions per user.

---

## Tools & Techniques

| Tool / Technique | Role |
|---|---|
| **n8n** | Workflow automation runtime — all bot logic lives as a single workflow |
| **Docker + docker-compose** | Local n8n instance with persistent volume (`n8n_data`) |
| **ngrok** | Exposed local port 5678 as a public HTTPS URL so Telegram could reach the webhook |
| **Telegram Bot API** | Webhook mode; inline keyboards via raw HTTP Request nodes (not n8n's Telegram node) |
| **OpenRouter** | OpenAI-compatible API proxy — drop-in replacement for OpenAI with `openai/gpt-4o-mini` |
| **n8n `$getWorkflowStaticData('global')`** | Cross-execution persistence in n8n's SQLite without an external database |
| **`workflow.json` as source of truth** | Entire workflow stored as JSON in git; n8n UI used only for credentials and monitoring |
| **`sync.sh` + `fswatch`** | File watcher that pushed `workflow.json` to the n8n REST API on every save, then deactivated/activated the workflow to re-register the Telegram webhook |
| **Coolify** | Self-hosted n8n deployment target for the final running instance |
| **jq** | Stripped read-only fields (`active`, `versionId`, `staticData`, etc.) from the workflow before every API push |

---

## Development Flow

1. **Local first** — ran n8n in Docker, edited `workflow.json` in the IDE
2. **Auto-sync** — `./sync.sh <workflow-id>` watched for file changes and pushed automatically
3. **ngrok for webhooks** — Telegram requires HTTPS; ngrok provided that without any server setup
4. **Test in Telegram** — each code change was live within seconds of saving
5. **Deploy** — imported final `workflow.json` into self-hosted n8n on Coolify; recreated credentials in the UI

---

## What Worked Well

**sync.sh pipeline** — editing a JSON file and seeing the bot respond 5 seconds later made iteration very fast. Treating the workflow as code (git-tracked, diffable) rather than a UI-only artifact was the right call from the start.

**OpenRouter as drop-in** — swapping from OpenAI to OpenRouter required only changing the base URL and credential. The `openai/gpt-4o-mini` model was fast and cheap for both the Teacher and Examiner prompts.

**`$getWorkflowStaticData('global')`** — gave full persistence without any external database. Materials and quiz sessions survived workflow updates, container restarts, and redeployments.

**answerCallbackQuery before OpenAI** — Telegram times out the loading spinner after 10 seconds. Sending the callback acknowledgement as the first node in the quiz chain (before the OpenAI call) prevented the spinner from expiring mid-request.

**Meta tag fallback for JS-rendered pages** — when raw HTML body text was under 100 characters (React/Next.js shell pages), the Strip HTML node fell back to extracting `<title>`, `og:title`, and `og:description`. This made `/learn` work on personal sites and SPAs that would otherwise fail silently.

**Series chaining for message order** — n8n's "parallel" branches are actually sequential in an unpredictable order. Chaining the "thinking" message node directly before the slow OpenAI node (in series) was the only reliable way to guarantee it sent first.

---

## What Did Not Work

**Shared global knowledge store** — initially all users shared one flat `staticData.materials` object. Any user's `/quiz` showed every material ever submitted by anyone. Fixed by namespacing under `staticData.users[chatId]`. The security implication is that `chatId` is the only isolation boundary — any user who knows another user's Telegram chat ID could theoretically be impersonated at the n8n staticData level, since there is no authentication layer on top. Acceptable for a demo; not for production.

**Parallel branch ordering** — assumed n8n would fire branches in array order. It does not. The "Quiz incoming!" message was arriving 8 seconds *after* the first question because n8n had scheduled it last. Moved to series execution.

**Webhook secret after every API push** — every `PUT /api/v1/workflows/:id` generates a new webhook secret internally. The Telegram webhook still pointed at the old secret, causing every subsequent message to return 403. Required adding a deactivate → activate cycle to `sync.sh` after each successful push.

**`$env` access blocked by default** — n8n blocks environment variable access in code/expression nodes unless `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is set. Took a full debug cycle to discover this; added the flag to `docker-compose.yml` and the Coolify env config.

**OpenAI JSON wrapped in code fences** — the model occasionally returned ` ```json ... ``` ` instead of raw JSON. Added a strip step before `JSON.parse` in every node that consumes AI output.

**Webhook 403 after manual `setWebhook`** — tried to register the Telegram webhook manually via the Bot API. n8n uses a secret token it generates itself; manually registered webhooks bypass this and always return 403. Only n8n's own Publish (activate) flow registers the correct secret.

---

## Notable Decisions

**No database** — `$getWorkflowStaticData` was sufficient for the scope. Adding PostgreSQL or Redis would have been over-engineering for a single-bot prototype.

**HTTP Request nodes for inline keyboards** — n8n's built-in Telegram node cannot send dynamic inline keyboards. All keyboard messages use raw `POST api.telegram.org/bot.../sendMessage` nodes with the keyboard built in a preceding Code node.

**`staticData` stripped from sync pushes** — early pushes included `"staticData": null` in the PUT body, which wiped all saved materials on every code change. Fixed by adding `staticData` to the `jq del()` filter in `sync.sh`. This was the most disruptive bug during development.

**Credential IDs hardcoded in workflow.json** — n8n credential references are UUIDs local to each instance. The `workflow.json` contains the local dev credential IDs; on import to a new instance these show as broken and must be remapped manually. A cleaner approach would be placeholder IDs with a setup script, but that was out of scope.
