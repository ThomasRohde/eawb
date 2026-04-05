---
title: Best Practices
category: Support
order: 52
---

# Best Practices

Proven patterns and recommendations for getting the most out of EA Workbench and Business Capability Modeling.

## Capability Modeling Best Practices

### Naming Conventions

- **Use noun phrases** — "Customer Acquisition" not "Acquire Customers"
- **Be consistent** — Pick a naming pattern and stick with it across the model
- **Avoid jargon** — Use business language, not technical terms
- **Keep names short** — 2–4 words is ideal; longer names suggest the scope is too broad
- **Don't include "Management"** everywhere — It adds noise without clarity

### Hierarchy Design

- **3–4 levels** is ideal for most organizations
- **5–8 children per parent** keeps the model balanced and readable
- **Avoid orphan nodes** — Every capability should have siblings
- **MECE principle** — Capabilities at the same level should be Mutually Exclusive and Collectively Exhaustive
- **Stable abstractions** — Higher levels change less frequently than lower levels

### Scope Boundaries

- **Define what's IN** — Each capability's description should state what it covers
- **Define what's OUT** — Explicitly note what a capability does NOT include
- **Avoid overlap** — If two capabilities seem to cover the same area, one needs to be refined or merged
- **Check completeness** — For each level, ask "Is there anything this parent does that isn't covered by its children?"

### Common Anti-Patterns

| Anti-Pattern                           | Problem                                  | Solution                                |
| -------------------------------------- | ---------------------------------------- | --------------------------------------- |
| **Process masquerading as capability** | "Onboard Customer" is a process          | "Customer Onboarding" is the capability |
| **Technology in names**                | "SAP Integration"                        | "Financial System Integration"          |
| **Org structure mirror**               | Capabilities match departments           | Capabilities should be org-independent  |
| **Too deep**                           | 7+ levels of nesting                     | Flatten by removing intermediate levels |
| **Too flat**                           | 50 root capabilities                     | Group into 6–10 Level 1 categories      |
| **Inconsistent granularity**           | Some L2s have 20 children, others have 1 | Rebalance the decomposition             |

## Workflow Best Practices

### Starting a New Model

1. **Start with stakeholder interviews** — Understand the business before modeling
2. **Draft Level 1 first** — Get the top-level structure right before drilling down
3. **Use AI to accelerate** — Generate initial decompositions, then refine manually
4. **Review with stakeholders** — The model should make sense to business people
5. **Iterate** — Expect 3–5 rounds of refinement for a good model

### Maintaining a Model

- **Review quarterly** — Business capabilities evolve; the model should too
- **Track decisions** — Use the Markdown Editor to document why decomposition choices were made
- **Version milestones** — Tag significant model versions in Git
- **Assign ownership** — Each Level 1 capability should have a business owner

### Collaboration Workflow

1. **Main branch** holds the approved model
2. **Feature branches** for proposed changes
3. **Pull requests** for review and approval
4. **Tags** for milestone versions (e.g., `v1.0-board-approved`)

## AI Usage Best Practices

### Getting Good Results

- **Context matters** — Filled-in descriptions produce much better AI output
- **Iterate in small steps** — Generate Level 2, review, then generate Level 3
- **Always review AI output** — AI suggestions are starting points, not final answers
- **Be specific** — "Generate sub-capabilities for a retail bank's Customer Management" beats "Generate capabilities"

### When to Use AI vs. Manual Work

| Task                             | Recommended Approach                   |
| -------------------------------- | -------------------------------------- |
| Initial decomposition brainstorm | AI Generate                            |
| Filling in descriptions          | AI Generate Descriptions               |
| Structural refinement            | Manual with AI Suggestions             |
| Stakeholder-facing naming        | Manual                                 |
| Industry alignment               | AI Identify Gaps + Manual review       |
| Final quality pass               | AI Suggest Improvements + Manual fixes |

## Export Best Practices

- **Export after every major revision** — Keep shareable artifacts current
- **Markdown for documentation** — Lives alongside code, rendered by Git hosts
- **HTML for stakeholders** — Self-contained, no tools needed to view
- **SVG for presentations** — Scalable, embeddable in slides and documents
- **Automate exports** — Consider a Git hook that re-exports on commit
