---
title: Technical Architecture
category: Reference
order: 41
---

# Technical Architecture

This page describes the technical architecture of EA Workbench itself — useful for contributors, integrators, and anyone who wants to understand how the system works under the hood.

## High-Level Architecture

EA Workbench follows a **local-first, tool-based architecture**:

```
┌─────────────────────────────────────────────────┐
│                   Browser UI                     │
│  ┌───────────┐ ┌───────────┐ ┌───────────────┐ │
│  │  Shell UI  │ │  BCM UI   │ │   Chat UI     │ │
│  │ (Dockview) │ │  (React)  │ │   (React)     │ │
│  └─────┬─────┘ └─────┬─────┘ └───────┬───────┘ │
│        │              │               │          │
│        └──────────────┼───────────────┘          │
│                       │ HTTP + WebSocket         │
└───────────────────────┼─────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────┐
│                  Local Server                    │
│  ┌─────────┐ ┌───────┴──────┐ ┌──────────────┐ │
│  │ Runtime  │ │  Tool Host   │ │ AI Orchestr. │ │
│  │(Fastify) │ │  (Registry)  │ │   (ACP)      │ │
│  └────┬────┘ └──────────────┘ └──────────────┘ │
│       │                                         │
│  ┌────┴────┐ ┌──────────────┐ ┌──────────────┐ │
│  │ SQLite  │ │ Git Abstrac. │ │ File System  │ │
│  └─────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

| Technology         | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| **React 19**       | UI framework                                             |
| **Fluent UI v9**   | Microsoft's design system (buttons, inputs, trees, etc.) |
| **Dockview**       | Docking panel layout system                              |
| **Zustand**        | Lightweight state management                             |
| **TanStack Query** | Server state and caching                                 |
| **Vite**           | Frontend build tool and dev server                       |

### Backend

| Technology                 | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| **Fastify 5**              | HTTP server framework                          |
| **SQLite** (`node:sqlite`) | Local database for metadata                    |
| **simple-git**             | Git operations abstraction                     |
| **WebSocket**              | Real-time updates (streaming AI, file changes) |

### Build System

| Technology         | Purpose                                  |
| ------------------ | ---------------------------------------- |
| **npm workspaces** | Monorepo package management              |
| **tsup**           | TypeScript bundling for backend packages |
| **Vite**           | Frontend bundling                        |
| **TypeScript 5.7** | Type checking (strict mode)              |
| **ESLint 9**       | Code quality (flat config)               |

## Monorepo Structure

The project is organized as a monorepo with 14+ packages:

### Foundation Layer

- **shared-schema** — Zod schemas, API envelope types, path constants
- **tool-api** — ToolManifest interface, ArtifactType, ToolRegistration contracts

### Integration Layer

- **acp-core** — IACPAdapter interface for AI providers
- **acp-copilot** — GitHub Copilot CLI adapter (stdio JSON-RPC)
- **git-abstraction** — Git operations via simple-git
- **export-core** — IExporter interface with Markdown/HTML/SVG implementations

### Tool Layer (Core)

- **bcm-core** — BCM schemas, JSONL storage, tree operations, validation, routes
- **bcm-ai** — 7 AI action definitions with prompt templates
- **chat-core** — Conversational AI tool with conversation management
- **editor-core** — Markdown document management
- **help-core** — Help content loading and serving

### Tool Layer (UI)

- **bcm-ui** — React panels for BCM Studio
- **chat-ui** — Chat panel React component
- **editor-ui** — Markdown editor panel
- **help-ui** — Help browser panel

### Host Layer

- **runtime** — Fastify server, SQLite, WebSocket, tool host, AI orchestrator
- **shell-ui** — Dockview layout shell, Fluent UI chrome, Vite app
- **cli** — `eawb` binary, bundles shell-ui dist

## Tool System

EA Workbench is built around a **pluggable tool system**:

### ToolManifest

Every tool defines a manifest describing its:

- **Identity** — ID, name, version, description
- **Artifact types** — File patterns it handles
- **Commands** — Operations it exposes
- **UI contributions** — Panels it provides
- **Directory contract** — Filesystem paths it needs

### Tool Registration

Tools register with the runtime's **tool host**, which:

1. Collects registrations at startup
2. Registers manifests in the tool registry
3. Mounts routes at `/api/tools/{tool-id}/`
4. Broadcasts registration events via WebSocket

### Adding New Tools

The architecture is designed for extensibility. New tools follow the pattern:

1. Create a `{name}-core` package with manifest and routes
2. Create a `{name}-ui` package with React panels
3. Register in the runtime
4. Add panels to the shell-ui layout

## Communication

### REST API

All tool data flows through REST endpoints under `/api/`:

- `/api/health` — Server health check
- `/api/workspace` — Workspace info and initialization
- `/api/tools` — Tool registry queries
- `/api/tools/{id}/*` — Tool-specific routes
- `/api/export/*` — Export operations
- `/api/ai/*` — AI orchestrator endpoints

### WebSocket

Real-time events flow through a WebSocket connection at `/ws`:

- **AI streaming** — Chat responses stream chunk-by-chunk
- **Tool events** — Registration, file changes
- **Checkpoint events** — Auto-commit notifications

## Data Flow

```
User Action → React Component → REST API → Fastify Route
    → Business Logic → File System / SQLite / Git
    → Response → React Query Cache → UI Update
```

For AI operations:

```
User Prompt → Chat Route → AI Orchestrator → ACP Adapter
    → Copilot CLI (stdio) → AI Response (streamed)
    → WebSocket Chunks → UI Streaming Display
```
