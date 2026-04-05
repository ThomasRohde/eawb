import { z } from 'zod';
import type { AIAction } from '../types.js';

export const generateFirstLevel: AIAction = {
  id: 'bcm.generate_first_level',
  name: 'Generate First-Level Capabilities',
  description: 'Generate top-level capability decomposition for an organization or domain',
  inputSchema: z.object({
    context: z.string().min(10).describe('Organization or domain description'),
    targetCount: z.number().int().min(3).max(15).optional().describe('Target number of top-level capabilities'),
  }),
  contextDescription: 'Model header (title, description, kind)',
  promptTemplate: `You are an expert enterprise architect specializing in Business Capability Modeling.

Given the following organization/domain context, generate a first-level capability decomposition.

Context: {{context}}
Model: {{modelTitle}}

Requirements:
- Follow MECE principles (Mutually Exclusive, Collectively Exhaustive)
- Use clear, business-oriented naming (noun phrases preferred)
- Aim for {{targetCount}} capabilities
- Each capability should represent a distinct business function
- Provide a brief description for each capability

Output as JSON array:
[
  { "name": "Capability Name", "description": "Brief scope description", "order": 0 },
  ...
]`,
};
