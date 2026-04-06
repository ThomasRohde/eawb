import { Input } from '@fluentui/react-components';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

function StringControlImpl(props: ControlProps) {
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
  const maxLength = typeof schema?.maxLength === 'number' ? schema.maxLength : undefined;
  const disabled = isControlDisabled(enabled, schema);
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <Input
        value={typeof data === 'string' ? data : ''}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(_e, d) => handleChange(path, d.value)}
      />
    </FieldWrapper>
  );
}

export const StringControl = withJsonFormsControlProps(StringControlImpl);
