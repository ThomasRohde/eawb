---
title: ACP Integration
category: Reference
order: 43
---

# ACP Integration

EA Workbench uses the **Agent Client Protocol (ACP)** to communicate with AI providers. ACP is an open protocol for connecting AI agents to client applications.

## What is ACP?

ACP (Agent Client Protocol) defines a standard way for applications to:

- Connect to AI agents
- Send prompts and receive responses
- Manage multi-turn conversational sessions
- Stream responses in real time

Think of it as a universal adapter between your application and any AI provider that implements the protocol.

## How EA Workbench Uses ACP

### Architecture

```
EA Workbench → ACP Adapter → AI Provider
                  ↑
          acp-copilot package
      (GitHub Copilot CLI adapter)
```

The workbench communicates with AI through an adapter layer:

1. **acp-core** defines the `IACPAdapter` interface
2. **acp-copilot** implements the adapter for GitHub Copilot CLI
3. The **AI Orchestrator** (in runtime) coordinates AI requests

### Communication Flow

1. User triggers an AI action (chat message, BCM AI action)
2. The AI Orchestrator prepares the prompt
3. The ACP adapter spawns a Copilot CLI process
4. Communication happens over stdio using JSON-RPC
5. Responses stream back through WebSocket to the UI

## GitHub Copilot Integration

### Setup

EA Workbench discovers Copilot in two ways (tried in order):

1. **Standalone `copilot` CLI** — if `copilot --version` succeeds, it is used directly.
2. **Language server via npx** — falls back to `npx -y @github/copilot-language-server`.

Install one of these:

```bash
# Option A: install the language server globally
npm install -g @github/copilot-language-server

# Option B: let npx fetch it on demand (no install needed)
# EA Workbench will run: npx -y @github/copilot-language-server
```

Authenticate with GitHub (required for Copilot access):

```bash
gh auth login
```

Then verify:

```bash
eawb doctor
```

> **Note:** `gh extension install github/gh-copilot` installs the GitHub CLI extension, which is _not_ the same binary EA Workbench looks for. If `eawb doctor` reports Copilot as unavailable, make sure one of the two paths above is on your `PATH`.

### Session Management

ACP sessions are persistent within a conversation:

- **New conversation** — Creates a new ACP session
- **Follow-up messages** — Reuse the same session (AI remembers context)
- **Delete conversation** — Destroys the ACP session

This means the AI retains conversational context across multiple messages without resending the entire history.

### Streaming

Responses stream in real time:

- The ACP adapter emits text chunks as they arrive
- Chunks flow through WebSocket to the browser
- The UI renders text progressively
- Users see responses appearing in real time

## Technical Details

### ACP SDK

EA Workbench uses `@agentclientprotocol/sdk` (v0.18.0+):

- `ClientSideConnection` constructor takes a factory function `(connection) => clientHandler`
- `newSession()` requires `{ cwd, mcpServers: [] }`
- Streaming text arrives at `params.update.content.text` in `sessionUpdate`

### Error Handling

If the AI provider is unavailable:

- AI Actions in BCM Studio gracefully degrade with an error message
- AI Chat shows "AI provider not configured"
- The workbench remains fully functional for non-AI features

## Future Providers

The ACP adapter pattern means EA Workbench can support additional AI providers in the future. Any provider implementing the ACP protocol can be plugged in through a new adapter package.
