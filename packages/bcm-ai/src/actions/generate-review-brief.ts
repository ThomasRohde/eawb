import { z } from 'zod';
import type { AIAction } from '../types.js';

export const generateReviewBrief: AIAction = {
  id: 'bcm.generate_review_brief',
  name: 'Generate Review Brief',
  description: 'Generate a review brief summarizing the model for stakeholder review',
  inputSchema: z.object({
    audience: z.enum(['executive', 'technical', 'governance']).default('executive'),
  }),
  contextDescription: 'Full model with all nodes and descriptions',
  promptTemplate: `Generate a review brief for this Business Capability Model.

Model: {{modelTitle}}
Description: {{modelDescription}}
Audience: {{audience}}
Capabilities:
{{capabilities}}

The brief should include:
1. Executive summary (2-3 sentences)
2. Key capabilities overview
3. Coverage assessment
4. Open questions for reviewers
5. Recommendations

Output as markdown.`,
};
