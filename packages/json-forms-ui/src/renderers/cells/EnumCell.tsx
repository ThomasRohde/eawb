import { Dropdown, Option } from '@fluentui/react-components';
import { withJsonFormsEnumCellProps } from '@jsonforms/react';
import type { EnumCellProps } from '@jsonforms/core';

function EnumCellImpl(props: EnumCellProps) {
  const { data, handleChange, path, enabled, options = [] } = props;
  const value = data == null ? '' : String(data);
  const selectedText = options.find((o) => String(o.value) === value)?.label ?? '';
  return (
    <Dropdown
      value={selectedText}
      selectedOptions={value ? [value] : []}
      disabled={enabled === false}
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
  );
}

export const EnumCell = withJsonFormsEnumCellProps(EnumCellImpl);
