/**
 * @license
 * Copyright 2023 Google LLC.
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
import { op } from './operation';
import { randomUniform } from './random_uniform';
/**
 * Creates a `tf.Tensor` with integers sampled from a uniform distribution.
 *
 * The generated values are uniform integers in the range [minval, maxval). The
 * lower bound minval is included in the range, while the upper bound maxval is
 * excluded.
 *
 * ```js
 * tf.randomUniformInt([2, 2], 0, 10).print();
 * ```
 *
 * @param shape An array of integers defining the output tensor shape.
 * @param minval Inclusive lower bound on the generated integers.
 * @param maxval Exclusive upper bound on the generated integers.
 * @param seed An optional int. Defaults to 0. If seed is set to be non-zero,
 *   the random number generator is seeded by the given seed. Otherwise, it is
 *   seeded by a random seed.
 *
 * @doc {heading: 'Tensors', subheading: 'Random'}
 */
function randomUniformInt_(shape, minval, maxval, seed) {
    // TODO(mattsoulanille): Handle optional seed2 input.
    return randomUniform(shape, minval, maxval, 'int32', seed);
}
export const randomUniformInt = /* @__PURE__ */ op({ randomUniformInt_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tX3VuaWZvcm1faW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvcmFuZG9tX3VuaWZvcm1faW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUlILE9BQU8sRUFBQyxFQUFFLEVBQUMsTUFBTSxhQUFhLENBQUM7QUFDL0IsT0FBTyxFQUFDLGFBQWEsRUFBQyxNQUFNLGtCQUFrQixDQUFDO0FBRS9DOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FDeEIsS0FBa0IsRUFBRSxNQUFjLEVBQUUsTUFBYyxFQUNoRCxJQUFvQjtJQUN0QixxREFBcUQ7SUFDckQsT0FBTyxhQUFhLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzdELENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQUMsaUJBQWlCLEVBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge1RlbnNvcn0gZnJvbSAnLi4vdGVuc29yJztcbmltcG9ydCB7UmFuaywgU2hhcGVNYXB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7b3B9IGZyb20gJy4vb3BlcmF0aW9uJztcbmltcG9ydCB7cmFuZG9tVW5pZm9ybX0gZnJvbSAnLi9yYW5kb21fdW5pZm9ybSc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIGB0Zi5UZW5zb3JgIHdpdGggaW50ZWdlcnMgc2FtcGxlZCBmcm9tIGEgdW5pZm9ybSBkaXN0cmlidXRpb24uXG4gKlxuICogVGhlIGdlbmVyYXRlZCB2YWx1ZXMgYXJlIHVuaWZvcm0gaW50ZWdlcnMgaW4gdGhlIHJhbmdlIFttaW52YWwsIG1heHZhbCkuIFRoZVxuICogbG93ZXIgYm91bmQgbWludmFsIGlzIGluY2x1ZGVkIGluIHRoZSByYW5nZSwgd2hpbGUgdGhlIHVwcGVyIGJvdW5kIG1heHZhbCBpc1xuICogZXhjbHVkZWQuXG4gKlxuICogYGBganNcbiAqIHRmLnJhbmRvbVVuaWZvcm1JbnQoWzIsIDJdLCAwLCAxMCkucHJpbnQoKTtcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSBzaGFwZSBBbiBhcnJheSBvZiBpbnRlZ2VycyBkZWZpbmluZyB0aGUgb3V0cHV0IHRlbnNvciBzaGFwZS5cbiAqIEBwYXJhbSBtaW52YWwgSW5jbHVzaXZlIGxvd2VyIGJvdW5kIG9uIHRoZSBnZW5lcmF0ZWQgaW50ZWdlcnMuXG4gKiBAcGFyYW0gbWF4dmFsIEV4Y2x1c2l2ZSB1cHBlciBib3VuZCBvbiB0aGUgZ2VuZXJhdGVkIGludGVnZXJzLlxuICogQHBhcmFtIHNlZWQgQW4gb3B0aW9uYWwgaW50LiBEZWZhdWx0cyB0byAwLiBJZiBzZWVkIGlzIHNldCB0byBiZSBub24temVybyxcbiAqICAgdGhlIHJhbmRvbSBudW1iZXIgZ2VuZXJhdG9yIGlzIHNlZWRlZCBieSB0aGUgZ2l2ZW4gc2VlZC4gT3RoZXJ3aXNlLCBpdCBpc1xuICogICBzZWVkZWQgYnkgYSByYW5kb20gc2VlZC5cbiAqXG4gKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdSYW5kb20nfVxuICovXG5mdW5jdGlvbiByYW5kb21Vbmlmb3JtSW50XzxSIGV4dGVuZHMgUmFuaz4oXG4gIHNoYXBlOiBTaGFwZU1hcFtSXSwgbWludmFsOiBudW1iZXIsIG1heHZhbDogbnVtYmVyLFxuICAgIHNlZWQ/OiBudW1iZXJ8c3RyaW5nKTogVGVuc29yPFI+IHtcbiAgLy8gVE9ETyhtYXR0c291bGFuaWxsZSk6IEhhbmRsZSBvcHRpb25hbCBzZWVkMiBpbnB1dC5cbiAgcmV0dXJuIHJhbmRvbVVuaWZvcm0oc2hhcGUsIG1pbnZhbCwgbWF4dmFsLCAnaW50MzInLCBzZWVkKTtcbn1cblxuZXhwb3J0IGNvbnN0IHJhbmRvbVVuaWZvcm1JbnQgPSAvKiBAX19QVVJFX18gKi8gb3Aoe3JhbmRvbVVuaWZvcm1JbnRffSk7XG4iXX0=