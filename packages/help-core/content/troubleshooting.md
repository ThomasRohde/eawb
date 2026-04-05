---
title: Troubleshooting
category: Support
order: 50
---

# Troubleshooting

Common issues and their solutions when working with EA Workbench.

## Server Issues

### Server won't start

**Symptom**: `eawb open` fails or hangs.

**Solutions**:

1. Check prerequisites: `eawb doctor`
2. Ensure Node.js 20+ is installed: `node --version`
3. Try a specific port: `eawb open --port 3456`
4. Check if another process is using the port: `lsof -i :3000` (Linux/Mac) or `netstat -ano | findstr :3000` (Windows)

### Port already in use

**Symptom**: "EADDRINUSE" error.

**Solution**: The workbench auto-detects available ports. If you see this error with `--port`, choose a different port or kill the process occupying it.

### Server starts but browser shows blank page

**Symptom**: Browser opens but nothing renders.

**Solutions**:

1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Clear browser cache for localhost
3. Check browser console (F12) for JavaScript errors
4. Rebuild: `npm run refresh` (if running from source)

## Workspace Issues

### "Workspace not initialized"

**Symptom**: Workbench opens but shows workspace is not initialized.

**Solution**: Run `eawb init` in your Git repository root before opening.

### "Not a Git repository"

**Symptom**: `eawb init` fails.

**Solution**: EA Workbench requires a Git repository. Initialize one first:

```bash
git init
git add .
git commit -m "Initial commit"
eawb init
```

### Models not appearing

**Symptom**: The Models panel is empty even though you have `.bcm.jsonl` files.

**Solutions**:

1. Ensure files are in the correct directory: `architecture/bcm-studio/models/`
2. Verify files have the `.bcm.jsonl` extension
3. Check that the first line of each file is a valid header with `_t: "header"`

## AI Issues

### "AI provider not configured"

**Symptom**: AI Chat and AI Actions show this message.

**Solutions**:

1. Install GitHub Copilot CLI: `gh extension install github/gh-copilot`
2. Authenticate: `gh auth login`
3. Verify: `eawb doctor`
4. Restart the workbench after installing Copilot

### AI responses are slow

**Symptom**: Long delay before AI starts responding.

**Solutions**:

1. This is normal for the first request (cold start)
2. Subsequent requests within the same session should be faster
3. Check your internet connection (AI requires network access)

### AI gives poor results

**Tips**:

- Be more specific in your prompts
- Provide context (model name, capability area)
- Use smaller scope — select a specific node rather than the entire model
- Ensure capabilities have descriptions for better context

## Layout Issues

### Panels disappeared

**Solution**: Click **Reset Layout** in the sidebar footer. This restores all default panels.

### Layout looks broken after update

**Solution**: Clear the saved layout from browser storage:

1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Delete the `eawb_layout` key
4. Refresh the page

### Popout windows not working

**Symptom**: Popout button does nothing or shows a blank window.

**Solutions**:

1. Allow popups for localhost in your browser settings
2. Disable popup blockers for the workbench URL
3. Some browsers restrict popups — try Chrome if using another browser

## Build Issues (Development)

### Build fails with type errors

```bash
npm run clean
npm install
npm run build
```

If that doesn't work, try a full reset:

```bash
rm -rf node_modules packages/*/node_modules packages/*/dist
npm install
npm run build
```

### "Module not found" errors

Ensure the build ran in the correct order. The staged build script handles this:

```bash
npm run build    # Uses the multi-wave build script
```

Do NOT use `npm run build --workspaces --if-present` — it runs alphabetically and breaks DTS generation.

## Getting Help

If none of the above resolves your issue:

1. Check the **FAQ** section of this help
2. Review the error message carefully — it often contains the solution
3. Check the server logs in the terminal where `eawb open` is running
4. File an issue on the project's GitHub repository
