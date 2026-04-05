import { z } from 'zod';
import type { AIAction } from '../types.js';

export const reviewMece: AIAction = {
  id: 'bcm.review_mece',
  name: 'Review MECE Quality',
  description: 'Critique the model for MECE compliance, gaps, and overlaps',
  inputSchema: z.object({
    scope: z.enum(['full', 'subtree']).default('full'),
    rootNodeId: z.string().optional().describe('Root of subtree to review (if scope=subtree)'),
  }),
  contextDescription: 'Full model or subtree nodes',
  promptTemplate: `You are an expert reviewer of Business Capability Models. Analyze this capability structure for MECE quality.

Model: {{modelTitle}}
Capabilities:
{{capabilities}}

Review for:
1. Mutual Exclusivity: Are there overlapping capabilities?
2. Collective Exhaustiveness: Are there gaps or missing capabilities?
3. Naming consistency: Are names at the same level using consistent patterns?
4. Depth balance: Is the tree reasonably balanced?
5. Abstraction level: Are siblings at a consistent level of abstraction?

Output as JSON:
{
  "overallScore": "good|fair|poor",
  "findings": [
    { "type": "overlap|gap|naming|balance|abstraction", "severity": "high|medium|low", "message": "...", "nodeIds": [...] }
  ],
  "suggestions": ["..."]
}`,
};
