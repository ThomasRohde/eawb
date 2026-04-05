---
title: Layout Customization
category: Interface
order: 30
---

# Layout Customization

EA Workbench uses **Dockview**, a powerful docking layout system, that lets you arrange panels exactly how you want them. Every panel can be moved, resized, stacked, floated, or popped out into a separate window.

## Panel Basics

### Opening Panels

Open any panel from the sidebar:

- **Tools** section — Opens the primary panel for each tool
- **Panels** section — Lists all available panels individually

### Closing Panels

Click the **×** button on a panel's tab to close it. Closed panels can be reopened from the sidebar.

### Panel Tabs

When multiple panels share the same area, they appear as tabs. Click a tab to switch between panels in that group.

## Arranging Panels

### Drag and Drop

Drag a panel tab to rearrange it:

- **Within a group** — Reorder tabs by dragging left/right
- **To a new position** — Drag to the edge of another panel to dock it beside, above, or below
- **To a new group** — Drag to the center of another panel to stack it as a tab

### Drop Zones

When dragging a panel, drop zones appear showing where the panel will land:

| Drop Zone       | Result                           |
| --------------- | -------------------------------- |
| **Top edge**    | Dock above the target panel      |
| **Bottom edge** | Dock below the target panel      |
| **Left edge**   | Dock to the left of the target   |
| **Right edge**  | Dock to the right of the target  |
| **Center**      | Add as a tab in the target group |

### Resizing

Drag the divider between panel groups to resize them. The cursor changes to a resize handle when hovering over a divider.

## Advanced Layout

### Floating Panels

Right-click a panel tab and choose **Float** to detach it as a floating window within the workbench. Floating panels can be positioned anywhere and resized freely.

### Popout Windows

Right-click a panel tab and choose **Popout** to open it in a separate browser window. This is ideal for:

- Multi-monitor setups — Put the Hierarchy view on a second screen
- Presentations — Show a single panel full-screen
- Focus work — Isolate one panel without distractions

### Maximize

Right-click a panel tab and choose **Maximize** to expand it to fill the entire layout area. Click again to restore the previous layout.

## Saving and Restoring

### Auto-Save

Your layout is automatically saved to browser local storage. When you reopen the workbench, your panels appear exactly where you left them.

### Reset Layout

Click **Reset Layout** in the sidebar footer to restore the default panel arrangement. This is useful if:

- The layout gets into an undesirable state
- You want to start fresh
- Panels have been accidentally closed or misarranged

The default layout includes:

- **Left**: Tree, AI Actions, and Models panels (tabbed)
- **Center**: Hierarchy, Capability Map, and AI Chat panels (tabbed)
- **Right**: Inspector and Export panels (tabbed)

## Tips

- Keep frequently-used panels visible; use tabs for occasional panels
- Use popout windows for panels you reference but don't actively edit
- The reset button is your friend — don't hesitate to use it
- Layout is per-browser — different browsers maintain independent layouts
