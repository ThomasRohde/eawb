import { Dropdown, Option } from '@fluentui/react-components';
import { withJsonFormsOneOfEnumProps } from '@jsonforms/react';
import type { ControlProps, OwnPropsOfEnum } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

/**
 * Renders enums declared as `oneOf: [{ const, title }, ...]` so the dropdown
 * shows the human title instead of the raw const value.
 */
function OneOfEnumControlImpl(props: ControlProps & OwnPropsOfEnum) {
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
    options = [],
  } = props;
  const value = data == null ? '' : String(data);
  const selectedText = options.find((o) => String(o.value) === value)?.label ?? '';
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <Dropdown
        value={selectedText}
        selectedOptions={value ? [value] : []}
        disabled={isControlDisabled(enabled, schema)}
        onOptionSelect={(_e, d) => {
          const next = d.optionValue;
          const matched = options.find((o) => String(o.value) === next);
          handleChange(path, matched ? matched.value : next);
        }}
      >
        {options.map((o) => (
          <Option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </Option>
        ))}
      </Dropdown>
    </FieldWrapper>
  );
}

export const OneOfEnumControl = withJsonFormsOneOfEnumProps(OneOfEnumControlImpl);
