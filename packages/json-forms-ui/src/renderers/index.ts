import {
  and,
  isBooleanControl,
  isDateControl,
  isDateTimeControl,
  isEnumControl,
  isIntegerControl,
  isMultiLineControl,
  isNumberControl,
  isObjectArrayControl,
  isObjectControl,
  isOneOfControl,
  isOneOfEnumControl,
  isPrimitiveArrayControl,
  isStringControl,
  isTimeControl,
  rankWith,
  uiTypeIs,
  type JsonFormsCellRendererRegistryEntry,
  type JsonFormsRendererRegistryEntry,
} from '@jsonforms/core';

import { BooleanControl } from './controls/BooleanControl';
import { DateControl } from './controls/DateControl';
import { DateTimeControl } from './controls/DateTimeControl';
import { EmailControl } from './controls/EmailControl';
import { EnumControl } from './controls/EnumControl';
import { IntegerControl } from './controls/IntegerControl';
import { LongEnumComboboxControl } from './controls/LongEnumComboboxControl';
import { MultiEnumControl } from './controls/MultiEnumControl';
import { MultilineStringControl } from './controls/MultilineStringControl';
import { NumberControl } from './controls/NumberControl';
import { ObjectControl } from './controls/ObjectControl';
import { OneOfControl } from './controls/OneOfControl';
import { OneOfEnumControl } from './controls/OneOfEnumControl';
import { StringControl } from './controls/StringControl';
import { TimeControl } from './controls/TimeControl';
import { UriControl } from './controls/UriControl';

import { CategorizationLayoutRenderer } from './layouts/CategorizationLayout';
import { GroupLayoutRenderer } from './layouts/GroupLayout';
import { HorizontalLayoutRenderer } from './layouts/HorizontalLayout';
import { VerticalLayoutRenderer } from './layouts/VerticalLayout';

import { ObjectArrayControl } from './arrays/ObjectArrayControl';
import { PrimitiveArrayControl } from './arrays/PrimitiveArrayControl';

import { EnumCell } from './cells/EnumCell';
import { StringCell } from './cells/StringCell';

import {
  hasManyEnumOptions,
  isFormatStringControl,
  isPlainStringControl,
  itemsHaveEnum,
} from './shared/testers';

export const fluentRenderers: JsonFormsRendererRegistryEntry[] = [
  // ---- v1 controls (rank 5) ----
  { tester: rankWith(5, isPlainStringControl), renderer: StringControl },
  { tester: rankWith(5, isMultiLineControl), renderer: MultilineStringControl },
  { tester: rankWith(5, isEnumControl), renderer: EnumControl },
  { tester: rankWith(5, isDateControl), renderer: DateControl },
  { tester: rankWith(5, isIntegerControl), renderer: IntegerControl },
  { tester: rankWith(5, isNumberControl), renderer: NumberControl },
  { tester: rankWith(5, isBooleanControl), renderer: BooleanControl },

  // v1 arrays (rank 5)
  { tester: rankWith(5, isPrimitiveArrayControl), renderer: PrimitiveArrayControl },
  { tester: rankWith(5, isObjectArrayControl), renderer: ObjectArrayControl },

  // v1 layouts (rank 5)
  { tester: rankWith(5, uiTypeIs('VerticalLayout')), renderer: VerticalLayoutRenderer },
  { tester: rankWith(5, uiTypeIs('HorizontalLayout')), renderer: HorizontalLayoutRenderer },
  { tester: rankWith(5, uiTypeIs('Group')), renderer: GroupLayoutRenderer },
  { tester: rankWith(5, uiTypeIs('Categorization')), renderer: CategorizationLayoutRenderer },

  // ---- v2 additions (rank 6) ----

  // Nested object detail.
  { tester: rankWith(6, isObjectControl), renderer: ObjectControl },

  // String formats: time / date-time / email / uri / url.
  { tester: rankWith(6, isTimeControl), renderer: TimeControl },
  { tester: rankWith(6, isDateTimeControl), renderer: DateTimeControl },
  { tester: rankWith(6, isFormatStringControl('email')), renderer: EmailControl },
  { tester: rankWith(6, isFormatStringControl('uri')), renderer: UriControl },
  { tester: rankWith(6, isFormatStringControl('url')), renderer: UriControl },

  // Enum specialisations: oneOf-titled enums and long-enum combobox.
  { tester: rankWith(6, isOneOfEnumControl), renderer: OneOfEnumControl },
  {
    tester: rankWith(6, and(isEnumControl, hasManyEnumOptions)),
    renderer: LongEnumComboboxControl,
  },

  // Multi-select enum (array of enum strings).
  {
    tester: rankWith(6, and(isPrimitiveArrayControl, itemsHaveEnum)),
    renderer: MultiEnumControl,
  },

  // oneOf combinator.
  { tester: rankWith(6, isOneOfControl), renderer: OneOfControl },
];

export const fluentCells: JsonFormsCellRendererRegistryEntry[] = [
  { tester: rankWith(5, isStringControl), cell: StringCell },
  { tester: rankWith(5, isEnumControl), cell: EnumCell },
];
