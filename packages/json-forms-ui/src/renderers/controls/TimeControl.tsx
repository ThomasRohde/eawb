import { TimePicker } from '@fluentui/react-timepicker-compat';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';
import { formatIsoTime, parseIsoTime } from '../shared/timeIso';

function TimeControlImpl(props: ControlProps) {
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
  const selected = parseIsoTime(data);
  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <TimePicker
        hour12={false}
        selectedTime={selected}
        disabled={isControlDisabled(enabled, schema)}
        formatDateToTimeString={(d: Date) => formatIsoTime(d)}
        onTimeChange={(_e, d) => {
          handleChange(path, d.selectedTime ? formatIsoTime(d.selectedTime) : undefined);
        }}
        placeholder="HH:mm:ss"
      />
    </FieldWrapper>
  );
}

export const TimeControl = withJsonFormsControlProps(TimeControlImpl);
