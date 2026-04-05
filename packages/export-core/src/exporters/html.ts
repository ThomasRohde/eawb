import type { IExporter, ExportOptions, ExportResult } from '../types.js';
import { buildLayoutTree, layoutTrees } from '../layout/index.js';
import { renderSvg } from '../layout/svg-renderer.js';
import { DEFAULT_LAYOUT_OPTIONS, DEFAULT_THEME } from '../layout/defaults.js';

interface BcmNode {
  id: string;
  name: string;
  parent: string | null;
  order: number;
  description: string;
}

interface BcmModel {
  header: { title: string; description: string; kind: string };
  nodes: BcmNode[];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const htmlExporter: IExporter = {
  format: 'html',
  name: 'HTML',

  async export(data: unknown, options: ExportOptions): Promise<ExportResult> {
    const model = data as BcmModel;
    const roots = buildLayoutTree(model.nodes);
    const layout = layoutTrees(roots, DEFAULT_LAYOUT_OPTIONS);
    const svgContent = renderSvg(layout, DEFAULT_THEME);

    const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(model.header.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #1a1a1a; }
    .header { padding: 24px 32px 16px; background: #fff; border-bottom: 1px solid #e0e0e0; }
    .header h1 { font-size: 20px; margin-bottom: 4px; }
    .header p { color: #666; font-size: 14px; }
    .map-container {
      overflow: auto;
      padding: 24px;
      cursor: grab;
      position: relative;
    }
    .map-container:active { cursor: grabbing; }
    .map-inner { display: inline-block; transform-origin: 0 0; transition: transform 0.1s; }
    .controls { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 8px; z-index: 10; }
    .controls button {
      width: 36px; height: 36px; border-radius: 6px; border: 1px solid #ccc;
      background: #fff; cursor: pointer; font-size: 18px; display: flex;
      align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .controls button:hover { background: #f0f0f0; }
    .search-box {
      position: fixed; top: 80px; right: 24px; z-index: 10;
      padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px;
      font-size: 14px; width: 220px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .tooltip {
      display: none; position: fixed; background: #333; color: #fff;
      padding: 8px 12px; border-radius: 6px; font-size: 12px;
      max-width: 300px; z-index: 100; pointer-events: none;
    }
    .meta { padding: 12px 32px; font-size: 11px; color: #999; border-top: 1px solid #e0e0e0; background: #fff; }
    svg .bcm-node rect { transition: opacity 0.2s; }
    svg .bcm-node.dimmed rect { opacity: 0.3; }
    svg .bcm-node.dimmed text { opacity: 0.3; }
    svg .bcm-node:hover rect { filter: brightness(0.95); }
    svg .bcm-node.highlight rect { stroke: #0078d4; stroke-width: 2; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(model.header.title)}</h1>
    ${model.header.description ? `<p>${escapeHtml(model.header.description)}</p>` : ''}
  </div>
  <input class="search-box" type="text" placeholder="Search capabilities..." id="search" />
  <div class="map-container" id="container">
    <div class="map-inner" id="inner">
      ${svgContent}
    </div>
  </div>
  <div class="controls">
    <button id="zoom-in" title="Zoom in">+</button>
    <button id="zoom-out" title="Zoom out">&minus;</button>
    <button id="zoom-reset" title="Reset zoom">&#8634;</button>
  </div>
  <div class="tooltip" id="tooltip"></div>
  <div class="meta">
    Exported from EA Workbench | ${model.nodes.length} capabilities | ${new Date().toISOString().slice(0, 10)}
  </div>
  <script>
    (function() {
      const container = document.getElementById('container');
      const inner = document.getElementById('inner');
      const search = document.getElementById('search');
      const tooltip = document.getElementById('tooltip');
      let scale = 1;
      let panX = 0, panY = 0, dragging = false, startX, startY, startPanX, startPanY;

      function applyTransform() {
        inner.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
      }

      document.getElementById('zoom-in').onclick = function() { scale = Math.min(3, scale * 1.2); applyTransform(); };
      document.getElementById('zoom-out').onclick = function() { scale = Math.max(0.1, scale / 1.2); applyTransform(); };
      document.getElementById('zoom-reset').onclick = function() { scale = 1; panX = 0; panY = 0; applyTransform(); };

      container.addEventListener('wheel', function(e) {
        e.preventDefault();
        scale *= e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(3, Math.max(0.1, scale));
        applyTransform();
      }, { passive: false });

      container.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        dragging = true; startX = e.clientX; startY = e.clientY;
        startPanX = panX; startPanY = panY;
      });
      window.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        panX = startPanX + (e.clientX - startX);
        panY = startPanY + (e.clientY - startY);
        applyTransform();
      });
      window.addEventListener('mouseup', function() { dragging = false; });

      // Search
      search.addEventListener('input', function() {
        var q = this.value.toLowerCase().trim();
        var groups = inner.querySelectorAll('.bcm-node');
        groups.forEach(function(g) {
          var name = (g.getAttribute('data-node-name') || '').toLowerCase();
          if (q && name.indexOf(q) === -1) {
            g.classList.add('dimmed');
            g.classList.remove('highlight');
          } else {
            g.classList.remove('dimmed');
            if (q) g.classList.add('highlight');
            else g.classList.remove('highlight');
          }
        });
      });

      // Tooltips
      inner.addEventListener('mouseover', function(e) {
        var g = e.target.closest('.bcm-node');
        if (!g) { tooltip.style.display = 'none'; return; }
        var name = g.getAttribute('data-node-name');
        var depth = g.getAttribute('data-node-depth');
        tooltip.textContent = name + ' (Level ' + depth + ')';
        tooltip.style.display = 'block';
      });
      inner.addEventListener('mousemove', function(e) {
        if (tooltip.style.display === 'block') {
          tooltip.style.left = (e.clientX + 12) + 'px';
          tooltip.style.top = (e.clientY + 12) + 'px';
        }
      });
      inner.addEventListener('mouseout', function(e) {
        if (!e.target.closest('.bcm-node')) tooltip.style.display = 'none';
      });
    })();
  </script>
</body>
</html>`;

    return {
      format: 'html',
      content,
      filename: `${options.artifactId}.html`,
      metadata: {
        exportedAt: new Date().toISOString(),
        toolId: options.toolId,
        artifactId: options.artifactId,
      },
    };
  },
};
