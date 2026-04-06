import { useMemo, useState } from 'react';
import { Combobox, Option } from '@fluentui/react-components';
import { withJsonFormsEnumProps } from '@jsonforms/react';
import type { ControlProps, OwnPropsOfEnum } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

/**
 * Combobox renderer for long enums (>10 entries). Search-as-you-type filters
 * the visible options. Falls back to all options when the typed text matches
 * an existing label exactly.
 */
function LongEnumComboboxControlImpl(props: ControlProps & OwnPropsOfEnum) {
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
  const selectedLabel = options.find((o) => String(o.value) === value)?.label ?? '';
  const [query, setQuery] = useState<string>(selectedLabel);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selectedLabel.toLowerCase()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, selectedLabel]);

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <Combobox
        value={query}
        selectedOptions={value ? [value] : []}
        disabled={isControlDisabled(enabled, schema)}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onOptionSelect={(_e, d) => {
          const next = d.optionValue;
          const matched = options.find((o) => String(o.value) === next);
          handleChange(path, matched ? matched.value : next);
          setQuery(matched?.label ?? next ?? '');
        }}
      >
        {filtered.map((o) => (
          <Option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </Option>
        ))}
      </Combobox>
    </FieldWrapper>
  );
}

export const LongEnumComboboxControl = withJsonFormsEnumProps(LongEnumComboboxControlImpl);
