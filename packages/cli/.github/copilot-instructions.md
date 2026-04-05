# EA Workbench — Copilot Instructions

This repository uses EA Workbench, a repo-native enterprise architecture workbench.

## Architecture artifacts

Architecture artifacts are stored under `architecture/` in structured formats:
- `architecture/bcm-studio/models/*.bcm.jsonl` — Business Capability Models (JSONL, one node per line)
- `architecture/decisions/*.md` — Architecture Decision Records
- `architecture/reviews/*.md` — Review briefs

## Conventions

- BCM model files use JSONL format with a header line followed by node lines
- Each node has: id (UUID), name, parent (UUID or null), order, description, metadata
- Models follow MECE principles (Mutually Exclusive, Collectively Exhaustive)
- Use architecture-first terminology: capabilities, models, checkpoints (not commits)
