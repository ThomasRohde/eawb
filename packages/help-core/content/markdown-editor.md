---
title: Markdown Editor
category: Tools
order: 25
---

# Markdown Editor

The **Markdown Editor** tool provides a built-in document editor for creating and managing architecture documentation, decision records, meeting notes, and any other Markdown content within your workspace.

## Overview

The Editor combines a text editing area with live preview, letting you write Markdown and see the rendered output simultaneously. Documents are stored as `.md` files in your workspace and tracked by Git.

## Creating Documents

1. Open the **Editor** panel from the sidebar
2. Click **New Document**
3. Enter a title for the document
4. Start writing in the editor area

Documents are saved to `architecture/documents/` in your workspace.

## Editing Features

### Markdown Syntax

The editor supports full GitHub-flavored Markdown:

- **Headings** — `# H1`, `## H2`, `### H3`, etc.
- **Bold** — `**bold text**`
- **Italic** — `*italic text*`
- **Lists** — Bulleted (`-`) and numbered (`1.`)
- **Code** — Inline `` `code` `` and fenced code blocks
- **Tables** — Pipe-separated tables with alignment
- **Links** — `[text](url)`
- **Images** — `![alt](url)`
- **Blockquotes** — `> quoted text`
- **Task lists** — `- [ ] todo` and `- [x] done`

### Auto-Save

Documents save automatically as you type. There's no manual save step needed.

## Document Management

### Opening Documents

Browse available documents in the Editor panel's document list. Click a document to open it.

### Cross-Panel Integration

Documents can be opened from other tools:

- The **AI Chat** can create documents and open them in the Editor
- Links to documents in other panels open in the Editor

### Deleting Documents

Remove documents through the document list. Deleted files are removed from the filesystem but remain in Git history.

## Use Cases

### Architecture Decision Records (ADRs)

Document key architecture decisions:

```markdown
# ADR-001: Use Event-Driven Architecture

## Status

Accepted

## Context

We need to decouple services for scalability.

## Decision

Adopt event-driven architecture using message queues.

## Consequences

- Improved scalability and resilience
- Added complexity in debugging distributed flows
```

### Meeting Notes

Capture architecture review meetings, stakeholder workshops, and planning sessions.

### Technical Documentation

Write technical specifications, integration guides, API documentation, and system descriptions.

## Tips

- Use headings to structure long documents
- Link between documents using relative paths
- Keep documents focused — one topic per document
- Use the AI Chat to help draft or refine documents
