import { Span, TransactionSource } from '@sentry/core';
import { Location, MatchRoutes, RouteMatch, RouteObject } from '../types';
interface NavigationContext {
    token: object;
    targetPath: string | undefined;
    span: Span | undefined;
}
/**
 * Pushes a navigation context and returns a unique token for cleanup.
 * The token uses object identity for uniqueness (no counter needed).
 */
export declare function setNavigationContext(targetPath: string | undefined, span: Span | undefined): object;
/**
 * Clears the navigation context if it's on top of the stack (LIFO).
 * If our context is not on top (out-of-order completion), we leave it -
 * it will be cleaned up by overflow protection when the stack fills up.
 */
export declare function clearNavigationContext(token: object): void;
/** Gets the current (most recent) navigation context if inside a patchRoutesOnNavigation call. */
export declare function getNavigationContext(): NavigationContext | null;
/**
 * Initialize function to set dependencies that the router utilities need.
 * Must be called before using any of the exported utility functions.
 */
export declare function initializeRouterUtils(matchRoutes: MatchRoutes, stripBasename?: boolean): void;
/**
 * Checks if a path ends with a wildcard character (*).
 */
export declare function pathEndsWithWildcard(path: string): boolean;
/** Checks if transaction name has wildcard (/* or ends with *). */
export declare function transactionNameHasWildcard(name: string): boolean;
/**
 * Checks if a path is a wildcard and has child routes.
 */
export declare function pathIsWildcardAndHasChildren(path: string, branch: RouteMatch<string>): boolean;
/** Check if route is in descendant route (<Routes> within <Routes>) */
export declare function routeIsDescendant(route: RouteObject): boolean;
/**
 * Returns the number of URL segments in the given URL string.
 * Splits at '/' or '\/' to handle regex URLs correctly.
 *
 * @param url - The URL string to segment.
 * @returns The number of segments in the URL.
 */
export declare function getNumberOfUrlSegments(url: string): number;
/**
 * Ensures a path string starts with a forward slash.
 */
export declare function prefixWithSlash(path: string): string;
/**
 * Rebuilds the route path from all available routes by matching against the current location.
 */
export declare function rebuildRoutePathFromAllRoutes(allRoutes: RouteObject[], location: Location): string;
/**
 * Checks if the current location is inside a descendant route (route with splat parameter).
 */
export declare function locationIsInsideDescendantRoute(location: Location, routes: RouteObject[]): boolean;
/**
 * Gets a normalized route name and transaction source from the current routes and location.
 */
export declare function getNormalizedName(routes: RouteObject[], location: Location, branches: RouteMatch[], basename?: string): [
    string,
    TransactionSource
];
/**
 * Shared helper function to resolve route name and source
 */
export declare function resolveRouteNameAndSource(location: Location, routes: RouteObject[], allRoutes: RouteObject[], branches: RouteMatch[], basename?: string, lazyRouteManifest?: string[], enableAsyncRouteHandlers?: boolean): [
    string,
    TransactionSource
];
/**
 * Gets the active root span if it's a pageload or navigation span.
 */
export declare function getActiveRootSpan(): Span | undefined;
export {};
//# sourceMappingURL=utils.d.ts.map
