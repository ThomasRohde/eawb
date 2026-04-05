---
title: Creating Models
category: BCM Studio
order: 11
---

# Creating and Managing BCM Models

## Creating a New Model

### From the Models Panel

1. Open the **Models** panel (sidebar → Panels → Models)
2. Click the **Create Model** button
3. Enter a descriptive name (e.g., "Enterprise Capability Model 2026")
4. Click **Create**

The new model file is created at `architecture/bcm-studio/models/<name>.bcm.jsonl` and automatically opened in the tree panel.

### Model Naming Conventions

Good model names:

- `Enterprise Capabilities` — Main organizational model
- `IT Capabilities` — Domain-specific model
- `Target State 2027` — Future-state model
- `Division X Capabilities` — Scoped to an organizational unit

## Model Structure

Every BCM model file (`.bcm.jsonl`) contains:

### Header (Line 1)

```json
{
  "_t": "header",
  "id": "abc123",
  "title": "Enterprise Capabilities",
  "version": "0.1.0",
  "created": "2026-04-04T10:00:00.000Z"
}
```

The header stores model metadata: unique ID, title, version, and creation timestamp.

### Nodes (Remaining Lines)

```json
{"id":"node1","parentId":null,"label":"Customer Management","description":"Capabilities for managing customer relationships","order":0}
{"id":"node2","parentId":"node1","label":"Customer Acquisition","description":"Attracting and converting new customers","order":0}
```

Each line is a capability node with:

| Field         | Description                               |
| ------------- | ----------------------------------------- |
| `id`          | Unique identifier (auto-generated)        |
| `parentId`    | ID of parent node (`null` for root nodes) |
| `label`       | Capability name                           |
| `description` | Optional description of the capability    |
| `order`       | Sort position among siblings              |

## Managing Multiple Models

The **Models** panel lets you:

- **View** all models in the workspace
- **Open** a model to edit it in the tree
- **Delete** models you no longer need
- **Switch** between models seamlessly

### Why Multiple Models?

Common reasons to maintain several models:

- **Current vs. Target State** — Compare where you are with where you're heading
- **Domain-specific** — Separate models for different business domains
- **Alternatives** — Explore different decomposition strategies
- **Governance** — Level-1 model for executives, detailed models for architects

## Model Storage

Models are stored as plain files in your Git repository:

```
architecture/bcm-studio/models/
├── enterprise-capabilities.bcm.jsonl
├── it-capabilities.bcm.jsonl
└── target-state-2027.bcm.jsonl
```

Because they're just files:

- Git tracks every change automatically
- You can branch to explore alternatives
- Multiple people can work on models simultaneously (merge via Git)
- Standard backup, restore, and transfer workflows apply

## File Format Details

The JSONL format was chosen for several reasons:

1. **Git-friendly** — One object per line means Git can diff individual capability changes
2. **Streaming** — Large models load efficiently (no need to parse entire JSON tree)
3. **Human-readable** — You can inspect models with any text editor
4. **Deterministic** — Nodes are written in depth-first order for consistent diffs
