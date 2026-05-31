// Local type declarations for react-window.
// @types/react-window was removed because the published stub (v2) is empty and
// react-window itself does not ship bundled types. This file replaces it.
// Source: @types/react-window@1.8.8 (MIT)

declare module 'react-window' {
  import {
    Component,
    ComponentClass,
    ComponentType,
    CSSProperties,
    FunctionComponent,
    Key,
    Ref,
  } from 'react';

  export type CSSDirection = 'ltr' | 'rtl';
  export type Direction = 'vertical' | 'horizontal';
  export type Layout = 'vertical' | 'horizontal';
  export type ScrollDirection = 'forward' | 'backward';
  export type Align = 'auto' | 'smart' | 'center' | 'end' | 'start';

  export interface ListChildComponentProps<T = any> {
    index: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean | undefined;
  }

  export interface GridChildComponentProps<T = any> {
    columnIndex: number;
    rowIndex: number;
    style: CSSProperties;
    data: T;
    isScrolling?: boolean | undefined;
  }

  export type ReactElementType = FunctionComponent<any> | ComponentClass<any> | string;

  export interface CommonProps<T = any> {
    className?: string | undefined;
    innerElementType?: ReactElementType | undefined;
    innerRef?: Ref<any> | undefined;
    /** @deprecated since 1.4.0 */
    innerTagName?: string | undefined;
    itemData?: T | undefined;
    outerElementType?: ReactElementType | undefined;
    outerRef?: Ref<any> | undefined;
    /** @deprecated since 1.4.0 */
    outerTagName?: string | undefined;
    style?: CSSProperties | undefined;
    useIsScrolling?: boolean | undefined;
  }

  export type ListItemKeySelector<T = any> = (index: number, data: T) => Key;

  export interface ListOnItemsRenderedProps {
    overscanStartIndex: number;
    overscanStopIndex: number;
    visibleStartIndex: number;
    visibleStopIndex: number;
  }

  export interface ListOnScrollProps {
    scrollDirection: ScrollDirection;
    scrollOffset: number;
    scrollUpdateWasRequested: boolean;
  }

  export interface ListProps<T = any> extends CommonProps<T> {
    children: ComponentType<ListChildComponentProps<T>>;
    height: number | string;
    itemCount: number;
    width: number | string;
    direction?: CSSDirection | Direction | undefined;
    layout?: Layout | undefined;
    initialScrollOffset?: number | undefined;
    itemKey?: ListItemKeySelector<T> | undefined;
    overscanCount?: number | undefined;
    onItemsRendered?: ((props: ListOnItemsRenderedProps) => any) | undefined;
    onScroll?: ((props: ListOnScrollProps) => any) | undefined;
  }

  export type GridItemKeySelector<T = any> = (params: {
    columnIndex: number;
    rowIndex: number;
    data: T;
  }) => Key;

  export interface GridOnItemsRenderedProps {
    overscanColumnStartIndex: number;
    overscanColumnStopIndex: number;
    overscanRowStartIndex: number;
    overscanRowStopIndex: number;
    visibleColumnStartIndex: number;
    visibleColumnStopIndex: number;
    visibleRowStartIndex: number;
    visibleRowStopIndex: number;
  }

  export interface GridOnScrollProps {
    horizontalScrollDirection: ScrollDirection;
    scrollLeft: number;
    scrollTop: number;
    scrollUpdateWasRequested: boolean;
    verticalScrollDirection: ScrollDirection;
  }

  export interface GridProps<T = any> extends CommonProps<T> {
    children: ComponentType<GridChildComponentProps<T>>;
    columnCount: number;
    direction?: CSSDirection | undefined;
    height: number;
    initialScrollLeft?: number | undefined;
    initialScrollTop?: number | undefined;
    itemKey?: GridItemKeySelector<T> | undefined;
    onItemsRendered?: ((props: GridOnItemsRenderedProps) => any) | undefined;
    onScroll?: ((props: GridOnScrollProps) => any) | undefined;
    /** @deprecated since version 1.8.2 */
    overscanColumnsCount?: number | undefined;
    overscanColumnCount?: number | undefined;
    /** @deprecated since version 1.8.2 */
    overscanRowsCount?: number | undefined;
    overscanRowCount?: number | undefined;
    /** @deprecated since 1.4.0 */
    overscanCount?: number | undefined;
    rowCount: number;
    width: number;
  }

  export interface FixedSizeListProps<T = any> extends ListProps<T> {
    itemSize: number;
  }

  export interface VariableSizeListProps<T = any> extends ListProps<T> {
    estimatedItemSize?: number | undefined;
    itemSize: (index: number) => number;
  }

  export interface FixedSizeGridProps<T = any> extends GridProps<T> {
    columnWidth: number;
    rowHeight: number;
  }

  export interface VariableSizeGridProps<T = any> extends GridProps<T> {
    columnWidth: (index: number) => number;
    estimatedColumnWidth?: number | undefined;
    estimatedRowHeight?: number | undefined;
    rowHeight: (index: number) => number;
  }

  export class FixedSizeList<T = any> extends Component<FixedSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: Align): void;
  }

  export class VariableSizeList<T = any> extends Component<VariableSizeListProps<T>> {
    scrollTo(scrollOffset: number): void;
    scrollToItem(index: number, align?: Align): void;
    resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  export class FixedSizeGrid<T = any> extends Component<FixedSizeGridProps<T>> {
    scrollTo(params: { scrollLeft?: number; scrollTop?: number }): void;
    scrollToItem(params: {
      align?: Align | undefined;
      columnIndex?: number | undefined;
      rowIndex?: number | undefined;
    }): void;
  }

  export class VariableSizeGrid<T = any> extends Component<VariableSizeGridProps<T>> {
    scrollTo(params: { scrollLeft?: number; scrollTop?: number }): void;
    scrollToItem(params: {
      align?: Align | undefined;
      columnIndex?: number | undefined;
      rowIndex?: number | undefined;
    }): void;
    resetAfterColumnIndex(index: number, shouldForceUpdate?: boolean): void;
    resetAfterIndices(params: {
      columnIndex: number;
      rowIndex: number;
      shouldForceUpdate?: boolean | undefined;
    }): void;
    resetAfterRowIndex(index: number, shouldForceUpdate?: boolean): void;
  }

  export function areEqual(prevProps: Readonly<object>, nextProps: Readonly<object>): boolean;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export function shouldComponentUpdate<P = object, S = object>(
    this: { props: P; state: S },
    nextProps: Readonly<P>,
    nextState: Readonly<S>,
  ): boolean;
}
