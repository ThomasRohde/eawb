---
title: Getting Started
category: Getting Started
order: 1
---

# Getting Started with EA Workbench

EA Workbench is a **repo-native, npm-installable local workbench** for enterprise architects. It runs entirely on your machine, stores all data as plain files inside your Git repository, and provides a rich browser-based UI for managing enterprise architecture artifacts.

## What is EA Workbench?

EA Workbench brings enterprise architecture tooling directly into your development workflow:

- **Repo-native** — All artifacts (models, documents, decisions) live as version-controlled files in your Git repository. No external databases, no cloud lock-in.
- **Local-first** — The server runs on `localhost`. Your data never leaves your machine unless you push it to a remote.
- **Tool-based** — The workbench hosts multiple tools (BCM Studio, AI Chat, Markdown Editor, and more) in a flexible dockable panel layout.
- **AI-powered** — Built-in AI capabilities help you generate, refine, and analyze architecture artifacts using GitHub Copilot or other ACP-compatible providers.

## Quick Start

### 1. Install

```bash
npm install -g ea-workbench
```

Or clone the repository and build from source:

```bash
git clone <repo-url>
cd ea-workbench
npm install
npm run refresh    # Builds all packages and links the CLI globally
```

### 2. Check Prerequisites

```bash
eawb doctor
```

This verifies that Node.js (v20+), Git, and optionally GitHub Copilot CLI are available on your system.

### 3. Initialize a Workspace

Navigate to your Git repository and initialize:

```bash
cd /path/to/your/repo
eawb init
```

This creates the `.eawb/` configuration directory and sets up the default folder structure for architecture artifacts.

### 4. Launch the Workbench

```bash
eawb open
```

This starts the local server, finds an available port, and opens the workbench in your default browser. You'll see the main workspace with BCM Studio panels ready to use.

## What's Next?

- **[Workspace Setup](workspace-setup)** — Learn about workspace structure and configuration
- **[BCM Studio Overview](bcm-overview)** — Start building Business Capability Models
- **[AI Chat](ai-chat)** — Have conversations with AI about your architecture
- **[Layout Customization](layout-customization)** — Arrange panels to suit your workflow
