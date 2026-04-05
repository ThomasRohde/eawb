---
title: FAQ
category: Support
order: 51
---

# Frequently Asked Questions

## General

### What is EA Workbench?

EA Workbench is a **repo-native, npm-installable local workbench** for enterprise architects. It provides tools for creating Business Capability Models, having AI-assisted conversations about architecture, writing documentation, and more — all stored as plain files in your Git repository.

### Is my data stored in the cloud?

**No.** All data is stored locally in your Git repository. The server runs on `localhost`. Nothing is sent to external services except when using AI features (which communicate with your configured AI provider).

### What happened to OSS-Themis?

EA Workbench is the successor to OSS-Themis, rebuilt from the ground up with modern technology and a focus on developer experience. It maintains the same philosophy of repo-native, version-controlled architecture artifacts.

### Can I use EA Workbench without Git?

**No.** Git is a fundamental part of the architecture. EA Workbench uses Git for version history, checkpointing, and data integrity. Every workspace must be a Git repository.

### Is EA Workbench free?

EA Workbench is open source. Check the repository for the specific license terms.

## Models and Data

### Can I have multiple BCM models?

**Yes.** You can create and manage multiple models. Each model is a separate `.bcm.jsonl` file. Common patterns include current-state vs. target-state models, domain-specific models, and alternative decompositions.

### How large can a model be?

The tree panel is optimized for **3,000+ nodes** with virtualized rendering. Most enterprise capability models have 200–500 capabilities, so you're unlikely to hit any limits in practice.

### Can I edit model files directly?

**Yes.** Model files are plain JSONL (JSON Lines). You can edit them with any text editor, process them with `jq`, or write scripts to batch-modify them. Just maintain the format: header on line 1, one node per subsequent line.

### How do I merge models from different branches?

Since models are line-based JSONL, Git can often merge changes automatically. For conflicts:

1. The header line rarely conflicts
2. Node lines may conflict if the same capability was edited on both branches
3. Resolve conflicts like any other text file — ensure valid JSON on each line

### Can I import models from other tools?

Currently, there's no built-in import. However, you can write a script to convert other formats to the `.bcm.jsonl` format. The format is simple enough that conversion is straightforward.

## AI Features

### Do I need GitHub Copilot for AI features?

GitHub Copilot CLI is the default (and currently only) AI provider. The workbench uses the Agent Client Protocol (ACP), which could support additional providers in the future.

### Can I use EA Workbench without AI?

**Absolutely.** All core features work without AI. You can create models, organize capabilities, export to various formats, and manage documents entirely manually. AI is an optional accelerator.

### Are my prompts sent to third parties?

AI prompts are sent to your configured AI provider (e.g., GitHub Copilot). Review your provider's privacy policy for details on data handling. No data is sent to EA Workbench maintainers.

## Collaboration

### Can multiple people work on the same model?

**Yes**, through Git:

1. Each person clones the repository
2. Each runs their own local EA Workbench
3. Changes are merged through Git (branches, pull requests)

There is no real-time collaborative editing (like Google Docs). Collaboration follows Git workflows.

### Can I review model changes in pull requests?

**Yes.** Since models are version-controlled files, they appear in pull request diffs like any other file. The JSONL format produces readable diffs showing which capabilities were added, changed, or removed.

### How do I back up my work?

Push your Git repository to a remote (GitHub, GitLab, Azure DevOps, etc.). All architecture artifacts, models, and documents are included in the push.

## Technical

### What browsers are supported?

EA Workbench works in any modern browser:

- **Chrome** / **Edge** (recommended)
- **Firefox**
- **Safari**

### Can I run EA Workbench on a server?

**No.** EA Workbench is designed as a local-only tool. The server binds to `127.0.0.1` and is only accessible from your own machine. There is no authentication, multi-user support, or remote-access mode.

### Does EA Workbench work offline?

**Mostly.** The workbench itself runs entirely locally. The only feature requiring internet is AI (which needs the AI provider). All other features work offline.

### How do I update EA Workbench?

```bash
# If installed via npm
npm update -g ea-workbench

# If running from source
git pull && npm install && npm run refresh
```
