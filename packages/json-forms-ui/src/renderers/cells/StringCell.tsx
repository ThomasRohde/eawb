import { Input } from '@fluentui/react-components';
import { withJsonFormsCellProps } from '@jsonforms/react';
import type { CellProps } from '@jsonforms/core';

function StringCellImpl(props: CellProps) {
  const { data, handleChange, path, enabled, schema } = props;
  const maxLength = typeof schema?.maxLength === 'number' ? schema.maxLength : undefined;
  return (
    <Input
      value={typeof data === 'string' ? data : ''}
      maxLength={maxLength}
      disabled={enabled === false}
      onChange={(_e, d) => handleChange(path, d.value)}
    />
  );
}

export const StringCell = withJsonFormsCellProps(StringCellImpl);
