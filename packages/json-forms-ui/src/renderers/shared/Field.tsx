import { Field } from '@fluentui/react-components';
import type { JsonSchema } from '@jsonforms/core';
import type { ReactElement } from 'react';

interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  errors?: string;
  visible?: boolean;
  /**
   * Helper text rendered under the control. We map `schema.description`
   * onto this slot in every renderer.
   */
  description?: string;
  /** Manual hint override (takes precedence over `description`). */
  hint?: string;
  children: ReactElement;
}

/**
 * Thin wrapper around Fluent's `Field` that wires up the JSONForms control
 * props (`label`, `required`, `errors`, `visible`, `description`)
 * consistently across every control renderer.
 */
export function FieldWrapper({
  label,
  required,
  errors,
  visible = true,
  description,
  hint,
  children,
}: FieldWrapperProps) {
  if (!visible) return null;
  const hasError = !!errors && errors.length > 0;
  return (
    <Field
      label={label}
      required={required}
      hint={hint ?? description}
      validationState={hasError ? 'error' : undefined}
      validationMessage={hasError ? errors : undefined}
    >
      {children}
    </Field>
  );
}

/**
 * Compute the effective `disabled` flag for an input by combining the
 * JSONForms `enabled` prop with the schema-level `readOnly` flag.
 */
export function isControlDisabled(
  enabled: boolean | undefined,
  schema: JsonSchema | undefined,
): boolean {
  if (enabled === false) return true;
  if (schema && typeof schema === 'object' && 'readOnly' in schema && schema.readOnly === true) {
    return true;
  }
  return false;
}
