import {
  and,
  isDateControl,
  isDateTimeControl,
  isEnumControl,
  isMultiLineControl,
  isPrimitiveArrayControl,
  isStringControl,
  isTimeControl,
  not,
  type Tester,
} from '@jsonforms/core';

/**
 * String control that is NOT a multiline / date / date-time / time / enum /
 * email / uri specialisation, so the plain `StringControl` doesn't shadow them
 * when registered at the same rank.
 */
const isFormatString =
  (format: string): Tester =>
  (uischema, schema, ctx) => {
    if (!isStringControl(uischema, schema, ctx)) return false;
    // Resolve the schema for the scoped property — testers receive the root
    // schema; @jsonforms/core's `isStringControl` already validates that the
    // referenced property exists, so we just check the format on it.
    const ref = (uischema as { scope?: string }).scope;
    if (!ref) return false;
    const propName = ref.split('/').pop();
    if (!propName) return false;
    const sub = (schema as { properties?: Record<string, { format?: string }> }).properties?.[
      propName
    ];
    return sub?.format === format;
  };

export const isFormatStringControl = (format: string): Tester => isFormatString(format);

export const isPlainStringControl: Tester = and(
  isStringControl,
  not(isMultiLineControl),
  not(isDateControl),
  not(isDateTimeControl),
  not(isTimeControl),
  not(isEnumControl),
  not(isFormatString('email')),
  not(isFormatString('uri')),
  not(isFormatString('url')),
);

/**
 * True when the enum has more than 10 entries (either via `schema.enum`
 * or `schema.oneOf`). Used to switch to a Combobox renderer.
 */
export const hasManyEnumOptions: Tester = (uischema, schema, ctx) => {
  if (!isEnumControl(uischema, schema, ctx)) return false;
  const ref = (uischema as { scope?: string }).scope;
  if (!ref) return false;
  const propName = ref.split('/').pop();
  if (!propName) return false;
  const sub = (schema as { properties?: Record<string, { enum?: unknown[]; oneOf?: unknown[] }> })
    .properties?.[propName];
  if (!sub) return false;
  if (Array.isArray(sub.enum) && sub.enum.length > 10) return true;
  if (Array.isArray(sub.oneOf) && sub.oneOf.length > 10) return true;
  return false;
};

/**
 * True for a primitive-array control whose `items` schema declares an enum.
 * Used to route to the multi-enum renderer instead of plain primitive array.
 */
export const itemsHaveEnum: Tester = (uischema, schema, ctx) => {
  if (!isPrimitiveArrayControl(uischema, schema, ctx)) return false;
  const ref = (uischema as { scope?: string }).scope;
  if (!ref) return false;
  const propName = ref.split('/').pop();
  if (!propName) return false;
  const sub = (
    schema as {
      properties?: Record<string, { items?: { enum?: unknown[] } }>;
    }
  ).properties?.[propName];
  const itemEnum = sub?.items?.enum;
  return Array.isArray(itemEnum) && itemEnum.length > 0;
};
