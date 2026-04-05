---
title: Version History
category: Interface
order: 31
---

# Version History and Checkpoints

EA Workbench leverages Git to provide comprehensive version history for all your architecture artifacts. Every change to every model and document is tracked automatically.

## Auto-Checkpointing

EA Workbench can automatically create Git commits as you work, providing a continuous history of changes without manual intervention.

### How It Works

1. You make changes in the workbench (edit capabilities, write documents, etc.)
2. The auto-checkpoint service detects file changes
3. After a configurable quiet period, it creates a Git commit
4. The commit message describes what changed

### Benefits

- **Never lose work** — Every significant change is captured
- **Fine-grained history** — See exactly when and what changed
- **No manual steps** — Works silently in the background
- **Git-native** — Standard `git log` shows the full history

### Auto-Push

When configured, auto-checkpointing can also push changes to a remote repository, ensuring your work is backed up and available to team members.

## Version History Panel

The **Version History** panel shows a timeline of changes to your workspace:

- **Commit list** — Chronological list of all checkpoints and manual commits
- **Commit details** — What files changed in each commit
- **Diff view** — See exactly what changed in each file

### Viewing History

1. Open the **Version History** panel from the sidebar
2. Browse the list of commits
3. Click a commit to see its details and changes

## Working with Git History

Because EA Workbench uses standard Git, you have full access to Git's powerful history tools:

### Command Line

```bash
# View recent history
git log --oneline -20

# See what changed in a specific commit
git show <commit-hash>

# See the history of a specific model file
git log --follow architecture/bcm-studio/models/enterprise.bcm.jsonl

# Compare versions
git diff HEAD~5 HEAD -- architecture/
```

### Reverting Changes

To undo recent changes:

```bash
# Revert the last commit
git revert HEAD

# Restore a specific file to a previous version
git checkout <commit-hash> -- path/to/file
```

## Branching for Architecture Exploration

Git branches are a powerful tool for architecture work:

### Creating Alternatives

```bash
# Create a branch for an alternative architecture
git checkout -b architecture/alternative-decomposition

# Make changes in the workbench...

# Compare with main
git diff main -- architecture/
```

### Use Cases for Branches

- **What-if analysis** — Explore different capability decompositions
- **Review workflows** — Create a branch, make changes, submit a pull request
- **Parallel work** — Multiple architects work on different areas simultaneously
- **Proposals** — Branch for proposed changes, merge when approved

## Best Practices

1. **Use meaningful branch names** — `architecture/customer-domain-redesign` not `test-branch`
2. **Commit messages matter** — They form the audit trail of architecture decisions
3. **Review diffs before merging** — Architecture changes deserve the same rigor as code changes
4. **Tag milestones** — `git tag v1.0-baseline` to mark significant model versions
5. **Don't fear branching** — Branches are cheap; use them freely for exploration
