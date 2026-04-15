'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import makeCancellable from 'make-cancellable-promise';
import makeEventProps from 'make-event-props';
import invariant from 'tiny-invariant';
import warning from 'warning';
import OutlineContext from './OutlineContext.js';
import OutlineItem from './OutlineItem.js';
import useDocumentContext from './shared/hooks/useDocumentContext.js';
import useResolver from './shared/hooks/useResolver.js';
import { cancelRunningTask } from './shared/utils.js';
/**
 * Displays an outline (table of contents).
 *
 * Should be placed inside `<Document />`. Alternatively, it can have `pdf` prop passed, which can be obtained from `<Document />`'s `onLoadSuccess` callback function.
 */
export default function Outline(props) {
    const documentContext = useDocumentContext();
    const mergedProps = { ...documentContext, ...props };
    const { className, inputRef, onItemClick, onLoadError: onLoadErrorProps, onLoadSuccess: onLoadSuccessProps, pdf, ...otherProps } = mergedProps;
    invariant(pdf, 'Attempted to load an outline, but no document was specified. Wrap <Outline /> in a <Document /> or pass explicit `pdf` prop.');
    const [outlineState, outlineDispatch] = useResolver();
    const { value: outline, error: outlineError } = outlineState;
    /**
     * Called when an outline is read successfully
     */
    function onLoadSuccess() {
        if (typeof outline === 'undefined' || outline === false) {
            return;
        }
        if (onLoadSuccessProps) {
            onLoadSuccessProps(outline);
        }
    }
    /**
     * Called when an outline failed to read successfully
     */
    function onLoadError() {
        if (!outlineError) {
            // Impossible, but TypeScript doesn't know that
            return;
        }
        warning(false, outlineError.toString());
        if (onLoadErrorProps) {
            onLoadErrorProps(outlineError);
        }
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: useEffect intentionally triggered on pdf change
    useEffect(function resetOutline() {
        outlineDispatch({ type: 'RESET' });
    }, [outlineDispatch, pdf]);
    useEffect(function loadOutline() {
        if (!pdf) {
            // Impossible, but TypeScript doesn't know that
            return;
        }
        const cancellable = makeCancellable(pdf.getOutline());
        const runningTask = cancellable;
        cancellable.promise
            .then((nextOutline) => {
            outlineDispatch({ type: 'RESOLVE', value: nextOutline });
        })
            .catch((error) => {
            outlineDispatch({ type: 'REJECT', error });
        });
        return () => cancelRunningTask(runningTask);
    }, [outlineDispatch, pdf]);
    // biome-ignore lint/correctness/useExhaustiveDependencies: Omitted callbacks so they are not called every time they change
    useEffect(() => {
        if (outline === undefined) {
            return;
        }
        if (outline === false) {
            onLoadError();
            return;
        }
        onLoadSuccess();
    }, [outline]);
    const childContext = useMemo(() => ({
        onItemClick,
    }), [onItemClick]);
    const eventProps = useMemo(() => makeEventProps(otherProps, () => outline), 
    // biome-ignore lint/correctness/useExhaustiveDependencies: FIXME
    [otherProps, outline]);
    if (!outline) {
        return null;
    }
    function renderOutline() {
        if (!outline) {
            return null;
        }
        return (_jsx("ul", { children: outline.map((item, itemIndex) => (_jsx(OutlineItem, { item: item, pdf: pdf }, typeof item.dest === 'string' ? item.dest : itemIndex))) }));
    }
    return (_jsx("div", { className: clsx('react-pdf__Outline', className), ref: inputRef, ...eventProps, children: _jsx(OutlineContext.Provider, { value: childContext, children: renderOutline() }) }));
}
