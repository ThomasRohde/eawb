import type { BcmModel } from '../schemas/model.js';
import {
  type Diagnostic,
  validateUniqueIds,
  validateParentRefs,
  validateNoCycles,
  validateNonEmptyNames,
  validateSiblingOrder,
} from './rules.js';

export function validateModel(model: BcmModel): Diagnostic[] {
  return [
    ...validateUniqueIds(model),
    ...validateParentRefs(model),
    ...validateNoCycles(model),
    ...validateNonEmptyNames(model),
    ...validateSiblingOrder(model),
  ];
}
