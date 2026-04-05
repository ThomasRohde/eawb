---
title: AI Actions
category: BCM Studio
order: 17
---

# AI Actions

The **AI Actions** panel provides a suite of AI-powered operations that accelerate capability modeling. These actions use GitHub Copilot (via ACP) or other configured AI providers to generate, refine, and analyze your model.

## Prerequisites

AI Actions require an AI provider to be configured:

- **GitHub Copilot CLI** must be installed and authenticated
- Run `eawb doctor` to verify AI availability
- The AI provider is configured automatically when Copilot CLI is detected

## Available Actions

### Generate Capabilities

**Purpose**: Automatically generate a capability decomposition for a selected node.

**How it works**:

1. Select a capability in the Tree panel
2. Open AI Actions and choose **Generate Capabilities**
3. The AI analyzes the selected capability's name, description, and position in the hierarchy
4. It generates appropriate child capabilities with names and descriptions

**Best for**: Quickly scaffolding a new area of the model. You can generate an initial structure and then refine it manually.

### Generate Descriptions

**Purpose**: Create descriptions for capabilities that lack them.

**How it works**:

1. Select a capability (or a subtree root)
2. Choose **Generate Descriptions**
3. The AI writes descriptions based on:
   - The capability's name
   - Its parent and sibling capabilities (for context)
   - Its children (if any, to understand scope)

**Best for**: Filling in descriptions across a large model without writing each one manually.

### Suggest Improvements

**Purpose**: Get AI recommendations for improving your model's structure.

**How it works**:

1. Select a portion of the model
2. Choose **Suggest Improvements**
3. The AI analyzes for common issues:
   - Inconsistent naming conventions
   - Unbalanced decomposition (some branches much deeper than others)
   - Missing capabilities (gaps in coverage)
   - Overlapping capabilities

### Refine Capability

**Purpose**: Improve an individual capability's definition.

**How it works**:

1. Select a single capability
2. Choose **Refine Capability**
3. The AI suggests improvements to the name and description

### Analyze Impact

**Purpose**: Understand the impact of a capability across the organization.

**How it works**:

1. Select a capability
2. Choose **Analyze Impact**
3. The AI provides analysis of:
   - Dependencies on other capabilities
   - Stakeholders affected
   - Technology implications

### Generate from Description

**Purpose**: Create an entire capability model from a natural-language description.

**How it works**:

1. Choose **Generate from Description** (no selection needed)
2. Enter a description of the business domain or organization
3. The AI generates a multi-level capability model

**Best for**: Starting a new model from scratch when you have a general idea but haven't defined the structure yet.

### Identify Gaps

**Purpose**: Find missing capabilities in your model.

**How it works**:

1. Select the model root or a subtree
2. Choose **Identify Gaps**
3. The AI compares your model against industry frameworks and common patterns
4. It suggests capabilities that may be missing

## Tips for Better AI Results

- **Provide context** — Capabilities with descriptions produce better AI output
- **Start broad** — Generate Level 1 first, then drill into each area
- **Iterate** — AI output is a starting point; always review and refine
- **Use good names** — Clear, consistent naming helps the AI understand intent
- **Check the model** — AI may suggest duplicates or overlaps; review carefully

## AI Action Workflow

A productive workflow for building a model with AI assistance:

1. **Create** a new model with a descriptive name
2. **Generate** Level 1 capabilities using "Generate from Description"
3. **Review** and adjust the generated structure
4. **Drill down** — Select each Level 1 capability and "Generate Capabilities" for Level 2
5. **Generate descriptions** for the entire model
6. **Identify gaps** and fill them
7. **Suggest improvements** for a final quality pass
