---
title: Glossary
category: Reference
order: 45
---

# Glossary

Key terms used throughout EA Workbench and enterprise architecture.

## A

**ACP (Agent Client Protocol)**
An open protocol for connecting AI agents to client applications. EA Workbench uses ACP to communicate with AI providers like GitHub Copilot.

**ADR (Architecture Decision Record)**
A document that captures an important architecture decision along with its context and consequences. Can be created in the Markdown Editor.

**Artifact**
Any file managed by EA Workbench — BCM models, documents, exports, etc.

**Auto-Checkpoint**
A feature that automatically creates Git commits as you work, providing continuous version history without manual action.

## B

**BCM (Business Capability Model)**
A hierarchical model of what an organization does, expressed as capabilities. The primary artifact type in BCM Studio.

**BIZBOK**
Business Architecture Body of Knowledge — a guide for business architecture practices.

## C

**Capability**
An ability that an organization possesses or needs. Capabilities describe _what_ an organization does, independent of how it's done.

**Capability Map**
A visual representation of a BCM, typically shown as nested boxes. Used for communication and assessment.

## D

**Decomposition**
The process of breaking a high-level capability into more specific sub-capabilities.

**Dockview**
The panel layout library used by EA Workbench. Enables drag-and-drop panel arrangement, tabbing, floating, and popout windows.

## E

**EA (Enterprise Architecture)**
A discipline for aligning business strategy with IT capabilities through structured models, principles, and governance.

## F

**Fastify**
The Node.js HTTP server framework used by EA Workbench's backend.

**Fluent UI**
Microsoft's design system used for EA Workbench's UI components (buttons, trees, inputs, etc.).

## G

**Git**
The distributed version control system used by EA Workbench to track all changes to architecture artifacts.

## H

**Header**
The first line of a `.bcm.jsonl` file, containing model metadata (ID, title, version, timestamps).

**Hierarchy**
The parent-child structure of capabilities in a BCM. Level 1 is the broadest; deeper levels are more specific.

## J

**JSONL (JSON Lines)**
A file format where each line is a valid JSON object. Used by EA Workbench for BCM model files.

## L

**Level (L1, L2, L3...)**
The depth of a capability in the hierarchy. Level 1 is the topmost strategic level.

## M

**Manifest (ToolManifest)**
The metadata contract that defines a tool — its ID, name, panels, commands, and artifact types.

**MECE**
Mutually Exclusive, Collectively Exhaustive — a principle for capability decomposition where siblings don't overlap and together cover the full scope of their parent.

## N

**Node**
A single capability entry in a BCM model file. Each node has an ID, parent ID, label, description, and order.

## P

**Panel**
A UI component within the workbench layout. Panels can be docked, tabbed, floated, or popped out.

## R

**Repo-native**
A design philosophy where all data lives as files within a Git repository, with no external databases or cloud dependencies.

## S

**SQLite**
A lightweight embedded database used by EA Workbench for operational metadata (not for architecture artifacts).

## T

**TOGAF**
The Open Group Architecture Framework — a widely adopted EA methodology.

**Tool**
A functional module within EA Workbench (BCM Studio, AI Chat, Markdown Editor, Help). Each tool has a core package and optionally a UI package.

**Tool Host**
The runtime component that registers tools, mounts their API routes, and manages their lifecycle.

## W

**Workspace**
A Git repository where EA Workbench has been initialized (contains a `.eawb/` directory). All architecture artifacts live within the workspace.

**WebSocket**
A communication protocol used for real-time updates (AI streaming, file change notifications, etc.).
