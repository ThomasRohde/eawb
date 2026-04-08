import { useMemo } from 'react';
import { Button, Card, CardHeader, Text, makeStyles, tokens } from '@fluentui/react-components';
import {
  Add24Regular,
  ChevronDown24Regular,
  ChevronUp24Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import type { ComponentType } from 'react';
import { JsonFormsDispatch, withJsonFormsArrayControlProps } from '@jsonforms/react';
import {
  Generate,
  composePaths,
  createDefaultValue,
  type ArrayControlProps,
  type JsonSchema,
  type UISchemaElement,
} from '@jsonforms/core';
import { FieldWrapper, isControlDisabled } from '../shared/Field';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  card: {
    padding: '8px 12px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
  },
  cardHeader: {
    marginBottom: '6px',
  },
  cardActions: {
    display: 'flex',
    gap: '2px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
  hidden: {
    display: 'none',
  },
});

// `withJsonFormsArrayControlProps` injects `handleChange` at runtime, but the
// typings in @jsonforms/core's newer `DispatchPropsOfArrayControl` no longer
// surface it. Widen the prop type locally so we keep the path-based update
// pattern without reaching for a cast.
type ObjectArrayControlImplProps = ArrayControlProps & {
  handleChange: (path: string, value: unknown) => void;
};

function ObjectArrayControlImpl(props: ObjectArrayControlImplProps) {
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
    renderers,
    cells,
    rootSchema,
  } = props;
  const items = (Array.isArray(data) ? data : []) as unknown[];
  const itemSchema = (schema?.items ?? undefined) as JsonSchema | undefined;
  const disabled = isControlDisabled(enabled, schema);
  const minItems = typeof schema?.minItems === 'number' ? schema.minItems : 0;
  const maxItems =
    typeof schema?.maxItems === 'number' ? schema.maxItems : Number.POSITIVE_INFINITY;

  // Generate a default vertical UI schema for the item once per renderer pass.
  const itemUiSchema = useMemo<UISchemaElement | null>(() => {
    if (!itemSchema) return null;
    return Generate.uiSchema(itemSchema, 'VerticalLayout');
  }, [itemSchema]);

  const setItems = (next: unknown[]) => handleChange(path, next);

  const removeAt = (index: number) => {
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

  const addItem = () => {
    if (!itemSchema) {
      setItems([...items, {}]);
      return;
    }
    setItems([...items, createDefaultValue(itemSchema, rootSchema ?? itemSchema)]);
  };

  const canAdd = !disabled && items.length < maxItems;
  const canRemove = !disabled && items.length > minItems;

  const itemLabel = (idx: number) => {
    const base = itemSchema?.title ?? label ?? 'Item';
    return `${base} #${idx + 1}`;
  };

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema?.description}
    >
      <div className={visible === false ? styles.hidden : styles.list}>
        {items.length === 0 && <Text className={styles.empty}>No items.</Text>}
        {items.map((_value, idx) => {
          const childPath = composePaths(path, `${idx}`);
          return (
            <Card key={`${path}-${idx}`} className={styles.card}>
              <CardHeader
                className={styles.cardHeader}
                header={<Text weight="semibold">{itemLabel(idx)}</Text>}
                action={
                  <div className={styles.cardActions}>
                    <Button
                      icon={<ChevronUp24Regular />}
                      appearance="subtle"
                      size="small"
                      aria-label={`Move ${itemLabel(idx)} up`}
                      disabled={disabled || idx === 0}
                      onClick={() => moveItem(idx, idx - 1)}
                    />
                    <Button
                      icon={<ChevronDown24Regular />}
                      appearance="subtle"
                      size="small"
                      aria-label={`Move ${itemLabel(idx)} down`}
                      disabled={disabled || idx === items.length - 1}
                      onClick={() => moveItem(idx, idx + 1)}
                    />
                    <Button
                      icon={<Dismiss24Regular />}
                      appearance="subtle"
                      size="small"
                      aria-label={`Remove ${itemLabel(idx)}`}
                      disabled={!canRemove}
                      onClick={() => removeAt(idx)}
                    />
                  </div>
                }
              />
              <div className={styles.cardBody}>
                {itemSchema && itemUiSchema && (
                  <JsonFormsDispatch
                    uischema={itemUiSchema}
                    schema={itemSchema}
                    path={childPath}
                    enabled={!disabled}
                    renderers={renderers}
                    cells={cells}
                  />
                )}
              </div>
            </Card>
          );
        })}
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

export const ObjectArrayControl = withJsonFormsArrayControlProps(
  ObjectArrayControlImpl as unknown as ComponentType<ArrayControlProps>,
);
