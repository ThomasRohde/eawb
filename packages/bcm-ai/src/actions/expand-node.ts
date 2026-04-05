import { z } from 'zod';
import type { AIAction } from '../types.js';

export const expandNode: AIAction = {
  id: 'bcm.expand_node',
  name: 'Expand into Sub-capabilities',
  description: 'Decompose a capability into sub-capabilities',
  inputSchema: z.object({
    nodeName: z.string().describe('Name of the capability to expand'),
    nodeDescription: z.string().optional().describe('Current description'),
    siblingNames: z.array(z.string()).optional().describe('Names of sibling capabilities for context'),
    targetCount: z.number().int().min(2).max(10).optional(),
  }),
  contextDescription: 'Selected node and its context in the hierarchy',
  promptTemplate: `You are an expert enterprise architect. Decompose the following business capability into sub-capabilities.

Capability: {{nodeName}}
{{#nodeDescription}}Description: {{nodeDescription}}{{/nodeDescription}}
{{#siblingNames}}Siblings: {{siblingNames}}{{/siblingNames}}

Requirements:
- Follow MECE principles
- Sub-capabilities should be at a consistent level of abstraction
- Aim for {{targetCount}} sub-capabilities
- Each should be clearly scoped

Output as JSON array:
[
  { "name": "Sub-capability Name", "description": "Brief scope description", "order": 0 },
  ...
]`,
};
