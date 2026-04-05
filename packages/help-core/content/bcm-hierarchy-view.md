---
title: Hierarchy View
category: BCM Studio
order: 13
---

# Hierarchy View

The **Hierarchy** panel provides a visual, read-friendly representation of your Business Capability Model. While the Tree panel is optimized for editing, the Hierarchy panel excels at communication and understanding.

## Overview

The Hierarchy view renders capabilities in a structured visual layout that shows parent-child relationships clearly. This view is particularly useful for:

- **Presentations** — Show stakeholders the full capability landscape
- **Navigation** — Get an overview of the model structure at a glance
- **Validation** — Spot gaps, overlaps, or unbalanced decompositions visually

## How It Works

The Hierarchy panel automatically syncs with the currently loaded model. As you make changes in the Tree panel, the Hierarchy view updates in real time.

### Layout

Capabilities are laid out in a top-down hierarchical arrangement:

- **Level 1** capabilities appear as the top row of boxes
- **Level 2** capabilities appear nested within their parents
- **Level 3+** capabilities nest further, with visual indentation indicating depth

### Color Coding

Capabilities may be color-coded based on their properties or status. This helps identify patterns across the model at a glance.

### Selection Sync

Clicking a capability in the Hierarchy view selects it across all panels — the Tree panel scrolls to show it, and the Inspector panel loads its details.

## Interacting with the Hierarchy

### Clicking

Click any capability box to select it. The selection is synchronized across all BCM panels.

### Expanding and Collapsing

Click the expand/collapse toggle on a capability to show or hide its children. This lets you focus on specific areas of the model.

### Zooming

Use the scroll wheel or pinch gesture to zoom in and out. This is essential for large models where the full hierarchy doesn't fit on screen.

### Panning

Click and drag on empty space to pan the view. This lets you navigate to different areas of a large model.

## When to Use Hierarchy vs. Tree

| Need                    | Recommended Panel |
| ----------------------- | ----------------- |
| Add/edit capabilities   | Tree              |
| Drag to reorganize      | Tree              |
| Visual overview         | Hierarchy         |
| Present to stakeholders | Hierarchy         |
| Validate structure      | Hierarchy         |
| Quick property edits    | Tree + Inspector  |

Both panels can be open simultaneously, and they stay synchronized.
