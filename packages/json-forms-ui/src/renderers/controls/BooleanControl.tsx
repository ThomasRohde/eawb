import { Checkbox } from '@fluentui/react-components';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

function BooleanControlImpl(props: ControlProps) {
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
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <Checkbox
        checked={data === true}
        disabled={isControlDisabled(enabled, schema)}
        label={label}
        onChange={(_e, d) => handleChange(path, d.checked === true)}
      />
    </FieldWrapper>
  );
}

export const BooleanControl = withJsonFormsControlProps(BooleanControlImpl);
