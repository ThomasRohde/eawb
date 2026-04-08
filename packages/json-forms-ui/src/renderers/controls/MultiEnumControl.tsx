import { useMemo } from 'react';
import {
  Tag,
  TagPicker,
  TagPickerControl,
  TagPickerGroup,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
} from '@fluentui/react-components';
import { withJsonFormsMultiEnumProps } from '@jsonforms/react';
import type {
  ControlProps,
  DispatchPropsOfMultiEnumControl,
  OwnPropsOfEnum,
} from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

type MultiEnumProps = ControlProps & OwnPropsOfEnum & DispatchPropsOfMultiEnumControl;

/**
 * Renders an `array` of strings constrained by an `items.enum` as a Fluent
 * TagPicker — selected values become removable tags, the dropdown lists
 * the remaining options.
 */
function MultiEnumControlImpl(props: MultiEnumProps) {
  const {
    data,
    addItem,
    removeItem,
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
  const selected = useMemo(
    () => (Array.isArray(data) ? (data as unknown[]).map(String) : []),
    [data],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const disabled = isControlDisabled(enabled, schema);

  const labelFor = (val: string) => options.find((o) => String(o.value) === val)?.label ?? val;

  const handleSelect = (next: string[]) => {
    const nextSet = new Set(next);
    // Adds: in next but not currently selected.
    for (const val of next) {
      if (!selectedSet.has(val)) {
        const matched = options.find((o) => String(o.value) === val);
        addItem(path, matched ? matched.value : val);
      }
    }
    // Removes: currently selected but not in next.
    if (removeItem) {
      for (const val of selected) {
        if (!nextSet.has(val)) {
          const matched = options.find((o) => String(o.value) === val);
          removeItem(path, matched ? matched.value : val);
        }
      }
    }
  };

  const remaining = options.filter((o) => !selectedSet.has(String(o.value)));

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <TagPicker
        selectedOptions={selected}
        disabled={disabled}
        onOptionSelect={(_e, d) => handleSelect(d.selectedOptions)}
      >
        <TagPickerControl>
          <TagPickerGroup>
            {selected.map((val) => (
              <Tag key={val} value={val} shape="rounded">
                {labelFor(val)}
              </Tag>
            ))}
          </TagPickerGroup>
          <TagPickerInput aria-label={label ?? 'Select'} />
        </TagPickerControl>
        <TagPickerList>
          {remaining.length === 0 ? (
            // Fluent UI v9's TagPickerOption doesn't accept `disabled`; cast so
            // the visual placeholder still renders without the prop dropping.
            <TagPickerOption
              key="__none"
              value="__none"
              {...({ disabled: true } as Record<string, unknown>)}
            >
              No more options
            </TagPickerOption>
          ) : (
            remaining.map((o) => (
              <TagPickerOption key={String(o.value)} value={String(o.value)}>
                {o.label}
              </TagPickerOption>
            ))
          )}
        </TagPickerList>
      </TagPicker>
    </FieldWrapper>
  );
}

export const MultiEnumControl = withJsonFormsMultiEnumProps(MultiEnumControlImpl);
