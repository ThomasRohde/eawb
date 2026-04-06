import { makeStyles, tokens } from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: 0,
  },
  hidden: {
    display: 'none',
  },
});

function VerticalLayoutImpl(props: LayoutProps) {
  const styles = useStyles();
  const { uischema, schema, path, renderers, cells, visible, enabled } = props;
  const elements = ((uischema as { elements?: UISchemaElement[] }).elements ??
    []) as UISchemaElement[];

  return (
    <div className={visible === false ? styles.hidden : styles.root}>
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
  );
}

export const VerticalLayoutRenderer = withJsonFormsLayoutProps(VerticalLayoutImpl);

// Background — used as the body of Group/Categorization renderers too. Re-export
// keeps the import surface compact.
export { useStyles as useVerticalLayoutStyles };
// Re-export tokens to silence "imported but unused" if extending later.
export const _tokens = tokens;
