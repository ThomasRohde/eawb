import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '@ea-workbench/shared-schema';

export function generateCopilotAssets(dirPath: string): void {
  const files: Array<{ relativePath: string; content: string }> = [
    {
      relativePath: path.join(PATHS.GITHUB_DIR, 'copilot-instructions.md'),
      content: `# EA Workbench — Copilot Instructions

This repository uses EA Workbench, a repo-native enterprise architecture workbench.

## Architecture artifacts

Architecture artifacts are stored under \`architecture/\` in structured formats:
- \`architecture/bcm-studio/models/*.bcm.jsonl\` — Business Capability Models (JSONL, one node per line)
- \`architecture/decisions/*.md\` — Architecture Decision Records
- \`architecture/reviews/*.md\` — Review briefs

## Conventions

- BCM model files use JSONL format with a header line followed by node lines
- Each node has: id (UUID), name, parent (UUID or null), order, description, metadata
- Models follow MECE principles (Mutually Exclusive, Collectively Exhaustive)
- Use architecture-first terminology: capabilities, models, checkpoints (not commits)
`,
    },
    {
      relativePath: path.join(PATHS.GITHUB_AGENTS_DIR, 'bcm-modeler.md'),
      content: `# BCM Modeler Agent

You are an expert in Business Capability Modeling for enterprise architecture.

## Role
Help architects create, refine, and decompose business capability models.

## Guidelines
- Follow MECE principles when decomposing capabilities
- Use clear, business-oriented naming (verb-noun or noun phrases)
- Aim for 5-9 capabilities at each level
- Provide descriptions that clarify scope and boundaries
- Consider industry reference models as starting points
- Output structured JSON matching the BCM node schema
`,
    },
    {
      relativePath: path.join(PATHS.GITHUB_AGENTS_DIR, 'bcm-reviewer.md'),
      content: `# BCM Reviewer Agent

You are an expert reviewer of Business Capability Models.

## Role
Critique capability models for completeness, clarity, and structural quality.

## Review criteria
- MECE compliance: are capabilities mutually exclusive and collectively exhaustive?
- Naming consistency: are names at the same level using consistent patterns?
- Depth balance: is the tree reasonably balanced or are some branches much deeper?
- Overlap detection: are there capabilities that overlap in scope?
- Gap identification: are there missing capabilities for the domain?
- Description quality: do descriptions clearly define scope and boundaries?
`,
    },
    {
      relativePath: path.join(PATHS.GITHUB_AGENTS_DIR, 'ea-brief-writer.md'),
      content: `# EA Brief Writer Agent

You are an expert at writing architecture review briefs and summaries.

## Role
Draft architecture briefs, review summaries, and stakeholder communications based on the artifacts in this repository.

## Guidelines
- Write concise, executive-friendly summaries
- Reference specific capabilities and decisions by name
- Highlight risks, open questions, and recommended actions
- Use the architecture artifacts as the source of truth
`,
    },
  ];

  for (const file of files) {
    const fullPath = path.join(dirPath, file.relativePath);
    // Only write if file doesn't exist (user-editable after creation)
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, file.content);
    }
  }
}
