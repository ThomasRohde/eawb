---
title: Exporting Models
category: BCM Studio
order: 16
---

# Exporting Models

The **Export** panel lets you export your Business Capability Model to various formats for sharing, presenting, and archiving.

## Available Export Formats

### Markdown

Exports the model as a structured Markdown document with headings reflecting the capability hierarchy.

```markdown
# Enterprise Capabilities

## Customer Management

### Customer Acquisition

Attracting and converting new customers.

### Customer Onboarding

Guiding new customers through initial setup and training.
```

**Best for**: Documentation, README files, wikis, and text-based collaboration.

### HTML

Generates a self-contained HTML file with styled capability cards arranged hierarchically. The HTML uses inline CSS and requires no external dependencies.

**Best for**: Sharing with stakeholders who don't have EA Workbench installed, embedding in intranets, and email attachments.

### SVG

Produces a scalable vector graphic rendering of the capability map. The SVG can be opened in any browser or vector editor.

**Best for**: Presentations, print materials, high-quality diagrams, and embedding in documents.

## How to Export

1. Open the **Export** panel from the sidebar
2. Ensure the desired model is loaded (check the Tree panel)
3. Select the export format (Markdown, HTML, or SVG)
4. Click **Export**
5. The exported file is saved to the workspace or downloaded depending on configuration

## Export Options

### Scope

- **Full model** — Export the entire capability hierarchy
- **Selected subtree** — Export only the selected capability and its descendants

### Depth

Control how many levels deep the export goes:

- **All levels** — Complete hierarchy
- **Level 1 only** — Top-level capabilities
- **Custom depth** — Specify maximum depth (e.g., 3 levels)

### Include Descriptions

Toggle whether capability descriptions are included in the export. Omitting descriptions produces a more compact output suitable for high-level overviews.

## Sharing Exports

Exported files are saved within your workspace and tracked by Git. This means:

- Exports are versioned alongside the model
- Team members get exports when they pull
- You can automate export generation in CI/CD pipelines

## Tips

- Export to **Markdown** for documentation that lives next to your code
- Export to **HTML** when emailing architecture deliverables to stakeholders
- Export to **SVG** for embedding in PowerPoint, Confluence, or other visual tools
- Re-export after major model changes to keep shared artifacts current
