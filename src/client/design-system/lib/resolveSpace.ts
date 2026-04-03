import type { CSSProperties } from 'react';

/**
 * Resolves a spacing prop value to a CSS string.
 * Integers 1-12 map to var(--space-N).
 * Named aliases: 'none' → '0', 'auto' → 'auto'.
 * Any other string passes through as a raw CSS value.
 */
export type SpaceValue =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 12
  | 'none' | 'auto'
  | (string & Record<never, never>); // allows raw CSS strings like "40px"

export function resolveSpace(value: SpaceValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value === 'none') return '0';
  if (value === 'auto') return 'auto';
  if (typeof value === 'number') return `var(--space-${value})`;
  return value;
}

/**
 * Resolves a size prop value to a CSS string.
 * Named sizes map to var(--size-N).
 * 'full' → '100%', 'auto' → 'auto'.
 * Any other string passes through as a raw CSS value.
 */
export type SizeValue =
  | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  | 'full' | 'auto'
  | (string & Record<never, never>); // allows raw CSS strings like "400px", "100%"

export function resolveSize(value: SizeValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (value === 'full') return '100%';
  if (value === 'auto') return 'auto';
  if (['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(value)) {
    return `var(--size-${value})`;
  }
  return value;
}

/**
 * Builds an inline style object from spacing props.
 * Only sets keys where a value is provided.
 */
export interface SpacingProps {
  p?: SpaceValue; px?: SpaceValue; py?: SpaceValue;
  pt?: SpaceValue; pb?: SpaceValue; pl?: SpaceValue; pr?: SpaceValue;
  m?: SpaceValue; mx?: SpaceValue; my?: SpaceValue;
  mt?: SpaceValue; mb?: SpaceValue; ml?: SpaceValue; mr?: SpaceValue;
  gap?: SpaceValue;
}

export interface SizingProps {
  w?: SizeValue; h?: SizeValue;
  minW?: SizeValue; minH?: SizeValue;
  maxW?: SizeValue; maxH?: SizeValue;
}

export function buildSpacingStyles(props: SpacingProps & SizingProps): CSSProperties {
  const s = resolveSpace;
  const z = resolveSize;
  const style: CSSProperties = {};

  // Padding — shorthand first, then overrides
  if (props.p !== undefined)  { style.padding = s(props.p); }
  if (props.px !== undefined) { style.paddingLeft = s(props.px); style.paddingRight = s(props.px); }
  if (props.py !== undefined) { style.paddingTop = s(props.py); style.paddingBottom = s(props.py); }
  if (props.pt !== undefined) { style.paddingTop = s(props.pt); }
  if (props.pb !== undefined) { style.paddingBottom = s(props.pb); }
  if (props.pl !== undefined) { style.paddingLeft = s(props.pl); }
  if (props.pr !== undefined) { style.paddingRight = s(props.pr); }

  // Margin
  if (props.m !== undefined)  { style.margin = s(props.m); }
  if (props.mx !== undefined) { style.marginLeft = s(props.mx); style.marginRight = s(props.mx); }
  if (props.my !== undefined) { style.marginTop = s(props.my); style.marginBottom = s(props.my); }
  if (props.mt !== undefined) { style.marginTop = s(props.mt); }
  if (props.mb !== undefined) { style.marginBottom = s(props.mb); }
  if (props.ml !== undefined) { style.marginLeft = s(props.ml); }
  if (props.mr !== undefined) { style.marginRight = s(props.mr); }

  // Gap
  if (props.gap !== undefined) { style.gap = s(props.gap); }

  // Sizing
  if (props.w !== undefined)    { style.width = z(props.w); }
  if (props.h !== undefined)    { style.height = z(props.h); }
  if (props.minW !== undefined) { style.minWidth = z(props.minW); }
  if (props.minH !== undefined) { style.minHeight = z(props.minH); }
  if (props.maxW !== undefined) { style.maxWidth = z(props.maxW); }
  if (props.maxH !== undefined) { style.maxHeight = z(props.maxH); }

  return style;
}
