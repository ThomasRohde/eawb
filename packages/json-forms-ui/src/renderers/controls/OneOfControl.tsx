import { useMemo, useState } from 'react';
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsOneOfProps } from '@jsonforms/react';
import {
  createCombinatorRenderInfos,
  type CombinatorRendererProps,
  type ControlElement,
  type JsonSchema,
} from '@jsonforms/core';
import { FieldWrapper } from '../shared/Field';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  tabs: {
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    marginBottom: '12px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
  },
});

/**
 * `oneOf` combinator renderer. Each branch is a tab; selecting a tab
 * dispatches into that branch's UI schema. We do NOT clear data on tab
 * change — schema validation is the user's signal that the active branch
 * does not match.
 */
function OneOfControlImpl(props: CombinatorRendererProps) {
  const styles = useStyles();
  const {
    schema,
    rootSchema,
    path,
    uischema,
    visible,
    label,
    required,
    errors,
    description,
    renderers,
    cells,
    indexOfFittingSchema,
    uischemas,
  } = props;

  const branches = (schema.oneOf ?? []) as JsonSchema[];

  const renderInfos = useMemo(
    () =>
      createCombinatorRenderInfos(
        branches,
        rootSchema,
        'oneOf',
        uischema as ControlElement,
        path,
        uischemas ?? [],
      ),
    [branches, rootSchema, uischema, path, uischemas],
  );

  // Default to the schema that already fits the data (or the first branch).
  const initial =
    typeof indexOfFittingSchema === 'number' && indexOfFittingSchema >= 0
      ? indexOfFittingSchema
      : 0;
  const [active, setActive] = useState<number>(initial);

  if (renderInfos.length === 0) return null;
  const safeActive = Math.min(active, renderInfos.length - 1);
  const current = renderInfos[safeActive];

  const onSelect = (_e: SelectTabEvent, data: SelectTabData) => {
    const next = Number(data.value);
    if (!Number.isNaN(next)) setActive(next);
  };

  return (
    <FieldWrapper
      label={label}
      required={required}
      errors={errors}
      visible={visible}
      description={description ?? schema.description}
    >
      <div className={styles.root}>
        <TabList className={styles.tabs} selectedValue={String(safeActive)} onTabSelect={onSelect}>
          {renderInfos.map((info, idx) => (
            <Tab key={`${path}-oneof-${idx}`} value={String(idx)}>
              {info.label || `Option ${idx + 1}`}
            </Tab>
          ))}
        </TabList>
        <div className={styles.body}>
          <JsonFormsDispatch
            schema={current.schema}
            uischema={current.uischema}
            path={path}
            renderers={renderers}
            cells={cells}
          />
        </div>
      </div>
    </FieldWrapper>
  );
}

export const OneOfControl = withJsonFormsOneOfProps(OneOfControlImpl);
