import { browserTracingIntegration } from '@sentry/browser';
import type { Integration, Span } from '@sentry/core';
import * as React from 'react';
import type { Action, AgnosticDataRouteMatch, CreateRouterFunction, CreateRoutesFromChildren, Location, MatchRoutes, RouteObject, Router, RouterState, UseEffect, UseLocation, UseNavigationType, UseRoutes } from '../types';
export declare const allRoutes: Set<RouteObject>;
/**
 * Computes location key for duplicate detection. Normalizes undefined/null to empty strings.
 * Exported for testing.
 */
export declare function computeLocationKey(location: Location): string;
/**
 * Determines if a navigation should be skipped as a duplicate, and if an existing span should be updated.
 * Exported for testing.
 *
 * @returns An object with:
 *   - skip: boolean - Whether to skip creating a new span
 *   - shouldUpdate: boolean - Whether to update the existing span name (wildcard upgrade)
 */
export declare function shouldSkipNavigation(trackedNav: {
    span: Span;
    routeName: string;
    pathname: string;
    locationKey: string;
    isPlaceholder?: boolean;
} | undefined, locationKey: string, proposedName: string, spanHasEnded: boolean): {
    skip: boolean;
    shouldUpdate: boolean;
};
export interface ReactRouterOptions {
    useEffect: UseEffect;
    useLocation: UseLocation;
    useNavigationType: UseNavigationType;
    createRoutesFromChildren: CreateRoutesFromChildren;
    matchRoutes: MatchRoutes;
    /**
     * Whether to strip the basename from the pathname when creating transactions.
     *
     * This is useful for applications that use a basename in their routing setup.
     * @default false
     */
    stripBasename?: boolean;
    /**
     * Enables support for async route handlers.
     *
     * This allows Sentry to track and instrument routes dynamically resolved from async handlers.
     * @default false
     */
    enableAsyncRouteHandlers?: boolean;
    /**
     * Maximum time (in milliseconds) to wait for lazy routes to load before finalizing span names.
     *
     * - Set to `0` to not wait at all (immediate finalization)
     * - Set to `Infinity` to wait as long as possible (capped at `finalTimeout` to prevent indefinite hangs)
     * - Negative values will fall back to the default
     *
     * Defaults to 3× the configured `idleTimeout` (default: 3000ms).
     *
     * @default idleTimeout * 3
     */
    lazyRouteTimeout?: number;
    /**
     * Static route manifest for resolving parameterized route names with lazy routes.
     *
     * Requires `enableAsyncRouteHandlers: true`. When provided, the manifest is used
     * as the primary source for determining transaction names. This is more reliable
     * than depending on React Router's lazy route resolution timing.
     *
     * @example
     * ```ts
     * lazyRouteManifest: [
     *   '/',
     *   '/users',
     *   '/users/:userId',
     *   '/org/:orgSlug/projects/:projectId',
     * ]
     * ```
     */
    lazyRouteManifest?: string[];
}
type V6CompatibleVersion = '6' | '7';
export declare function addResolvedRoutesToParent(resolvedRoutes: RouteObject[], parentRoute: RouteObject): void;
/**
 * Processes resolved routes by adding them to allRoutes and checking for nested async handlers.
 * When capturedSpan is provided, updates that specific span instead of the current active span.
 * This prevents race conditions where a lazy handler resolves after the user has navigated away.
 */
export declare function processResolvedRoutes(resolvedRoutes: RouteObject[], parentRoute?: RouteObject, currentLocation?: Location | null, capturedSpan?: Span): void;
/**
 * Updates a navigation span with the correct route name after lazy routes have been loaded.
 */
export declare function updateNavigationSpan(activeRootSpan: Span, location: Location, allRoutes: RouteObject[], forceUpdate: boolean | undefined, matchRoutes: MatchRoutes): void;
/**
 * Creates a wrapCreateBrowserRouter function that can be used with all React Router v6 compatible versions.
 */
export declare function createV6CompatibleWrapCreateBrowserRouter<TState extends RouterState = RouterState, TRouter extends Router<TState> = Router<TState>>(createRouterFunction: CreateRouterFunction<TState, TRouter>, version: V6CompatibleVersion): CreateRouterFunction<TState, TRouter>;
/**
 * Creates a wrapCreateMemoryRouter function that can be used with all React Router v6 compatible versions.
 */
export declare function createV6CompatibleWrapCreateMemoryRouter<TState extends RouterState = RouterState, TRouter extends Router<TState> = Router<TState>>(createRouterFunction: CreateRouterFunction<TState, TRouter>, version: V6CompatibleVersion): CreateRouterFunction<TState, TRouter>;
/**
 * Creates a browser tracing integration that can be used with all React Router v6 compatible versions.
 */
export declare function createReactRouterV6CompatibleTracingIntegration(options: Parameters<typeof browserTracingIntegration>[0] & ReactRouterOptions, version: V6CompatibleVersion): Integration;
export declare function createV6CompatibleWrapUseRoutes(origUseRoutes: UseRoutes, version: V6CompatibleVersion): UseRoutes;
export declare function handleNavigation(opts: {
    location: Location;
    routes: RouteObject[];
    navigationType: Action;
    version: V6CompatibleVersion;
    matches?: AgnosticDataRouteMatch;
    basename?: string;
    allRoutes?: RouteObject[];
}): void;
export declare function addRoutesToAllRoutes(routes: RouteObject[]): void;
export declare function createV6CompatibleWithSentryReactRouterRouting<P extends Record<string, any>, R extends React.FC<P>>(Routes: R, version: V6CompatibleVersion): R;
export {};
//# sourceMappingURL=instrumentation.d.ts.map