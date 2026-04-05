function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attrs(attributes: Record<string, string | number>): string {
  return Object.entries(attributes)
    .map(([k, v]) => `${k}="${typeof v === 'string' ? escapeXml(v) : v}"`)
    .join(' ');
}

function attrValue(value: string | number): string {
  return typeof value === 'string' ? escapeXml(value) : String(value);
}

export class SvgBuilder {
  private elements: string[] = [];

  rect(attributes: Record<string, string | number>): this {
    this.elements.push(`  <rect ${attrs(attributes)} />`);
    return this;
  }

  text(content: string, attributes: Record<string, string | number>): this {
    this.elements.push(`  <text ${attrs(attributes)}>${escapeXml(content)}</text>`);
    return this;
  }

  textLines(
    lines: string[],
    attributes: Record<string, string | number>,
    lineHeight: number,
  ): this {
    if (lines.length <= 1) {
      return this.text(lines[0] ?? '', attributes);
    }

    const textAttrs = attrs(attributes);
    const x = attributes.x;
    const xAttr = x === undefined ? '' : ` x="${attrValue(x)}"`;
    const firstDy = -((lines.length - 1) * lineHeight) / 2;

    this.elements.push(`  <text ${textAttrs}>`);
    for (let i = 0; i < lines.length; i++) {
      const dyAttr = i === 0 ? ` dy="${firstDy}"` : ` dy="${lineHeight}"`;
      this.elements.push(`    <tspan${xAttr}${dyAttr}>${escapeXml(lines[i])}</tspan>`);
    }
    this.elements.push('  </text>');
    return this;
  }

  openGroup(attributes: Record<string, string | number> = {}): this {
    const a = Object.keys(attributes).length > 0 ? ` ${attrs(attributes)}` : '';
    this.elements.push(`  <g${a}>`);
    return this;
  }

  closeGroup(): this {
    this.elements.push('  </g>');
    return this;
  }

  raw(content: string): this {
    this.elements.push(content);
    return this;
  }

  toString(width: number, height: number): string {
    const header = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    return [header, ...this.elements, '</svg>'].join('\n');
  }
}
