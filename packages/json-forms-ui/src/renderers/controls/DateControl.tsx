import { DatePicker } from '@fluentui/react-datepicker-compat';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';
import { formatIsoDate, parseIsoDate } from '../shared/timeIso';

function DateControlImpl(props: ControlProps) {
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
  const selected = parseIsoDate(data);
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <DatePicker
        value={selected}
        disabled={isControlDisabled(enabled, schema)}
        formatDate={formatIsoDate}
        onSelectDate={(d) => handleChange(path, d ? formatIsoDate(d) : undefined)}
        placeholder="yyyy-mm-dd"
      />
    </FieldWrapper>
  );
}

export const DateControl = withJsonFormsControlProps(DateControlImpl);
