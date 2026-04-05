---
title: Tree Operations
category: BCM Studio
order: 12
---

# Tree Operations

The **Tree** panel is the primary editor for building and organizing your Business Capability Model. It displays capabilities in a hierarchical tree structure with full drag-and-drop support.

## Adding Capabilities

### Add a Root Capability

Click the **Add root capability** button at the top of the tree panel. A new root-level capability is created with a default name you can immediately edit.

### Add a Child Capability

1. Click the three-dot menu (**...**) on any capability
2. Choose **Add child**
3. A new child capability appears beneath the selected node with a default name

## Editing Capabilities

### Inline Renaming

1. Click the three-dot menu (**...**) on a capability
2. Choose **Rename**
3. The name becomes an editable text field
4. Press **Enter** to confirm or **Escape** to cancel

### Inspector Panel

Select a capability to view and edit its full details in the **Inspector** panel:

- **Label** — The capability name
- **Description** — A longer description of what the capability encompasses

## Organizing Capabilities

### Drag and Drop

Rearrange capabilities by dragging the handle (grip icon) on the left side of each capability:

- **Reorder** — Drag within the same level to change sort order
- **Reparent** — Drag onto a different node to move a capability (and all its children) under a new parent

The drag activates after a small movement threshold (5px) to prevent accidental drags.

### Delete

1. Click the three-dot menu (**...**) on a capability
2. Choose **Delete**

Deleting a parent also removes all its children.

> **Warning**: Deletion is immediate. Use Git history or version checkpoints to recover deleted capabilities if needed.

## Selection

Click any capability to select it. The selection is synchronized across all BCM panels — the Inspector shows the selected capability's details, and the Hierarchy view highlights it.

### Keyboard in Edit Mode

| Key        | Action         |
| ---------- | -------------- |
| **Enter**  | Confirm rename |
| **Escape** | Cancel rename  |

## Node Menu

Click the three-dot menu (**...**) on any capability to access:

- **Add child** — Create a child capability
- **Rename** — Edit the capability name inline
- **Delete** — Remove the capability and its children

## Performance

The tree is optimized for large models and can handle **3,000+ nodes** efficiently with virtualized rendering. Expand and collapse operations are instant regardless of model size.
