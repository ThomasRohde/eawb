---
title: CLI Reference
category: Reference
order: 40
---

# CLI Reference

The `eawb` command-line interface provides all the commands needed to manage and interact with EA Workbench.

## Global Options

```bash
eawb [command] [options]
```

| Option      | Description           |
| ----------- | --------------------- |
| `--version` | Show version number   |
| `--help`    | Show help             |
| `--debug`   | Enable verbose output |

## Commands

### `eawb open`

Start the workbench server and open the browser. This is the **default command** — running `eawb` with no arguments is equivalent to `eawb open`.

```bash
eawb open
```

**What it does**:

- Starts the Fastify server on `127.0.0.1`
- Binds to port 47120 (or scans up to 100 ports if occupied)
- Opens your default browser to the workbench UI
- Registers all built-in tools (BCM Studio, AI Chat, Editor, Help)
- If the workspace is not initialized, runs the setup flow first

**Options**:

| Option              | Description                                |
| ------------------- | ------------------------------------------ |
| `-p, --port <port>` | Server port (default: `47120`)             |
| `--no-browser`      | Start the server without opening a browser |
| `--debug`           | Enable verbose console output              |

**Examples**:

```bash
# Open with defaults
eawb open

# Use a specific port
eawb open --port 3456

# Start server without opening a browser
eawb open --no-browser

# Verbose output for debugging
eawb open --debug
```

### `eawb init`

Initialize a new EA Workbench workspace in the current directory.

```bash
cd /path/to/your/repo
eawb init
```

**What it does**:

- Creates the `.eawb/` configuration directory
- Creates `config.json` with default settings
- Sets up the directory structure for architecture artifacts
- Ensures the directory is within a Git repository

**Options**:

| Option              | Description            |
| ------------------- | ---------------------- |
| `-n, --name <name>` | Set the workspace name |

### `eawb doctor`

Check that all prerequisites are installed and configured.

```bash
eawb doctor
```

**Checks**:

| Check                 | Pass                  | Fail/Warn                         |
| --------------------- | --------------------- | --------------------------------- |
| Node.js version       | v20+ detected         | Below v20                         |
| Git installation      | Git found in PATH     | Not found                         |
| Git repository        | Current dir is a repo | Warn: will be initialized on init |
| GitHub Copilot CLI    | Copilot available     | Warn: AI features unavailable     |
| Workspace initialized | `.eawb/` found        | Warn: run `eawb init`             |

Exits with code 1 if any check has `fail` status. Warnings do not cause a non-zero exit.

## Exit Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| `0`  | Success                                 |
| `1`  | Error (general failure or failed check) |

## Examples

```bash
# Initialize and open in one go
eawb init && eawb open

# Open on a specific port without browser
eawb open --port 3456 --no-browser

# Check environment
eawb doctor
```
