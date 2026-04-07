---
title: Git Workflows
category: Guides
order: 35
---

# Git Workflows for Architecture

Because EA Workbench stores all artifacts in Git, you can apply standard software development workflows to your architecture practice. This guide covers practical Git workflows tailored for enterprise architecture teams.

## Solo Architect Workflow

The simplest workflow for a single architect:

```
main ─── o ─── o ─── o ─── o ─── o
          ↑     ↑     ↑     ↑     ↑
        auto-checkpoint commits
```

1. Work directly on `main`
2. Let auto-checkpointing create commits as you edit
3. Push regularly to a remote for backup
4. Tag milestones: `git tag v1.0-baseline`

## Team Workflow (Feature Branches)

For architecture teams:

```
main ─────────── o ──────────── o ────── o
                  \            /          \
feature/customer   o ── o ── o    feature/it  ...
```

### Steps

1. **Create a branch** for each modeling initiative:

   ```bash
   git checkout -b feature/customer-domain-redesign
   ```

2. **Make changes** in the workbench — edits are auto-committed

3. **Push and create a PR**:

   ```bash
   git push -u origin feature/customer-domain-redesign
   ```

4. **Review** — Team members review the model changes in the PR diff

5. **Merge** — Once approved, merge to main

### Branch Naming Conventions

| Pattern          | Use Case                                    |
| ---------------- | ------------------------------------------- |
| `feature/xxx`    | New capability areas or major restructuring |
| `refactor/xxx`   | Reorganizing existing capabilities          |
| `assessment/xxx` | Adding assessment data (maturity, health)   |
| `proposal/xxx`   | Proposed changes for discussion             |

## Architecture Review Workflow

Use pull requests as architecture review gates:

1. **Architect** creates a branch and makes changes
2. **Architect** opens a PR with a description of the changes and rationale
3. **Reviewers** examine the model diff
4. **Discussion** happens in PR comments
5. **Approval** — Merge after consensus

### Writing Good PR Descriptions for Model Changes

```markdown
## Changes

- Decomposed "Customer Management" into 5 sub-capabilities
- Added "Digital Channel Management" under Operations
- Removed redundant "Client Services" (merged into Customer Support)

## Rationale

Aligned with Q3 strategy document (link). Customer domain was too coarse
for investment planning.

## Impact

- Affects downstream application mapping
- Requires review from Customer Domain team
```

## Comparing Architectures (Branching for What-If)

Branches are powerful for exploring alternatives:

```bash
# Create two alternative decompositions
git checkout -b alternative/functional-decomposition
# ... model one approach in the workbench ...

git checkout main
git checkout -b alternative/domain-decomposition
# ... model another approach in the workbench ...

# Compare them
git diff alternative/functional-decomposition alternative/domain-decomposition -- architecture/
```

## Tagging Architecture Milestones

Mark significant versions of your model:

```bash
# Board-approved baseline
git tag -a v1.0-baseline -m "Board-approved capability model, Q1 2026"

# After major restructuring
git tag -a v2.0-target-state -m "Target state model for 2027 strategy"

# List all architecture tags
git tag -l "v*"
```

## Resolving conflicts

When the workbench Sync button reports a conflict, it has already **safely rolled back** the rebase — your local work is intact and the repository is in a clean state. You just need to reconcile the conflicting changes before clicking Sync again.

JSONL files occasionally conflict when the same capability was edited on different branches:

1. **Open the conflicted file** in any text editor
2. **Find the conflict markers** (`<<<<<<<`, `=======`, `>>>>>>>`)
3. **Choose the correct version** of each line (each line is an independent JSON object)
4. **Verify validity** — Each line must be valid JSON
5. **Commit the resolution**:
   ```bash
   git add architecture/bcm-studio/models/enterprise.bcm.jsonl
   git commit -m "Resolve merge conflict in enterprise model"
   ```

### Preventing Conflicts

- Assign different areas of the model to different architects
- Communicate about planned structural changes before making them
- Keep branches short-lived to reduce divergence
- Merge main into feature branches regularly
