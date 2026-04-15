# Installation
> `npm install --save @types/react-window-infinite-loader`

# Summary
This package contains type definitions for react-window-infinite-loader (https://github.com/bvaughn/react-window-infinite-loader/).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-window-infinite-loader.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-window-infinite-loader/index.d.ts)
````ts
import { Component, FC, ReactNode, Ref } from "react";
import { FixedSizeList, ListOnItemsRenderedProps, VariableSizeList } from "react-window";

type OnItemsRendered = (props: ListOnItemsRenderedProps) => any;

interface InfiniteLoaderProps {
    isItemLoaded: (index: number) => boolean;
    loadMoreItems: (startIndex: number, stopIndex: number) => Promise<void> | void;
    itemCount: number;
    children: (props: { onItemsRendered: OnItemsRendered; ref: (ref: any) => void }) => ReactNode;
    threshold?: number | undefined;
    minimumBatchSize?: number | undefined;
}

declare class InfiniteLoader extends Component<InfiniteLoaderProps> {
    resetloadMoreItemsCache(autoReload?: boolean): void;
}

export = InfiniteLoader;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 09:09:39 GMT
 * Dependencies: [@types/react](https://npmjs.com/package/@types/react), [@types/react-window](https://npmjs.com/package/@types/react-window)

# Credits
These definitions were written by [Nivesh Ravindran](https://github.com/Nibblesh), and [fnknzzz](https://github.com/fnknzzz).
