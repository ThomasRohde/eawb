import { z } from 'zod';
import type { AIAction } from '../types.js';

export const suggestMerges: AIAction = {
  id: 'bcm.suggest_merges',
  name: 'Suggest Merges',
  description: 'Identify capabilities that could be merged or deduplicated',
  inputSchema: z.object({}),
  contextDescription: 'Full model nodes',
  promptTemplate: `Analyze these business capabilities for potential merges or deduplication opportunities.

Capabilities:
{{capabilities}}

Look for:
- Capabilities with overlapping scope
- Capabilities that are too granular and should be combined
- Near-duplicate capabilities at different levels

Output as JSON:
{
  "suggestions": [
    { "nodeIds": ["...", "..."], "reason": "...", "suggestedName": "...", "confidence": "high|medium|low" }
  ]
}

Return empty suggestions array if no merges are recommended.`,
};
