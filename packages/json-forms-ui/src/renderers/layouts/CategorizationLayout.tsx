import { useState } from 'react';
import {
  Tab,
  TabList,
  makeStyles,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';

interface Category {
  type: 'Category';
  label?: string;
  elements?: UISchemaElement[];
}

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
  hidden: {
    display: 'none',
  },
});

function CategorizationLayoutImpl(props: LayoutProps) {
  const styles = useStyles();
  const { uischema, schema, path, renderers, cells, visible, enabled } = props;
  const categories = (
    ((uischema as { elements?: UISchemaElement[] }).elements ?? []) as UISchemaElement[]
  ).filter((e): e is Category => (e as Category).type === 'Category');
  const [active, setActive] = useState(0);

  if (categories.length === 0) return null;
  const safeActive = Math.min(active, categories.length - 1);
  const current = categories[safeActive];

  const onSelect = (_e: SelectTabEvent, data: SelectTabData) => {
    const next = Number(data.value);
    if (!Number.isNaN(next)) setActive(next);
  };

  return (
    <div className={visible === false ? styles.hidden : styles.root}>
      <TabList className={styles.tabs} selectedValue={String(safeActive)} onTabSelect={onSelect}>
        {categories.map((cat, idx) => (
          <Tab key={`${path}-cat-${idx}`} value={String(idx)}>
            {cat.label ?? `Category ${idx + 1}`}
          </Tab>
        ))}
      </TabList>
      <div className={styles.body}>
        {(current.elements ?? []).map((child, idx) => (
          <JsonFormsDispatch
            key={`${path}-${safeActive}-${idx}`}
            uischema={child}
            schema={schema}
            path={path}
            enabled={enabled}
            renderers={renderers}
            cells={cells}
          />
        ))}
      </div>
    </div>
  );
}

export const CategorizationLayoutRenderer = withJsonFormsLayoutProps(CategorizationLayoutImpl);
