import { makeStyles } from '@fluentui/react-components';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { TimePicker } from '@fluentui/react-timepicker-compat';
import { withJsonFormsControlProps } from '@jsonforms/react';
import type { ControlProps } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';
import {
  formatIsoDate,
  formatIsoDateTime,
  formatIsoTime,
  parseIsoDateTime,
} from '../shared/timeIso';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    gap: '8px',
    minWidth: 0,
  },
  date: { flex: '2 1 0', minWidth: 0 },
  time: { flex: '1 1 0', minWidth: 0 },
});

/**
 * Compose a new ISO date-time from updated date or time components.
 * Both pieces are required for a valid value — if either is missing the
 * control reports `undefined`.
 */
function composeDateTime(date: Date | null, time: Date | null): string | undefined {
  if (!date || !time) return undefined;
  const merged = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      time.getUTCSeconds(),
    ),
  );
  return formatIsoDateTime(merged);
}

function DateTimeControlImpl(props: ControlProps) {
  const styles = useStyles();
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
  const current = parseIsoDateTime(data);
  const disabled = isControlDisabled(enabled, schema);

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <div className={styles.row}>
        <div className={styles.date}>
          <DatePicker
            value={current}
            disabled={disabled}
            formatDate={formatIsoDate}
            onSelectDate={(nextDate) => {
              handleChange(path, composeDateTime(nextDate ?? null, current));
            }}
            placeholder="yyyy-mm-dd"
          />
        </div>
        <div className={styles.time}>
          <TimePicker
            hour12={false}
            selectedTime={current}
            disabled={disabled}
            formatDateToTimeString={(d: Date) => formatIsoTime(d)}
            onTimeChange={(_e, d) => {
              handleChange(path, composeDateTime(current, d.selectedTime ?? null));
            }}
            placeholder="HH:mm:ss"
          />
        </div>
      </div>
    </FieldWrapper>
  );
}

export const DateTimeControl = withJsonFormsControlProps(DateTimeControlImpl);
