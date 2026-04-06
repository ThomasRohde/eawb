import { Input } from '@fluentui/react-components';
import { Link24Regular } from '@fluentui/react-icons';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

function UriControlImpl(props: ControlProps) {
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
      <Input
        type="url"
        contentBefore={<Link24Regular />}
        value={typeof data === 'string' ? data : ''}
        disabled={isControlDisabled(enabled, schema)}
        onChange={(_e, d) => handleChange(path, d.value)}
      />
    </FieldWrapper>
  );
}

export const UriControl = withJsonFormsControlProps(UriControlImpl);
