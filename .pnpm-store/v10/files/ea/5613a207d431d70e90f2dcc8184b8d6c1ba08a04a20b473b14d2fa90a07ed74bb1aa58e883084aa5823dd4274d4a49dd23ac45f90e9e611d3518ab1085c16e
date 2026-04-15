import * as trusted_types_lib from 'trusted-types/lib';
import * as dompurify from 'dompurify';
import dompurify__default from 'dompurify';
export { default } from 'dompurify';

declare const sanitize: {
    (dirty: string | Node, cfg: dompurify.Config & {
        RETURN_TRUSTED_TYPE: true;
    }): trusted_types_lib.TrustedHTML;
    (dirty: Node, cfg: dompurify.Config & {
        IN_PLACE: true;
    }): Node;
    (dirty: string | Node, cfg: dompurify.Config & {
        RETURN_DOM: true;
    }): Node;
    (dirty: string | Node, cfg: dompurify.Config & {
        RETURN_DOM_FRAGMENT: true;
    }): DocumentFragment;
    (dirty: string | Node, cfg?: dompurify.Config): string;
};
declare const isSupported: boolean;
declare const addHook: {
    (entryPoint: "beforeSanitizeElements" | "afterSanitizeElements" | "uponSanitizeShadowNode", hookFunction: dompurify.NodeHook): void;
    (entryPoint: "beforeSanitizeAttributes" | "afterSanitizeAttributes", hookFunction: dompurify.ElementHook): void;
    (entryPoint: "beforeSanitizeShadowDOM" | "afterSanitizeShadowDOM", hookFunction: dompurify.DocumentFragmentHook): void;
    (entryPoint: "uponSanitizeElement", hookFunction: dompurify.UponSanitizeElementHook): void;
    (entryPoint: "uponSanitizeAttribute", hookFunction: dompurify.UponSanitizeAttributeHook): void;
};
declare const removeHook: {
    (entryPoint: "beforeSanitizeElements" | "afterSanitizeElements" | "uponSanitizeShadowNode", hookFunction?: dompurify.NodeHook): dompurify.NodeHook | undefined;
    (entryPoint: "beforeSanitizeAttributes" | "afterSanitizeAttributes", hookFunction?: dompurify.ElementHook): dompurify.ElementHook | undefined;
    (entryPoint: "beforeSanitizeShadowDOM" | "afterSanitizeShadowDOM", hookFunction?: dompurify.DocumentFragmentHook): dompurify.DocumentFragmentHook | undefined;
    (entryPoint: "uponSanitizeElement", hookFunction?: dompurify.UponSanitizeElementHook): dompurify.UponSanitizeElementHook | undefined;
    (entryPoint: "uponSanitizeAttribute", hookFunction?: dompurify.UponSanitizeAttributeHook): dompurify.UponSanitizeAttributeHook | undefined;
};
declare const removeHooks: (entryPoint: dompurify.HookName) => void;
declare const removeAllHooks: () => void;
declare const setConfig: (cfg?: dompurify.Config) => void;
declare const clearConfig: () => void;
declare const isValidAttribute: (tag: string, attr: string, value: string) => boolean;
declare const version: string;
declare const removed: (dompurify.RemovedElement | dompurify.RemovedAttribute)[];
declare function clearWindow(): void;

export { addHook, clearConfig, clearWindow, isSupported, isValidAttribute, removeAllHooks, removeHook, removeHooks, removed, sanitize, setConfig, version };
