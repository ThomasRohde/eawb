import { TimePicker as RawTimePicker } from '@fluentui/react-timepicker-compat';
import type { ComponentType } from 'react';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';
import { formatIsoTime, parseIsoTime } from '../shared/timeIso';

// Fluent's `TimePicker` is typed through a Combobox generic that doesn't
// resolve its own prop overrides cleanly (`selectedTime`, `onTimeChange`, etc).
// Re-declare the component with the prop shape we actually use so the JSX
// site stays clean.
const TimePicker = RawTimePicker as unknown as ComponentType<{
  hour12?: boolean;
  selectedTime?: Date | null;
  disabled?: boolean;
  formatDateToTimeString?: (d: Date) => string;
  onTimeChange?: (_e: unknown, d: { selectedTime: Date | null; selectedTimeText?: string }) => void;
  placeholder?: string;
}>;

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
