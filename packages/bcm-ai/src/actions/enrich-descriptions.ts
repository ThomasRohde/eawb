import { z } from 'zod';
import type { AIAction } from '../types.js';

export const enrichDescriptions: AIAction = {
  id: 'bcm.enrich_descriptions',
  name: 'Enrich Descriptions',
  description: 'Generate or improve descriptions for capabilities that lack them',
  inputSchema: z.object({
    nodeIds: z.array(z.string()).optional().describe('Specific nodes to enrich (all if omitted)'),
  }),
  contextDescription: 'Nodes with empty or short descriptions',
  promptTemplate: `Generate concise, clear descriptions for these business capabilities. Each description should define the scope and boundaries of the capability.

Model: {{modelTitle}}
Capabilities needing descriptions:
{{capabilities}}

Requirements:
- Each description should be 1-2 sentences
- Clarify what is IN scope and what is OUT of scope
- Use business language, not technical jargon

Output as JSON array:
[
  { "nodeId": "...", "description": "..." }
]`,
};
