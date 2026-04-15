/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import { env } from './environment';
import { isTypedArrayBrowser } from './platforms/is_typed_array_browser';
import * as base from './util_base';
export * from './util_base';
export * from './hash_util';
/**
 * Create typed array for scalar value. Used for storing in `DataStorage`.
 */
export function createScalarValue(value, dtype) {
    if (dtype === 'string') {
        return encodeString(value);
    }
    return toTypedArray([value], dtype);
}
function noConversionNeeded(a, dtype) {
    return (a instanceof Float32Array && dtype === 'float32') ||
        (a instanceof Int32Array && dtype === 'int32') ||
        (a instanceof Uint8Array && dtype === 'bool');
}
export function toTypedArray(a, dtype) {
    if (dtype === 'string') {
        throw new Error('Cannot convert a string[] to a TypedArray');
    }
    if (Array.isArray(a)) {
        a = flatten(a);
    }
    if (env().getBool('DEBUG')) {
        base.checkConversionForErrors(a, dtype);
    }
    if (noConversionNeeded(a, dtype)) {
        return a;
    }
    if (dtype == null || dtype === 'float32' || dtype === 'complex64') {
        return new Float32Array(a);
    }
    else if (dtype === 'int32') {
        return new Int32Array(a);
    }
    else if (dtype === 'bool') {
        const bool = new Uint8Array(a.length);
        for (let i = 0; i < bool.length; ++i) {
            if (Math.round(a[i]) !== 0) {
                bool[i] = 1;
            }
        }
        return bool;
    }
    else {
        throw new Error(`Unknown data type ${dtype}`);
    }
}
/**
 * Returns the current high-resolution time in milliseconds relative to an
 * arbitrary time in the past. It works across different platforms (node.js,
 * browsers).
 *
 * ```js
 * console.log(tf.util.now());
 * ```
 *
 * @doc {heading: 'Util', namespace: 'util'}
 */
export function now() {
    return env().platform.now();
}
/**
 * Returns a platform-specific implementation of
 * [`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).
 *
 * If `fetch` is defined on the global object (`window`, `process`, etc.),
 * `tf.util.fetch` returns that function.
 *
 * If not, `tf.util.fetch` returns a platform-specific solution.
 *
 * ```js
 * const resource = await tf.util.fetch('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs');
 * // handle response
 * ```
 *
 * @doc {heading: 'Util'}
 */
export function fetch(path, requestInits) {
    return env().platform.fetch(path, requestInits);
}
/**
 * Encodes the provided string into bytes using the provided encoding scheme.
 *
 * @param s The string to encode.
 * @param encoding The encoding scheme. Defaults to utf-8.
 *
 * @doc {heading: 'Util'}
 */
export function encodeString(s, encoding = 'utf-8') {
    encoding = encoding || 'utf-8';
    return env().platform.encode(s, encoding);
}
/**
 * Decodes the provided bytes into a string using the provided encoding scheme.
 * @param bytes The bytes to decode.
 *
 * @param encoding The encoding scheme. Defaults to utf-8.
 *
 * @doc {heading: 'Util'}
 */
export function decodeString(bytes, encoding = 'utf-8') {
    encoding = encoding || 'utf-8';
    return env().platform.decode(bytes, encoding);
}
export function isTypedArray(a) {
    // TODO(mattsoulanille): Remove this fallback in 5.0.0
    if (env().platform.isTypedArray != null) {
        return env().platform.isTypedArray(a);
    }
    else {
        return isTypedArrayBrowser(a);
    }
}
// NOTE: We explicitly type out what T extends instead of any so that
// util.flatten on a nested array of number doesn't try to infer T as a
// number[][], causing us to explicitly type util.flatten<number>().
/**
 *  Flattens an arbitrarily nested array.
 *
 * ```js
 * const a = [[1, 2], [3, 4], [5, [6, [7]]]];
 * const flat = tf.util.flatten(a);
 * console.log(flat);
 * ```
 *
 *  @param arr The nested array to flatten.
 *  @param result The destination array which holds the elements.
 *  @param skipTypedArray If true, avoids flattening the typed arrays. Defaults
 *      to false.
 *
 * @doc {heading: 'Util', namespace: 'util'}
 */
