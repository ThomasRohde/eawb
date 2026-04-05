---
title: Data Formats
category: Reference
order: 42
---

# Data Formats

EA Workbench stores all data as plain files in your Git repository. Understanding the file formats helps with debugging, scripting, and advanced workflows.

## BCM Model Format (`.bcm.jsonl`)

BCM models use **JSONL** (JSON Lines) — one JSON object per line.

### Header Line

The first line is always a header:

```json
{
  "_t": "header",
  "id": "f47ac10b",
  "title": "Enterprise Capabilities",
  "version": "0.1.0",
  "created": "2026-04-04T10:00:00.000Z"
}
```

| Field     | Type       | Description                 |
| --------- | ---------- | --------------------------- |
| `_t`      | `"header"` | Line type discriminator     |
| `id`      | string     | Unique model identifier     |
| `title`   | string     | Human-readable model name   |
| `version` | string     | Model version               |
| `created` | string     | ISO 8601 creation timestamp |

### Node Lines

All subsequent lines are capability nodes:

```json
{"id":"a1b2c3","parentId":null,"label":"Customer Management","description":"Managing customer relationships","order":0}
{"id":"d4e5f6","parentId":"a1b2c3","label":"Customer Acquisition","description":"","order":0}
{"id":"g7h8i9","parentId":"a1b2c3","label":"Customer Retention","description":"","order":1}
```

| Field         | Type           | Description                  |
| ------------- | -------------- | ---------------------------- |
| `id`          | string         | Unique node identifier       |
| `parentId`    | string \| null | Parent node ID (null = root) |
| `label`       | string         | Capability name              |
| `description` | string         | Capability description       |
| `order`       | number         | Sort position among siblings |

### Ordering

Nodes are written in **deterministic depth-first order**. This ensures:

- Consistent file output regardless of edit sequence
- Clean Git diffs (no spurious line reordering)
- Predictable merge behavior

### Line Endings

Model files always use **LF** line endings (enforced by `.gitattributes`). This prevents Windows/Unix line-ending conflicts in Git.

## Workspace Configuration (`.eawb/config.json`)

```json
{
  "name": "My Workspace",
  "version": "0.1.0"
}
```

A simple JSON file with workspace metadata.

## Markdown Documents (`.md`)

Standard Markdown files stored in `architecture/documents/`. No special format — any Markdown editor can open them.

## SQLite Database

The runtime uses an SQLite database (in `.eawb/`) for operational metadata. This is not intended for direct access — it stores:

- Session state
- Caching metadata
- Temporary operational data

The database is excluded from version control (`.gitignore`).

## Working with Data Programmatically

Because all data is plain files, you can:

### Read Models with jq

```bash
# List all capability names
cat architecture/bcm-studio/models/enterprise.bcm.jsonl | tail -n +2 | jq -r '.label'

# Count capabilities
cat architecture/bcm-studio/models/enterprise.bcm.jsonl | tail -n +2 | wc -l

# Find root capabilities
cat architecture/bcm-studio/models/enterprise.bcm.jsonl | tail -n +2 | jq 'select(.parentId == null)'
```

### Validate with Node.js

```javascript
import { readFileSync } from 'fs';

const lines = readFileSync('model.bcm.jsonl', 'utf-8').split('\n').filter(Boolean);
const header = JSON.parse(lines[0]);
console.assert(header._t === 'header', 'First line must be a header');

const nodes = lines.slice(1).map((l) => JSON.parse(l));
console.log(`Model "${header.title}" has ${nodes.length} capabilities`);
```

### Scripted Modifications

You can write scripts to batch-modify model files. Just ensure:

1. The header remains on line 1
2. Each subsequent line is a valid node JSON object
3. All IDs are unique
4. Parent references are valid (or null for roots)
5. The file ends with a newline
