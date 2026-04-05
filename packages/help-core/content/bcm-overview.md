---
title: BCM Studio Overview
category: BCM Studio
order: 10
---

# BCM Studio Overview

**BCM Studio** is the flagship tool of EA Workbench, purpose-built for creating and managing Business Capability Models (BCMs). A BCM is a structured, hierarchical representation of _what_ an organization does — independent of _how_ it's done or _who_ does it.

## What is a Business Capability Model?

A Business Capability Model defines the complete set of abilities an organization needs to execute its strategy and operate its business. Capabilities are:

- **Stable** — They change far less frequently than processes, org charts, or technology
- **Hierarchical** — High-level capabilities decompose into more specific sub-capabilities
- **Business-aligned** — Named in business language, not technical jargon
- **Unique** — Each capability appears exactly once in the model

### Example Structure

```
Enterprise
├── Customer Management
│   ├── Customer Acquisition
│   ├── Customer Onboarding
│   └── Customer Retention
├── Product Management
│   ├── Product Development
│   ├── Product Lifecycle
│   └── Product Portfolio
└── Operations
    ├── Supply Chain
    ├── Manufacturing
    └── Quality Assurance
```

## BCM Studio Panels

BCM Studio provides several specialized panels for working with capability models:

| Panel              | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| **Tree**           | Hierarchical tree editor for building and organizing capabilities |
| **Hierarchy**      | Visual hierarchical view showing parent-child relationships       |
| **Capability Map** | Heat-map style visualization of the capability model              |
| **Inspector**      | Detail editor for the selected capability's properties            |
| **AI Actions**     | AI-powered operations for generating and refining capabilities    |
| **Export**         | Export models to Markdown, HTML, or SVG                           |
| **Models**         | Manage multiple BCM model files                                   |

## Working with Models

### Creating a Model

1. Open the **Models** panel from the sidebar
2. Click **Create Model**
3. Enter a name for your model (e.g., "Enterprise Capabilities")
4. The model is created as a `.bcm.jsonl` file in `architecture/bcm-studio/models/`

### Opening a Model

Select a model from the **Models** panel. The tree panel loads its capability hierarchy.

### Model Files

Each model is a single `.bcm.jsonl` file using the JSONL format. The file is human-readable and Git-friendly, enabling standard version control workflows for your architecture models.

## Next Steps

- **[Creating Models](bcm-creating-models)** — Detailed guide to creating and configuring models
- **[Tree Operations](bcm-tree-operations)** — Master the tree editor
- **[AI Actions](bcm-ai-actions)** — Use AI to accelerate capability modeling
