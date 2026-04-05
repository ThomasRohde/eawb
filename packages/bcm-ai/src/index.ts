export { BcmAIActions } from './types.js';
export type { AIAction } from './types.js';
export { generateFirstLevel } from './actions/generate-first-level.js';
export { expandNode } from './actions/expand-node.js';
export { reviewMece } from './actions/review-mece.js';
export { normalizeNames } from './actions/normalize-names.js';
export { suggestMerges } from './actions/suggest-merges.js';
export { enrichDescriptions } from './actions/enrich-descriptions.js';
export { generateReviewBrief } from './actions/generate-review-brief.js';

import { generateFirstLevel } from './actions/generate-first-level.js';
import { expandNode } from './actions/expand-node.js';
import { reviewMece } from './actions/review-mece.js';
import { normalizeNames } from './actions/normalize-names.js';
import { suggestMerges } from './actions/suggest-merges.js';
import { enrichDescriptions } from './actions/enrich-descriptions.js';
import { generateReviewBrief } from './actions/generate-review-brief.js';
import type { AIAction } from './types.js';

export const allBcmActions: AIAction[] = [
  generateFirstLevel,
  expandNode,
  reviewMece,
  normalizeNames,
  suggestMerges,
  enrichDescriptions,
  generateReviewBrief,
];
