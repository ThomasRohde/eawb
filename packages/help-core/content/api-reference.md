---
title: API Reference
category: Reference
order: 44
---

# API Reference

EA Workbench exposes a REST API on `localhost` that all UI panels use. This API is also available for scripting, automation, and integration.

## Base URL

```
http://localhost:{port}/api
```

The port is displayed when starting the server with `eawb open`.

## Response Format

All API responses use a standard envelope:

### Success

```json
{
  "ok": true,
  "data": { ... }
}
```

### Error

```json
{
  "ok": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Health

#### `GET /api/health`

Check server health.

```json
{ "ok": true, "data": { "status": "healthy" } }
```

### Workspace

#### `GET /api/workspace`

Get workspace information.

```json
{
  "ok": true,
  "data": {
    "initialized": true,
    "config": {
      "name": "My Workspace",
      "version": "0.1.0"
    }
  }
}
```

### Tools

#### `GET /api/tools`

List all registered tools.

```json
{
  "ok": true,
  "data": [
    {
      "id": "bcm-studio",
      "name": "BCM Studio",
      "version": "0.1.0",
      "description": "..."
    }
  ]
}
```

### BCM Studio

All BCM routes are prefixed with `/api/tools/bcm-studio`.

#### `GET /api/tools/bcm-studio/models`

List all BCM models.

#### `POST /api/tools/bcm-studio/models`

Create a new model.

**Body**: `{ "title": "Model Name" }`

#### `GET /api/tools/bcm-studio/models/:id`

Get a model's full data (header + all nodes).

#### `POST /api/tools/bcm-studio/models/:id/nodes`

Add a node to a model.

**Body**: `{ "parentId": "node-id" | null, "label": "Name", "description": "" }`

#### `PUT /api/tools/bcm-studio/models/:id/nodes/:nodeId`

Update a node.

**Body**: `{ "label": "New Name", "description": "Updated description" }`

#### `DELETE /api/tools/bcm-studio/models/:id/nodes/:nodeId`

Delete a node and its children.

### AI Chat

All chat routes are prefixed with `/api/tools/acp-chat`.

#### `GET /api/tools/acp-chat/conversations`

List conversations.

#### `POST /api/tools/acp-chat/conversations`

Create a new conversation.

**Body**: `{ "title": "Optional title" }`

#### `GET /api/tools/acp-chat/conversations/:id`

Get a conversation with all messages.

#### `POST /api/tools/acp-chat/conversations/:id/messages`

Send a message and get an AI response.

**Body**: `{ "content": "Your message" }`

#### `DELETE /api/tools/acp-chat/conversations/:id`

Delete a conversation and its ACP session.

### Help

All help routes are prefixed with `/api/tools/help`.

#### `GET /api/tools/help/topics`

List all help topics.

```json
{
  "ok": true,
  "data": [
    {
      "id": "getting-started",
      "title": "Getting Started",
      "category": "Getting Started",
      "order": 1
    },
    { "id": "bcm-overview", "title": "BCM Studio Overview", "category": "BCM Studio", "order": 10 }
  ]
}
```

#### `GET /api/tools/help/topics/:id`

Get a help topic with full Markdown content.

```json
{
  "ok": true,
  "data": {
    "id": "getting-started",
    "title": "Getting Started",
    "category": "Getting Started",
    "order": 1,
    "content": "# Getting Started\n\n..."
  }
}
```

### Export

#### `GET /api/export/formats`

List available export formats.

#### `POST /api/export`

Export an artifact. Requires a JSON body:

| Field        | Type    | Required | Description                                                         |
| ------------ | ------- | -------- | ------------------------------------------------------------------- |
| `format`     | string  | yes      | `markdown`, `html`, or `svg`                                        |
| `toolId`     | string  | yes      | Tool that owns the artifact (e.g. `bcm-studio`)                     |
| `artifactId` | string  | yes      | ID of the artifact to export                                        |
| `save`       | boolean | no       | Write the export to the workspace `architecture/exports/` directory |

```bash
# Export a BCM model to Markdown (use the model ID returned by create/list endpoints)
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{"format":"markdown","toolId":"bcm-studio","artifactId":"a1b2c3d4"}'
```

### WebSocket

#### `ws://localhost:{port}/ws`

Real-time event stream. Events are JSON objects:

```json
{ "type": "chat:chunk", "conversationId": "...", "text": "..." }
{ "type": "chat:done", "conversationId": "..." }
{ "type": "tool:registered", "toolId": "..." }
```

## Using the API with curl

```bash
# List models
curl http://localhost:3000/api/tools/bcm-studio/models

# Create a model
curl -X POST http://localhost:3000/api/tools/bcm-studio/models \
  -H "Content-Type: application/json" \
  -d '{"title":"My Model"}'

# Get help topics
curl http://localhost:3000/api/tools/help/topics

# Read a help topic
curl http://localhost:3000/api/tools/help/topics/getting-started
```