export function flatten(arr, result = [], skipTypedArray = false) {
    if (result == null) {
        result = [];
    }
    if (typeof arr === 'boolean' || typeof arr === 'number' ||
        typeof arr === 'string' || base.isPromise(arr) || arr == null ||
        isTypedArray(arr) && skipTypedArray) {
        result.push(arr);
    }
    else if (Array.isArray(arr) || isTypedArray(arr)) {
        for (let i = 0; i < arr.length; ++i) {
            flatten(arr[i], result, skipTypedArray);
        }
    }
    else {
        let maxIndex = -1;
        for (const key of Object.keys(arr)) {
            // 0 or positive integer.
            if (/^([1-9]+[0-9]*|0)$/.test(key)) {
                maxIndex = Math.max(maxIndex, Number(key));
            }
        }
        for (let i = 0; i <= maxIndex; i++) {
            // tslint:disable-next-line: no-unnecessary-type-assertion
            flatten(arr[i], result, skipTypedArray);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ2xDLE9BQU8sRUFBQyxtQkFBbUIsRUFBQyxNQUFNLG9DQUFvQyxDQUFDO0FBRXZFLE9BQU8sS0FBSyxJQUFJLE1BQU0sYUFBYSxDQUFDO0FBQ3BDLGNBQWMsYUFBYSxDQUFDO0FBQzVCLGNBQWMsYUFBYSxDQUFDO0FBRTVCOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGlCQUFpQixDQUM3QixLQUFlLEVBQUUsS0FBZTtJQUNsQyxJQUFJLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDdEIsT0FBTyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7S0FDNUI7SUFFRCxPQUFPLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLENBQWEsRUFBRSxLQUFlO0lBQ3hELE9BQU8sQ0FBQyxDQUFDLFlBQVksWUFBWSxJQUFJLEtBQUssS0FBSyxTQUFTLENBQUM7UUFDckQsQ0FBQyxDQUFDLFlBQVksVUFBVSxJQUFJLEtBQUssS0FBSyxPQUFPLENBQUM7UUFDOUMsQ0FBQyxDQUFDLFlBQVksVUFBVSxJQUFJLEtBQUssS0FBSyxNQUFNLENBQUMsQ0FBQztBQUNwRCxDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxDQUFhLEVBQUUsS0FBZTtJQUN6RCxJQUFJLEtBQUssS0FBSyxRQUFRLEVBQUU7UUFDdEIsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO0tBQzlEO0lBQ0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ3BCLENBQUMsR0FBRyxPQUFPLENB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TUFBTSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7ZW52fSBmcm9tICcuL2Vudmlyb25tZW50JztcbmltcG9ydCB7aXNUeXBlZEFycmF5QnJvd3Nlcn0gZnJvbSAnLi9wbGF0Zm9ybXMvaXNfdHlwZWRfYXJyYXlfYnJvd3Nlcic7XG5pbXBvcnQge0JhY2tlbmRWYWx1ZXMsIERhdGFUeXBlLCBSZWN1cnNpdmVBcnJheSwgVGVuc29yTGlrZSwgVHlwZWRBcnJheX0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBiYXNlIGZyb20gJy4vdXRpbF9iYXNlJztcbmV4cG9ydCAqIGZyb20gJy4vdXRpbF9iYXNlJztcbmV4cG9ydCAqIGZyb20gJy4vaGFzaF91dGlsJztcblxuLyoqXG4gKiBDcmVhdGUgdHlwZWQgYXJyYXkgZm9yIHNjYWxhciB2YWx1ZS4gVXNlZCBmb3Igc3RvcmluZyBpbiBgRGF0YVN0b3JhZ2VgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2NhbGFyVmFsdWUoXG4gICAgdmFsdWU6IERhdGFUeXBlLCBkdHlwZTogRGF0YVR5cGUpOiBCYWNrZW5kVmFsdWVzIHtcbiAgaWYgKGR0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBlbmNvZGVTdHJpbmcodmFsdWUpO1xuICB9XG5cbiAgcmV0dXJuIHRvVHlwZWRBcnJheShbdmFsdWVdLCBkdHlwZSk7XG59XG5cbmZ1bmN0aW9uIG5vQ29udmVyc2lvbk5lZWRlZChhOiBUZW5zb3JMaWtlLCBkdHlwZTogRGF0YVR5cGUpOiBib29sZWFuIHtcbiAgcmV0dXJuIChhIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5ICYmIGR0eXBlID09PSAnZmxvYXQzMicpIHx8XG4gICAgICAoYSBpbnN0YW5jZW9mIEludDMyQXJyYXkgJiYgZHR5cGUgPT09ICdpbnQzMicpIHx8XG4gICAgICAoYSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgJiYgZHR5cGUgPT09ICdib29sJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b1R5cGVkQXJyYXkoYTogVGVuc29yTGlrZSwgZHR5cGU6IERhdGFUeXBlKTogVHlwZWRBcnJheSB7XG4gIGlmIChkdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IGEgc3RyaW5nW10gdG8gYSBUeXBlZEFycmF5Jyk7XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkoYSkpIHtcbiAgICBhID0gZmxhdHRlbihhKTtcbiAgfVxuXG4gIGlmIChlbnYoKS5nZXRCb29sKCdERUJVRycpKSB7XG4gICAgYmFzZS5jaGVja0NvbnZlcnNpb25Gb3JFcnJvcnMoYSBhcyBudW1iZXJbXSwgZHR5cGUpO1xuICB9XG4gIGlmIChub0NvbnZlcnNpb25OZWVkZWQoYSwgZHR5cGUpKSB7XG4gICAgcmV0dXJuIGEgYXMgVHlwZWRBcnJheTtcbiAgfVxuICBpZiAoZHR5cGUgPT0gbnVsbCB8fCBkdHlwZSA9PT0gJ2Zsb2F0MzInIHx8IGR0eXBlID09PSAnY29tcGxleDY0Jykge1xuICAgIHJldHVybiBuZXcgRmxvYXQzMkFycmF5KGEgYXMgbnVtYmVyW10pO1xuICB9IGVsc2UgaWYgKGR0eXBlID09PSAnaW50MzInKSB7XG4gICAgcmV0dXJuIG5ldyBJbnQzMkFycmF5KGEgYXMgbnVtYmVyW10pO1xuICB9IGVsc2UgaWYgKGR0eXBlID09PSAnYm9vbCcpIHtcbiAgICBjb25zdCBib29sID0gbmV3IFVpbnQ4QXJyYXkoKGEgYXMgbnVtYmVyW10pLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBib29sLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoTWF0aC5yb3VuZCgoYSBhcyBudW1iZXJbXSlbaV0pICE9PSAwKSB7XG4gICAgICAgIGJvb2xbaV0gPSAxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYm9vbDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gZGF0YSB0eXBlICR7ZHR5cGV9YCk7XG4gIH1cbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IGhpZ2gtcmVzb2x1dGlvbiB0aW1lIGluIG1pbGxpc2Vjb25kcyByZWxhdGl2ZSB0byBhblxuICogYXJiaXRyYXJ5IHRpbWUgaW4gdGhlIHBhc3QuIEl0IHdvcmtzIGFjcm9zcyBkaWZmZXJlbnQgcGxhdGZvcm1zIChub2RlLmpzLFxuICogYnJvd3NlcnMpLlxuICpcbiAqIGBgYGpzXG4gKiBjb25zb2xlLmxvZyh0Zi51dGlsLm5vdygpKTtcbiAqIGBgYFxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdVdGlsJywgbmFtZXNwYWNlOiAndXRpbCd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3coKTogbnVtYmVyIHtcbiAgcmV0dXJuIGVudigpLnBsYXRmb3JtLm5vdygpO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBwbGF0Zm9ybS1zcGVjaWZpYyBpbXBsZW1lbnRhdGlvbiBvZlxuICogW2BmZXRjaGBdKGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9GZXRjaF9BUEkpLlxuICpcbiAqIElmIGBmZXRjaGAgaXMgZGVmaW5lZCBvbiB0aGUgZ2xvYmFsIG9iamVjdCAoYHdpbmRvd2AsIGBwcm9jZXNzYCwgZXRjLiksXG4gKiBgdGYudXRpbC5mZXRjaGAgcmV0dXJucyB0aGF0IGZ1bmN0aW9uLlxuICpcbiAqIElmIG5vdCwgYHRmLnV0aWwuZmV0Y2hgIHJldHVybnMgYSBwbGF0Zm9ybS1zcGVjaWZpYyBzb2x1dGlvbi5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgcmVzb3VyY2UgPSBhd2FpdCB0Zi51dGlsLmZldGNoKCdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL0B0ZW5zb3JmbG93L3RmanMnKTtcbiAqIC8vIGhhbmRsZSByZXNwb25zZVxuICogYGBgXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1V0aWwnfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmV0Y2goXG4gICAgcGF0aDogc3RyaW5nLCByZXF1ZXN0SW5pdHM/OiBSZXF1ZXN0SW5pdCk6IFByb21pc2U8UmVzcG9uc2U+IHtcbiAgcmV0dXJuIGVudigpLnBsYXRmb3JtLmZldGNoKHBhdGgsIHJlcXVlc3RJbml0cyk7XG59XG5cbi8qKlxuICogRW5jb2RlcyB0aGUgcHJvdmlkZWQgc3RyaW5nIGludG8gYnl0ZXMgdXNpbmcgdGhlIHByb3ZpZGVkIGVuY29kaW5nIHNjaGVtZS5cbiAqXG4gKiBAcGFyYW0gcyBUaGUgc3RyaW5nIHRvIGVuY29kZS5cbiAqIEBwYXJhbSBlbmNvZGluZyBUaGUgZW5jb2Rpbmcgc2NoZW1lLiBEZWZhdWx0cyB0byB1dGYtOC5cbiAqXG4gKiBAZG9jIHtoZWFkaW5nOiAnVXRpbCd9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmNvZGVTdHJpbmcoczogc3RyaW5nLCBlbmNvZGluZyA9ICd1dGYtOCcpOiBVaW50OEFycmF5IHtcbiAgZW5jb2RpbmcgPSBlbmNvZGluZyB8fCAndXRmLTgnO1xuICByZXR1cm4gZW52KCkucGxhdGZvcm0uZW5jb2RlKHMsIGVuY29kaW5nKTtcbn1cblxuLyoqXG4gKiBEZWNvZGVzIHRoZSBwcm92aWRlZCBieXRlcyBpbnRvIGEgc3RyaW5nIHVzaW5nIHRoZSBwcm92aWRlZCBlbmNvZGluZyBzY2hlbWUuXG4gKiBAcGFyYW0gYnl0ZXMgVGhlIGJ5dGVzIHRvIGRlY29kZS5cbiAqXG4gKiBAcGFyYW0gZW5jb2RpbmcgVGhlIGVuY29kaW5nIHNjaGVtZS4gRGVmYXVsdHMgdG8gdXRmLTguXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1V0aWwnfVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVjb2RlU3RyaW5nKGJ5dGVzOiBVaW50OEFycmF5LCBlbmNvZGluZyA9ICd1dGYtOCcpOiBzdHJpbmcge1xuICBlbmNvZGluZyA9IGVuY29kaW5nIHx8ICd1dGYtOCc7XG4gIHJldHVybiBlbnYoKS5wbGF0Zm9ybS5kZWNvZGUoYnl0ZXMsIGVuY29kaW5nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzVHlwZWRBcnJheShhOiB7fSk6IGEgaXMgRmxvYXQzMkFycmF5fEludDMyQXJyYXl8VWludDhBcnJheXxcbiAgICBVaW50OENsYW1wZWRBcnJheSB7XG4gIC8vIFRPRE8obWF0dHNvdWxhbmlsbGUpOiBSZW1vdmUgdGhpcyBmYWxsYmFjayBpbiA1LjAuMFxuICBpZiAoZW52KCkucGxhdGZvcm0uaXNUeXBlZEFycmF5ICE9IG51bGwpIHtcbiAgICByZXR1cm4gZW52KCkucGxhdGZvcm0uaXNUeXBlZEFycmF5KGEpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBpc1R5cGVkQXJyYXlCcm93c2VyKGEpO1xuICB9XG59XG5cbi8vIE5PVEU6IFdlIGV4cGxpY2l0bHkgdHlwZSBvdXQgd2hhdCBUIGV4dGVuZHMgaW5zdGVhZCBvZiBhbnkgc28gdGhhdFxuLy8gdXRpbC5mbGF0dGVuIG9uIGEgbmVzdGVkIGFycmF5IG9mIG51bWJlciBkb2Vzbid0IHRyeSB0byBpbmZlciBUIGFzIGFcbi8vIG51bWJlcltdW10sIGNhdXNpbmcgdXMgdG8gZXhwbGljaXRseSB0eXBlIHV0aWwuZmxhdHRlbjxudW1iZXI+KCkuXG4vKipcbiAqICBGbGF0dGVucyBhbiBhcmJpdHJhcmlseSBuZXN0ZWQgYXJyYXkuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGEgPSBbWzEsIDJdLCBbMywgNF0sIFs1LCBbNiwgWzddXV1dO1xuICogY29uc3QgZmxhdCA9IHRmLnV0aWwuZmxhdHRlbihhKTtcbiAqIGNvbnNvbGUubG9nKGZsYXQpO1xuICogYGBgXG4gKlxuICogIEBwYXJhbSBhcnIgVGhlIG5lc3RlZCBhcnJheSB0byBmbGF0dGVuLlxuICogIEBwYXJhbSByZXN1bHQgVGhlIGRlc3RpbmF0aW9uIGFycmF5IHdoaWNoIGhvbGRzIHRoZSBlbGVtZW50cy5cbiAqICBAcGFyYW0gc2tpcFR5cGVkQXJyYXkgSWYgdHJ1ZSwgYXZvaWRzIGZsYXR0ZW5pbmcgdGhlIHR5cGVkIGFycmF5cy4gRGVmYXVsdHNcbiAqICAgICAgdG8gZmFsc2UuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1V0aWwnLCBuYW1lc3BhY2U6ICd1dGlsJ31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uXG5mbGF0dGVuPFQgZXh0ZW5kcyBudW1iZXJ8Ym9vbGVhbnxzdHJpbmd8UHJvbWlzZTxudW1iZXI+fFR5cGVkQXJyYXk+KFxuICAgIGFycjogVHxSZWN1cnNpdmVBcnJheTxUPiwgcmVzdWx0OiBUW10gPSBbXSwgc2tpcFR5cGVkQXJyYXkgPSBmYWxzZSk6IFRbXSB7XG4gIGlmIChyZXN1bHQgPT0gbnVsbCkge1xuICAgIHJlc3VsdCA9IFtdO1xuICB9XG4gIGlmICh0eXBlb2YgYXJyID09PSAnYm9vbGVhbicgfHwgdHlwZW9mIGFyciA9PT0gJ251bWJlcicgfHxcbiAgICB0eXBlb2YgYXJyID09PSAnc3RyaW5nJyB8fCBiYXNlLmlzUHJvbWlzZShhcnIpIHx8IGFyciA9PSBudWxsIHx8XG4gICAgICBpc1R5cGVkQXJyYXkoYXJyKSAmJiBza2lwVHlwZWRBcnJheSkge1xuICAgIHJlc3VsdC5wdXNoKGFyciBhcyBUKTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFycikgfHwgaXNUeXBlZEFycmF5KGFycikpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFyci5sZW5ndGg7ICsraSkge1xuICAgICAgZmxhdHRlbihhcnJbaV0sIHJlc3VsdCwgc2tpcFR5cGVkQXJyYXkpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsZXQgbWF4SW5kZXggPSAtMTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhcnIpKSB7XG4gICAgICAvLyAwIG9yIHBvc2l0aXZlIGludGVnZXIuXG4gICAgICBpZiAoL14oWzEtOV0rWzAtOV0qfDApJC8udGVzdChrZXkpKSB7XG4gICAgICAgIG1heEluZGV4ID0gTWF0aC5tYXgobWF4SW5kZXgsIE51bWJlcihrZXkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbWF4SW5kZXg7IGkrKykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvblxuICAgICAgZmxhdHRlbigoYXJyIGFzIFJlY3Vyc2l2ZUFycmF5PFQ+KVtpXSwgcmVzdWx0LCBza2lwVHlwZWRBcnJheSk7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG4iXX0=