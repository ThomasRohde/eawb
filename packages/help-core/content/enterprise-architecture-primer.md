---
title: EA Primer
category: Guides
order: 36
---

# Enterprise Architecture Primer

A brief introduction to enterprise architecture concepts as they relate to EA Workbench. This is not a comprehensive EA guide — it focuses on the concepts you'll encounter while using the workbench.

## What is Enterprise Architecture?

Enterprise Architecture (EA) is a discipline that helps organizations align their business strategy with their IT capabilities. It provides:

- A **common language** between business and technology teams
- A **structured view** of how the organization works
- A **roadmap** for evolving technology to support business goals
- A **framework** for making consistent investment decisions

## Key Concepts in EA Workbench

### Business Capabilities

A **business capability** describes _what_ an organization does (not _how_). Capabilities are:

- **Stable** — They change much less than processes or technology
- **Outcome-focused** — Named as abilities, not activities
- **Technology-independent** — "Customer Data Management" not "Salesforce Administration"
- **Organization-independent** — Capabilities exist regardless of which department performs them

**Example**: "Payment Processing" is a capability. It remains the same whether you use credit cards, ACH transfers, or cryptocurrency. The _how_ changes; the _what_ stays stable.

### Capability Hierarchy

Capabilities decompose into sub-capabilities, forming a tree:

- **Level 1** — Strategic capabilities (6–10 for most enterprises)
- **Level 2** — Major business functions within each strategic area
- **Level 3** — Specific business activities
- **Level 4+** — Detailed capabilities (only where needed)

Each level adds specificity without changing the parent's scope.

### Business Capability Model (BCM)

A BCM is the complete set of capabilities for an organization or domain. It serves as:

- The **architecture backbone** — Other artifacts reference capabilities
- A **planning tool** — Investment decisions map to capabilities
- A **communication artifact** — Stakeholders understand capabilities intuitively
- A **stability anchor** — While everything else changes, capabilities persist

## How EA Workbench Supports EA

| EA Activity                | Workbench Feature                 |
| -------------------------- | --------------------------------- |
| Capability modeling        | BCM Studio (Tree, Hierarchy, Map) |
| Capability assessment      | Inspector properties              |
| Architecture documentation | Markdown Editor                   |
| Architecture decisions     | Documents (ADRs)                  |
| AI-assisted modeling       | AI Actions, AI Chat               |
| Stakeholder communication  | Export (HTML, SVG, Markdown)      |
| Version management         | Git integration                   |
| Collaboration              | Git branching and PRs             |

## Common Frameworks

EA Workbench is framework-agnostic, but these frameworks commonly inform capability modeling:

### TOGAF

The Open Group Architecture Framework — provides the Architecture Development Method (ADM) for creating and governing enterprise architectures.

### BIZBOK

The Business Architecture Body of Knowledge — defines business architecture practices including capability mapping.

### APQC Process Classification Framework

A cross-industry taxonomy of business processes that can inform capability decomposition.

### BIAN (Banking)

The Banking Industry Architecture Network — provides a service landscape for banking that maps well to capabilities.

## Further Reading

- Ask the **AI Chat** about specific EA concepts — it has extensive knowledge of frameworks and methodologies
- Use **AI Actions** → **Generate from Description** to create industry-specific starter models
- Browse the **Best Practices** help topic for modeling guidelines
