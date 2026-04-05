---
title: Inspector
category: BCM Studio
order: 15
---

# Inspector Panel

The **Inspector** panel provides a detailed property editor for the currently selected business capability. It's where you add descriptions, metadata, and other attributes that enrich your model.

## Overview

When you select a capability in the Tree, Hierarchy, or Capability Map panels, the Inspector shows its full details:

- **Label** — The capability name (also editable inline in the Tree)
- **Description** — A longer text explaining what the capability encompasses
- **ID** — The unique identifier (read-only, auto-generated)
- **Parent** — The parent capability path
- **Children count** — Number of direct child capabilities

## Editing Properties

### Label

The label is the primary name of the capability. It should be:

- A **noun phrase** (e.g., "Customer Acquisition" not "Acquire Customers")
- **Unique** within the model (no two capabilities should have the same name)
- **Business-oriented** (avoid technical jargon)
- **Concise** (2–4 words is ideal)

### Description

The description explains the scope and boundaries of the capability. Good descriptions answer:

- **What** does this capability encompass?
- **What** are its boundaries (what it does NOT include)?
- **Why** is it important to the organization?

Example:

> _Customer Acquisition encompasses all activities related to identifying, attracting, and converting prospective customers into active customers. This includes lead generation, marketing campaigns, sales pipeline management, and initial contract execution. It does not include ongoing customer service or retention activities._

## Working Efficiently

### Quick Editing Workflow

1. Navigate the **Tree** panel with keyboard arrows
2. View details in the **Inspector** panel alongside
3. Tab into the Inspector fields to edit
4. Changes save automatically

### Batch Descriptions with AI

If you have many capabilities without descriptions, use the **AI Actions** panel to generate descriptions in bulk. The AI analyzes each capability's position in the hierarchy and its siblings to produce contextually appropriate descriptions.

## Inspector and Version Control

All changes made in the Inspector are immediately written to the model file. If auto-checkpointing is enabled, Git commits are created automatically as you work. This means:

- Every description change is tracked in Git history
- You can see who changed what and when via `git log`
- You can revert individual changes if needed
