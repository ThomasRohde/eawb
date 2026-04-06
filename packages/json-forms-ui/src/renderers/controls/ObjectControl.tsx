import { useMemo } from 'react';
import { Card, Text, makeStyles, tokens } from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsDetailProps } from '@jsonforms/react';
import {
  Generate,
  type StatePropsOfControlWithDetail,
  type UISchemaElement,
} from '@jsonforms/core';

const useStyles = makeStyles({
  card: {
    padding: '8px 12px 12px',
    backgroundColor: tokens.colorNeutralBackground2,
    minWidth: 0,
  },
  header: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground2,
    marginBottom: '8px',
    display: 'block',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
  },
  hidden: { display: 'none' },
});

/**
 * Renders a nested object property: generates a default VerticalLayout from
 * the object's properties and dispatches into it. Wrapped in a low-key card
 * so the user can visually distinguish a sub-object from sibling primitives.
 */
function ObjectControlImpl(props: StatePropsOfControlWithDetail) {
  const styles = useStyles();
  const { schema, uischema, path, renderers, cells, visible, enabled, label } = props;

  const detailUiSchema = useMemo<UISchemaElement>(() => {
    // Honour an explicit `options.detail` uischema if the author provided one.
    const detail = (uischema as { options?: { detail?: UISchemaElement } }).options?.detail;
    if (detail) return detail;
    return Generate.uiSchema(schema, 'VerticalLayout');
  }, [schema, uischema]);

  return (
    <Card className={visible === false ? styles.hidden : styles.card}>
      {label && <Text className={styles.header}>{label}</Text>}
      <div className={styles.body}>
        <JsonFormsDispatch
          schema={schema}
          uischema={detailUiSchema}
          path={path}
          enabled={enabled}
          renderers={renderers}
          cells={cells}
        />
      </div>
    </Card>
  );
}

export const ObjectControl = withJsonFormsDetailProps(ObjectControlImpl);
