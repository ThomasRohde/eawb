import { z } from 'zod';
import type { AIAction } from '../types.js';

export const normalizeNames: AIAction = {
  id: 'bcm.normalize_names',
  name: 'Normalize Names',
  description: 'Suggest consistent naming conventions across the model',
  inputSchema: z.object({}),
  contextDescription: 'All node names in the model',
  promptTemplate: `Review these capability names for naming consistency and suggest improvements.

Capabilities:
{{capabilities}}

Rules:
- Use consistent grammatical form (noun phrases preferred)
- Avoid abbreviations unless industry-standard
- Ensure names are self-explanatory
- Keep names concise but descriptive

Output as JSON array of suggested renames:
[
  { "nodeId": "...", "currentName": "...", "suggestedName": "...", "reason": "..." }
]

Only include nodes that should be renamed. Return empty array if all names are good.`,
};
