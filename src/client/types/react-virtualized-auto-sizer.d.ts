declare module 'react-virtualized-auto-sizer/dist/react-virtualized-auto-sizer.cjs' {
  import { Component, ReactNode, CSSProperties } from 'react';

  export interface Size {
    height: number;
    width: number;
  }

  export interface AutoSizerProps {
    children: (size: Size) => ReactNode;
    className?: string;
    defaultHeight?: number;
    defaultWidth?: number;
    disableHeight?: boolean;
    disableWidth?: boolean;
    nonce?: string;
    onResize?: (size: Size) => void;
    style?: CSSProperties;
    tagName?: string;
  }

  export class AutoSizer extends Component<AutoSizerProps> {}
}
