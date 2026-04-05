# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EA Workbench — repo-native npm-installable local workbench for enterprise architects. BCM Studio is the first tool; AI Chat is the second. See `@PRD.md` for full product context.

## Build & Run

```bash
npm run build          # Staged 3-wave build (dependency order matters)
npm run refresh        # Clean + build + npm link (installs `eawb` globally)
npm run test           # Vitest across all packages
npm run lint           # ESLint 9 flat config
eawb doctor            # Check prerequisites (Node, Git, Copilot CLI)
eawb open              # Start server + open browser (auto-finds available port)
```

Build order is enforced in the root `build` script — leaf packages first, then mid-level, then CLI/UI. Do not use `--workspaces --if-present` for builds; it runs alphabetically and breaks DTS generation.

## Monorepo Structure

18 packages in `packages/` using npm workspaces:

- **shared-schema** — Zod schemas, path constants, API envelope (no deps)
- **tool-api** — ToolManifest, ArtifactType, ToolRegistration contracts
- **acp-core** — IACPAdapter interface, uses `@agentclientprotocol/sdk`
- **acp-copilot** — Copilot CLI adapter (spawns `copilot --acp`, stdio JSON-RPC)
- **git-abstraction** — Hidden Git service via `simple-git`
- **export-core** — IExporter interface, Markdown/HTML/SVG exporters
- **bcm-core** — BCM schemas, JSONL storage, tree ops, validation, Fastify routes
- **bcm-ai** — 7 AI action definitions with prompt templates
- **bcm-ui** — React panels (tree, hierarchy, inspector, export, AI actions)
- **chat-core** — AI Chat tool (conversations, routes)
- **chat-ui** — Chat panel React component
- **editor-core** — Markdown Editor schemas, storage, routes
- **editor-ui** — Markdown Editor React panels
- **help-core** — Help tool manifest + routes
- **help-ui** — Help React panel
- **runtime** — Fastify server, SQLite, WebSocket, tool host, AI orchestrator
- **shell-ui** — Dockview layout + Fluent UI shell (Vite app)
- **cli** — `eawb` binary, bundles shell-ui dist into `dist/public/`

Backend packages use **tsup** (ESM + DTS). UI packages use **Vite**. `bcm-ui`, `chat-ui`, `editor-ui`, and `help-ui` are source-only (consumed by shell-ui via Vite bundling).

## TypeScript Conventions

- Strict mode, ES2022 target, Node16 module resolution
- ESM throughout (`"type": "module"` in all package.json)
- Use `.js` extensions in import paths (e.g., `import { foo } from './bar.js'`)
- 2-space indentation, LF line endings
- `@typescript-eslint/no-explicit-any`: warn, `no-unused-vars`: warn with `_` prefix exception

## Adding a New Tool

Brief pattern (see `/add-tool` skill for full scaffold):

1. Create `packages/{name}-core/` — manifest, routes, registration function
2. Create `packages/{name}-ui/` (if UI needed) — source-only package, React panels
3. Register in `packages/runtime/src/server.ts` via `addToolRegistration()`
4. Add panels to `packages/shell-ui/src/layout/WorkbenchLayout.tsx` component map
5. Add panel entries to `packages/shell-ui/src/store/layout-store.ts` `ALL_PANELS`
6. Update sidebar in `Sidebar.tsx` `TOOL_PANELS` map
7. Add packages to root `tsconfig.json` references and `package.json` build script

The tool-api `ToolManifest` interface defines the contract. See `bcm-core/src/manifest.ts` and `chat-core/src/manifest.ts` as reference implementations.

## Data Format

`*.bcm.jsonl` — one JSON object per line. First line is a header (`_t: 'header'`), remaining lines are nodes. Deterministic depth-first ordering on write. Force LF via `.gitattributes`.

## ACP Integration

Uses `@agentclientprotocol/sdk` (v0.18.0+). Key patterns:

- `ClientSideConnection` constructor takes a **factory function** `(connection) => clientHandler`, not a client object
- `newSession()` requires `{ cwd, mcpServers: [] }`
- Streaming text arrives at `params.update.content.text` in `sessionUpdate`

## Commits

Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
