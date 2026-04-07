---
title: GitHub Credentials
category: Guides
order: 36
---

# Setting up GitHub Credentials

EA Workbench uses your machine's git credentials to talk to GitHub. The Sync button in the Version History panel will fail with an authentication error until your credentials are set up. This guide walks you through the two common options.

## Option 1: Git Credential Manager (Windows / macOS)

If you installed Git for Windows, **Git Credential Manager** is already included. The first time you push or pull from a private GitHub repo, a browser window opens and prompts you to sign in. After that, your credentials are cached securely and Sync just works.

To verify Git Credential Manager is configured:

```bash
git config --global credential.helper
```

You should see `manager` (Windows) or `osxkeychain` (macOS).

If nothing is set, install or repair **Git for Windows** from <https://git-scm.com/download/win> — make sure "Git Credential Manager" is checked in the installer.

## Option 2: Personal Access Token (HTTPS)

If you prefer not to use a credential manager, you can use a **Personal Access Token (PAT)** as your password.

1. Go to <https://github.com/settings/tokens?type=beta>
2. Click **Generate new token**
3. Give it a name (e.g. "EA Workbench")
4. Under **Repository access**, pick the repos you want to push to
5. Under **Repository permissions**, grant **Contents: Read and write**
6. Click **Generate token** and copy it (you won't see it again)
7. The next time the workbench prompts you for a password, paste the token

## Option 3: SSH key

If you already use SSH for other GitHub work, the workbench will pick it up automatically — there is nothing to configure inside the workbench.

If you don't have an SSH key yet:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

Press Enter to accept the defaults. Then add the public key (`~/.ssh/id_ed25519.pub`) to your GitHub account at <https://github.com/settings/keys>.

After setup, change your remote URL in the workbench from `https://...` to `git@github.com:owner/repo.git` via the **⋯ → Change remote URL** menu.

## Testing your credentials

Open a terminal in your workspace and run:

```bash
git ls-remote
```

If this prints a list of refs, your credentials work and Sync will succeed. If you see an error, fix it here before retrying in the workbench.

## Still stuck?

- Make sure you set the correct remote URL (HTTPS vs SSH).
- For private repos, make sure your token or SSH key has access to that specific repository.
- Try `git fetch` from a terminal — the error message there is usually more detailed than the one shown in the workbench.
