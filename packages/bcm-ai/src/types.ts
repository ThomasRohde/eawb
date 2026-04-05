import { z } from 'zod';

export interface AIAction {
  id: string;
  name: string;
  description: string;
  inputSchema: z.ZodType;
  contextDescription: string;
  promptTemplate: string;
}

export const BcmAIActions = {
  GENERATE_FIRST_LEVEL: 'bcm.generate_first_level',
  EXPAND_NODE: 'bcm.expand_node',
  REVIEW_MECE: 'bcm.review_mece',
  NORMALIZE_NAMES: 'bcm.normalize_names',
  SUGGEST_MERGES: 'bcm.suggest_merges',
  ENRICH_DESCRIPTIONS: 'bcm.enrich_descriptions',
  GENERATE_REVIEW_BRIEF: 'bcm.generate_review_brief',
} as const;
