import { makeStyles } from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    gap: '12px',
    minWidth: 0,
    alignItems: 'flex-start',
  },
  cell: {
    flex: '1 1 0',
    minWidth: 0,
  },
  hidden: {
    display: 'none',
  },
});

function HorizontalLayoutImpl(props: LayoutProps) {
  const styles = useStyles();
  const { uischema, schema, path, renderers, cells, visible, enabled } = props;
  const elements = ((uischema as { elements?: UISchemaElement[] }).elements ??
    []) as UISchemaElement[];

  return (
    <div className={visible === false ? styles.hidden : styles.root}>
      {elements.map((child, idx) => (
        <div key={`${path}-${idx}`} className={styles.cell}>
          <JsonFormsDispatch
            uischema={child}
            schema={schema}
            path={path}
            enabled={enabled}
            renderers={renderers}
            cells={cells}
          />
        </div>
      ))}
    </div>
  );
}

export const HorizontalLayoutRenderer = withJsonFormsLayoutProps(HorizontalLayoutImpl);
