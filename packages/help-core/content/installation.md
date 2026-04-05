---
title: Installation
category: Getting Started
order: 2
---

# Installation

## Prerequisites

EA Workbench requires the following software:

| Requirement        | Version | Purpose                                 |
| ------------------ | ------- | --------------------------------------- |
| **Node.js**        | 20.0.0+ | Runtime environment                     |
| **Git**            | 2.0+    | Version control for workspace data      |
| **npm**            | 10.0+   | Package management (ships with Node.js) |
| GitHub Copilot CLI | Latest  | _Optional_ — enables AI features        |

### Checking Prerequisites

Run the built-in doctor command to verify your environment:

```bash
eawb doctor
```

This checks each prerequisite and reports any issues with actionable guidance.

## Installation Methods

### Global Install via npm

The simplest way to get started:

```bash
npm install -g ea-workbench
```

After installation, the `eawb` command is available globally.

### Build from Source

For development or to get the latest changes:

```bash
git clone <repo-url>
cd ea-workbench
npm install
npm run build      # Build all packages in dependency order
npm run refresh    # Clean + build + npm link (installs `eawb` globally)
```

The build uses a staged 3-wave process to respect dependency order across the monorepo's 14+ packages.

### Updating

To update a global install:

```bash
npm update -g ea-workbench
```

To update a source build:

```bash
git pull
npm install
npm run refresh
```

## Verifying Installation

After installation, verify everything works:

```bash
eawb --version     # Show version
eawb doctor        # Check prerequisites
eawb --help        # Show available commands
```

## Troubleshooting Installation

### "eawb: command not found"

Your npm global bin directory may not be in your PATH. Find it with:

```bash
npm config get prefix
```

Add the `bin` subdirectory of that path to your system PATH.

### Build Failures

If `npm run build` fails:

1. Ensure you're using Node.js 20+: `node --version`
2. Clear caches: `npm run clean && rm -rf node_modules && npm install`
3. Rebuild: `npm run build`

### Permission Errors on Linux/macOS

Avoid using `sudo` with npm. Instead, configure npm to use a user-writable directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
# Add ~/.npm-global/bin to your PATH
```
