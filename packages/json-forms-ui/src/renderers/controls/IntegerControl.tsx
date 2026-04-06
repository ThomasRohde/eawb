import { SpinButton } from '@fluentui/react-components';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

function IntegerControlImpl(props: ControlProps) {
  const {
    data,
    handleChange,
    path,
    label,
    required,
    errors,
    visible,
    enabled,
    schema,
    description,
  } = props;
  const min = typeof schema?.minimum === 'number' ? schema.minimum : undefined;
  const max = typeof schema?.maximum === 'number' ? schema.maximum : undefined;
  const value = typeof data === 'number' ? data : null;
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <SpinButton
        value={value}
        displayValue={value === null ? '' : String(value)}
        min={min}
        max={max}
        step={1}
        disabled={isControlDisabled(enabled, schema)}
        onChange={(_e, d) => {
          if (typeof d.value === 'number') {
            handleChange(path, Math.trunc(d.value));
            return;
          }
          if (typeof d.displayValue === 'string') {
            const trimmed = d.displayValue.trim();
            if (trimmed === '') {
              handleChange(path, undefined);
              return;
            }
            const parsed = Number.parseInt(trimmed, 10);
            if (!Number.isNaN(parsed)) handleChange(path, parsed);
          }
        }}
      />
    </FieldWrapper>
  );
}

export const IntegerControl = withJsonFormsControlProps(IntegerControlImpl);
