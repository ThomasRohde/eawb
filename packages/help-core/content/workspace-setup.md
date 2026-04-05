---
title: Workspace Setup
category: Getting Started
order: 3
---

# Workspace Setup

A **workspace** is any Git repository where EA Workbench has been initialized. All architecture artifacts are stored as plain files within the repository, fully version-controlled alongside your code.

## Initializing a Workspace

Navigate to a Git repository and run:

```bash
cd /path/to/your/repo
eawb init
```

This creates the following structure:

```
your-repo/
├── .eawb/                          # Workbench configuration
│   └── config.json                 # Workspace settings
├── architecture/                   # Architecture artifacts root
│   └── bcm-studio/
│       └── models/                 # BCM model files (*.bcm.jsonl)
└── ... (your existing files)
```

## Workspace Configuration

The `.eawb/config.json` file stores workspace settings:

```json
{
  "name": "My Architecture Workspace",
  "version": "0.1.0"
}
```

The workspace name appears in the sidebar header.

## Directory Structure

EA Workbench uses a convention-based directory structure under `architecture/`:

| Path                              | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `architecture/bcm-studio/models/` | Business Capability Model files (`*.bcm.jsonl`) |
| `architecture/documents/`         | Markdown documents created in the Editor        |

Each tool declares its own **directory contract** specifying which directories it needs. The workbench creates these directories during initialization.

## Data Format

### BCM Models (`.bcm.jsonl`)

BCM models use the JSONL (JSON Lines) format — one JSON object per line:

- **Line 1**: Header object with `_t: 'header'` containing model metadata
- **Remaining lines**: Node objects representing business capabilities

This format is Git-friendly (line-based diffs), human-readable, and efficient for streaming reads.

### Documents

Markdown documents are stored as standard `.md` files in `architecture/documents/`.

## Version Control Integration

Because all data is plain files in your Git repository:

- **Every change is tracked** via Git history
- **Branching** lets you explore alternative architectures
- **Collaboration** works through standard Git workflows (PRs, reviews)
- **Auto-checkpointing** creates commits automatically as you work (configurable)

## Opening an Existing Workspace

If a workspace has already been initialized, just run:

```bash
cd /path/to/your/repo
eawb open
```

The workbench detects the `.eawb/` directory and loads the workspace.

## Multiple Workspaces

You can have as many workspaces as you have Git repositories. Each one is independent. The `eawb open` command always operates on the current directory's repository.
