import { Card, CardHeader, Text, makeStyles, tokens } from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';

const useStyles = makeStyles({
  card: {
    padding: '12px 16px 16px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    marginBottom: '8px',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
  },
  hidden: {
    display: 'none',
  },
});

function GroupLayoutImpl(props: LayoutProps) {
  const styles = useStyles();
  const { uischema, schema, path, renderers, cells, visible, enabled, label } = props;
  const groupLabel = label ?? (uischema as { label?: string }).label;
  const elements = ((uischema as { elements?: UISchemaElement[] }).elements ??
    []) as UISchemaElement[];

  return (
    <Card className={visible === false ? styles.hidden : styles.card}>
      {groupLabel && (
        <CardHeader
          className={styles.header}
          header={<Text weight="semibold">{groupLabel}</Text>}
        />
      )}
      <div className={styles.body}>
        {elements.map((child, idx) => (
          <JsonFormsDispatch
            key={`${path}-${idx}`}
            uischema={child}
            schema={schema}
            path={path}
            enabled={enabled}
            renderers={renderers}
            cells={cells}
          />
        ))}
      </div>
    </Card>
  );
}

export const GroupLayoutRenderer = withJsonFormsLayoutProps(GroupLayoutImpl);
