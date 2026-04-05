# EA Workbench

Repo-native enterprise architecture workbench. Runs locally in a browser, hides Git behind architecture-native concepts (draft, checkpoint, compare, restore), and integrates AI via GitHub Copilot CLI over the Agent Client Protocol.

## Quick Start

```bash
# Prerequisites: Node.js >= 20, Git, GitHub Copilot CLI (optional, for AI features)

# Clone and build
git clone <repo-url>
cd ea-workbench
npm install
npm run refresh     # clean + build + install globally

# Run anywhere
cd /path/to/your/project
eawb open           # initializes if needed, starts server, opens browser
```

## Commands

| Command | Description |
|---|---|
| `eawb open` | Start the workbench (auto-finds available port) |
| `eawb init` | Initialize a directory as an EA Workbench |
| `eawb doctor` | Check prerequisites (Node, Git, Copilot CLI) |
| `eawb open --port 3000` | Use a specific port |
| `eawb open --no-browser` | Start without opening the browser |

## Tools

### BCM Studio
Business Capability Modeling tool for creating hierarchical capability maps.

- Tree editor with drag-drop, rename, add child, delete
- Visual hierarchy view with zoom/pan
- Property inspector with auto-save
- AI-assisted generation (generate capabilities, expand nodes, MECE review, name normalization, merge suggestions, description enrichment, review briefs)
- Export to Markdown, HTML, SVG

### AI Chat
Conversational AI assistant powered by GitHub Copilot via ACP. Create conversations, ask questions, get architecture advice.

## Architecture

14-package TypeScript monorepo using npm workspaces:

```
packages/
  cli/              → eawb binary (npm entrypoint)
  runtime/          → Fastify server, SQLite, WebSocket, tool host
  shell-ui/         → Dockview layout + Fluent UI (React/Vite)
  shared-schema/    → Zod schemas, path constants
  tool-api/         → ToolManifest, ToolRegistration contracts
  acp-core/         → IACPAdapter interface
  acp-copilot/      → Copilot CLI adapter (@agentclientprotocol/sdk)
  git-abstraction/  → Hidden Git service (simple-git)
  export-core/      → Markdown/HTML/SVG exporters
  bcm-core/         → BCM schemas, JSONL storage, validation, API routes
  bcm-ai/           → AI action definitions + prompt templates
  bcm-ui/           → BCM Studio React panels
  chat-core/        → AI Chat conversations + API routes
  chat-ui/          → Chat React panel
```

## Data Format

Models are stored as `*.bcm.jsonl` files — one JSON object per line, human-readable, git-diffable:

```jsonl
{"_t":"header","schema_version":"1.0","kind":"capability_model","id":"...","title":"Core Banking"}
{"id":"...","name":"Payments","parent":null,"order":0,"description":"...","metadata":{}}
{"id":"...","name":"Domestic","parent":"<payments-id>","order":0,"description":"...","metadata":{}}
```

## Workbench Directory Structure

When initialized in a repo, the workbench creates:

```
repo-root/
  ea-workbench.json          # Workbench configuration
  .ea-workbench/             # Local runtime state (gitignored)
    cache/ index/ logs/
  architecture/
    bcm-studio/models/       # *.bcm.jsonl files
    decisions/ reviews/ exports/
  .github/
    copilot-instructions.md  # Auto-generated, user-editable
    agents/                  # BCM modeler, reviewer, brief writer
```

## Adding a New Tool

See the `/add-tool` skill or the "Adding a New Tool" section in CLAUDE.md. The pattern:

1. Create `packages/{name}-core/` with a `ToolManifest` and Fastify routes
2. Create `packages/{name}-ui/` with React panel components
3. Register in `runtime/src/server.ts`
4. Wire panels into `shell-ui`
5. Update build script

## AI Integration

Uses the [Agent Client Protocol](https://agentclientprotocol.com/) with GitHub Copilot CLI as the provider. The adapter spawns `copilot --acp` as a child process and communicates via NDJSON over stdio.

BCM Studio provides 7 AI actions:
- **Generate First-Level** — decompose a domain into top-level capabilities
- **Expand Node** — break a capability into sub-capabilities
- **Review MECE** — check for overlaps, gaps, and consistency
- **Normalize Names** — suggest consistent naming
- **Suggest Merges** — find capabilities to combine
- **Enrich Descriptions** — generate descriptions for undocumented capabilities
- **Generate Review Brief** — create a stakeholder review summary

## Development

```bash
npm run build       # Build all packages (dependency-ordered)
npm run test        # Run tests (Vitest)
npm run lint        # Run linter (ESLint 9)
npm run clean       # Remove all dist/ directories
npm run refresh     # Clean + build + global install
```

## Tech Stack

- **Runtime**: Node.js, Fastify, WebSocket, SQLite (better-sqlite3)
- **Frontend**: React 19, Vite, Dockview, Fluent UI v9, Zustand, TanStack Query
- **AI**: @agentclientprotocol/sdk, GitHub Copilot CLI
- **Git**: simple-git (hidden behind architecture-native concepts)
- **Build**: tsup (backend), Vite (frontend), npm workspaces
- **Validation**: Zod schemas throughout

## License

See LICENSE file.
