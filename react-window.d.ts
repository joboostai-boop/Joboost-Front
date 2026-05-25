declare module 'react-window' {
  import { ComponentType, CSSProperties, ReactNode } from 'react';

  export interface ListChildComponentProps {
    index: number;
    style: CSSProperties;
    data: any;
  }

  export interface ListProps {
    children: ComponentType<ListChildComponentProps> | ((props: ListChildComponentProps) => ReactNode);
    className?: string;
    height: number;
    itemCount: number;
    itemSize: number | ((index: number) => number);
    width: number | string;
    layout?: 'horizontal' | 'vertical';
    overscanCount?: number;
    itemData?: any;
    itemKey?: (index: number, data: any) => string | number;
    onScroll?: (props: { scrollOffset: number; scrollUpdateWasRequested: boolean }) => void;
    onItemsRendered?: (props: { visibleStartIndex: number; visibleStopIndex: number; overscanStartIndex: number; overscanStopIndex: number }) => void;
    style?: CSSProperties;
  }

  export const List: ComponentType<ListProps>;

  export interface GridProps {
    children: ComponentType<any>;
    className?: string;
    columnCount: number;
    columnWidth: number | ((index: number) => number);
    height: number;
    rowCount: number;
    rowHeight: number | ((index: number) => number);
    width: number;
  }

  export const Grid: ComponentType<GridProps>;

  export function getScrollbarSize(): number;
}
