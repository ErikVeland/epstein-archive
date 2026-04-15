import { Span } from '@sentry/core';
import { Location, RouteObject } from '../types';
/**
 * Creates a proxy wrapper for an async handler function.
 * Captures both the location and the active span at invocation time to ensure
 * the correct span is updated when the handler resolves.
 */
export declare function createAsyncHandlerProxy(originalFunction: (...args: unknown[]) => unknown, route: RouteObject, handlerKey: string, processResolvedRoutes: (resolvedRoutes: RouteObject[], parentRoute?: RouteObject, currentLocation?: Location, capturedSpan?: Span) => void): (...args: unknown[]) => unknown;
/**
 * Handles the result of an async handler function call.
 * Passes the captured span through to ensure the correct span is updated.
 */
export declare function handleAsyncHandlerResult(result: unknown, route: RouteObject, handlerKey: string, processResolvedRoutes: (resolvedRoutes: RouteObject[], parentRoute?: RouteObject, currentLocation?: Location, capturedSpan?: Span) => void, currentLocation: Location | null, capturedSpan: Span | undefined): void;
/**
 * Recursively checks a route for async handlers and sets up Proxies to add discovered child routes to allRoutes when called.
 */
export declare function checkRouteForAsyncHandler(route: RouteObject, processResolvedRoutes: (resolvedRoutes: RouteObject[], parentRoute?: RouteObject, currentLocation?: Location, capturedSpan?: Span) => void): void;
//# sourceMappingURL=lazy-routes.d.ts.map
