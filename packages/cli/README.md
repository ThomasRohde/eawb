# @trohde/eawb

**EA Workbench** — a repo-native, local-first workbench for enterprise architects. Runs in your browser, stores artifacts as git-diffable files next to your code, hides Git behind architecture-native concepts (draft → checkpoint → compare → restore), and integrates AI via GitHub Copilot CLI over the [Agent Client Protocol](https://agentclientprotocol.com/).

## Install

```bash
npm install -g @trohde/eawb
```

Requires **Node.js 20 or later**. GitHub Copilot CLI is optional but required for AI features.

## Quick start

```bash
# From any git repo (or a plain directory)
eawb doctor      # Check prerequisites
eawb open        # Initialize if needed, start server, open browser
```

The first time you run `eawb open` in a directory, it prompts to initialize. After that, it just boots the workbench and opens your browser on the first available port.

## Commands

| Command                  | Description                                     |
| ------------------------ | ----------------------------------------------- |
| `eawb open`              | Start the workbench (auto-finds available port) |
| `eawb open --port 3000`  | Use a specific port                             |
| `eawb open --no-browser` | Start without opening the browser               |
| `eawb init`              | Initialize a directory as an EA Workbench       |
| `eawb doctor`            | Check prerequisites (Node, Git, Copilot CLI)    |

## What's inside

The workbench ships a set of **tools** that share one shell, one git-aware runtime, and one AI orchestrator:

- **BCM Studio** — Business Capability Modeling. Tree editor, hierarchy view, capability maps, property inspector with auto-save, Markdown/HTML/SVG export, and seven AI actions (generate first-level, expand node, MECE review, normalize names, suggest merges, enrich descriptions, review briefs).
- **AI Chat** — Conversational assistant powered by GitHub Copilot via ACP. Create conversations, get architecture advice, keep sessions scoped to your repo.
- **Markdown Editor** — WYSIWYG Markdown authoring for architecture docs, stored under `architecture/markdown-editor/docs/`.
- **Architecture Records** — Lightweight decision records and reviews.
- **JSON Forms** — Schema-driven form designer and filler.
- **Help** — Built-in documentation browser.

## Workbench layout

When you run `eawb open` in a repo, it creates:

```
repo-root/
  ea-workbench.json          # Workbench configuration
  .ea-workbench/             # Local runtime state (gitignored)
  architecture/
    bcm-studio/models/       # *.bcm.jsonl files (one JSON object per line)
    markdown-editor/docs/    # *.md documents
    decisions/               # Architecture records
    reviews/
    exports/
  .github/
    copilot-instructions.md  # Auto-generated, user-editable
    agents/                  # Tool-specific agent prompts
```

All artifacts live as plain files next to your code so they diff, review, and merge like any other source.

## Data format

BCM models are stored as `*.bcm.jsonl` — one JSON object per line, deterministic ordering:

```jsonl
{"_t":"header","schema_version":"1.0","kind":"capability_model","id":"...","title":"Core Banking"}
{"id":"...","name":"Payments","parent":null,"order":0,"description":"...","metadata":{}}
{"id":"...","name":"Domestic","parent":"<payments-id>","order":0}
```

Human-readable, git-diffable, and trivially scriptable.

## AI integration

Uses the [Agent Client Protocol](https://agentclientprotocol.com/) SDK to talk to GitHub Copilot CLI. The adapter spawns `copilot --acp` as a child process and streams over stdio. If you don't have Copilot CLI installed, AI features are disabled but everything else works.

## Source

Full source, issue tracker, and development docs at [github.com/ThomasRohde/eawb](https://github.com/ThomasRohde/eawb).

## License

MIT
