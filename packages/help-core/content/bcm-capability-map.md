---
title: Capability Map
category: BCM Studio
order: 14
---

# Capability Map

The **Capability Map** panel renders your Business Capability Model as a heat-map style visualization, commonly used in enterprise architecture for strategic analysis and communication.

## What is a Capability Map?

A capability map presents capabilities in a grid or nested-box layout that emphasizes coverage and relative positioning rather than hierarchy. It's the format most enterprise architects use when presenting to executives and business stakeholders.

### Key Characteristics

- **Space-efficient** — Capabilities fill available space proportionally
- **Scannable** — All top-level capabilities visible at once
- **Assessment-ready** — Designed for overlaying heat-map colors (maturity, investment, risk)

## Using the Capability Map

### Viewing

Open the **Capability Map** panel from the sidebar (Panels → Capability Map). It loads the currently active BCM model.

### Navigation

- **Hover** over a capability to see its full name and description in a tooltip
- **Click** a capability to select it (syncs with Tree and Inspector)
- **Scroll** to zoom in/out for large models

### Layout Behavior

The map automatically arranges Level 1 capabilities as major sections, with Level 2 and deeper capabilities nested inside. The layout adapts to the available panel size.

## Use Cases

### Strategic Planning

The capability map is the primary artifact for:

- **Gap analysis** — Which capabilities are missing or underdeveloped?
- **Investment planning** — Where should the organization invest to build capability?
- **Rationalization** — Are there redundant or overlapping capabilities?

### Communication

Capability maps are widely understood by business leaders. They provide a common language between IT and the business:

- Board presentations
- Strategy workshops
- Architecture reviews
- Due diligence (M&A)

### Assessment Overlays

Future versions will support overlaying assessment data on the map:

- **Maturity levels** — Red/amber/green based on capability maturity
- **Strategic importance** — Highlight capabilities critical to strategy
- **Technology health** — Show which capabilities are supported by aging technology

## Tips

- Keep Level 1 capabilities to 6–10 for readability
- Use consistent granularity within each level
- Name capabilities as noun phrases (e.g., "Customer Acquisition" not "Acquire Customers")
- The map works best when the model has 2–3 levels of depth
