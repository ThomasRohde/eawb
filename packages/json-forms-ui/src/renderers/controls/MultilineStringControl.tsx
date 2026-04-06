import { Textarea } from '@fluentui/react-components';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

function MultilineStringControlImpl(props: ControlProps) {
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
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <Textarea
        value={typeof data === 'string' ? data : ''}
        rows={4}
        resize="vertical"
        disabled={isControlDisabled(enabled, schema)}
        onChange={(_e, d) => handleChange(path, d.value)}
      />
    </FieldWrapper>
  );
}

export const MultilineStringControl = withJsonFormsControlProps(MultilineStringControlImpl);
