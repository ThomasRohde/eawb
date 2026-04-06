import { Button, Input, makeStyles, tokens, Text } from '@fluentui/react-components';
import {
  Add24Regular,
  ChevronDown24Regular,
  ChevronUp24Regular,
  Delete24Regular,
} from '@fluentui/react-icons';
import { withJsonFormsArrayControlProps } from '@jsonforms/react';
import type { ArrayControlProps, JsonSchema } from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

const useStyles = makeStyles({
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  input: {
    flex: 1,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  hidden: {
    display: 'none',
  },
});

function emptyValueFor(itemSchema: JsonSchema | undefined): unknown {
  switch (itemSchema?.type) {
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
}

function PrimitiveArrayControlImpl(props: ArrayControlProps) {
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
  const items = (Array.isArray(data) ? data : []) as unknown[];
  const itemSchema = (schema?.items ?? undefined) as JsonSchema | undefined;
  const isNumeric = itemSchema?.type === 'integer' || itemSchema?.type === 'number';
  const disabled = isControlDisabled(enabled, schema);
  const minItems = typeof schema?.minItems === 'number' ? schema.minItems : 0;
  const maxItems =
    typeof schema?.maxItems === 'number' ? schema.maxItems : Number.POSITIVE_INFINITY;

  const setItems = (next: unknown[]) => handleChange(path, next);

  const updateItem = (index: number, value: unknown) => {
    const next = items.slice();
    next[index] = value;
    setItems(next);
  };

  const removeItem = (index: number) => {
    const next = items.slice();
    next.splice(index, 1);
    setItems(next);
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [removed] = next.splice(from, 1);
    next.splice(to, 0, removed);
    setItems(next);
  };

  const addItem = () => setItems([...items, emptyValueFor(itemSchema)]);

  const canAdd = !disabled && items.length < maxItems;
  const canRemove = !disabled && items.length > minItems;

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <div className={visible === false ? styles.hidden : styles.rows}>
        {items.length === 0 && <Text className={styles.empty}>No items.</Text>}
        {items.map((value, idx) => (
          <div key={`${path}-${idx}`} className={styles.row}>
            <Input
              className={styles.input}
              value={value == null ? '' : String(value)}
              type={isNumeric ? 'number' : 'text'}
              disabled={disabled}
              onChange={(_e, d) => {
                if (isNumeric) {
                  if (d.value === '') {
                    updateItem(idx, undefined);
                    return;
                  }
                  const parsed =
                    itemSchema?.type === 'integer'
                      ? Number.parseInt(d.value, 10)
                      : Number.parseFloat(d.value);
                  if (!Number.isNaN(parsed)) updateItem(idx, parsed);
                } else {
                  updateItem(idx, d.value);
                }
              }}
            />
            <Button
              icon={<ChevronUp24Regular />}
              appearance="subtle"
              size="small"
              aria-label={`Move item ${idx + 1} up`}
              disabled={disabled || idx === 0}
              onClick={() => moveItem(idx, idx - 1)}
            />
            <Button
              icon={<ChevronDown24Regular />}
              appearance="subtle"
              size="small"
              aria-label={`Move item ${idx + 1} down`}
              disabled={disabled || idx === items.length - 1}
              onClick={() => moveItem(idx, idx + 1)}
            />
            <Button
              icon={<Delete24Regular />}
              appearance="subtle"
              size="small"
              aria-label={`Remove item ${idx + 1}`}
              disabled={!canRemove}
              onClick={() => removeItem(idx)}
            />
          </div>
        ))}
        {!disabled && (
          <div>
            <Button
              icon={<Add24Regular />}
              appearance="secondary"
              size="small"
              disabled={!canAdd}
              onClick={addItem}
            >
              Add
            </Button>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

export const PrimitiveArrayControl = withJsonFormsArrayControlProps(PrimitiveArrayControlImpl);
