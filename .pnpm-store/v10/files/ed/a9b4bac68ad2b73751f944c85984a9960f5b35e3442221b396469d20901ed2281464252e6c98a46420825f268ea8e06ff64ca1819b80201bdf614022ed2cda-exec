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
import { convertToTensor } from '../tensor_util_env';
import { arraysEqualWithNull } from '../util_base';
import { op } from './operation';
/**
 * Checks the input tensor mathes the given shape.
 *
 * Given an input tensor, returns a new tensor with the same values as the
 * input tensor with shape `shape`.
 *
 * The method supports the null value in tensor. It will still check the shapes,
 * and null is a placeholder.
 *
 *
 * ```js
 * const x = tf.tensor1d([1, 2, 3, 4]);
 * const y = tf.tensor1d([1, null, 3, 4]);
 * const z = tf.tensor2d([1, 2, 3, 4], [2,2]);
 * tf.ensureShape(x, [4]).print();
 * tf.ensureShape(y, [4]).print();
 * tf.ensureShape(z, [null, 2]).print();
 * ```
 *
 * @param x The input tensor to be ensured.
 * @param shape A TensorShape representing the shape of this tensor, an array
 *     or null.
 *
 * @doc {heading: 'Tensors', subheading: 'Transformations'}
 */
function ensureShape_(x, shape) {
    const $x = convertToTensor(x, 'x', 'ensureShape', 'string_or_numeric');
    if (!arraysEqualWithNull($x.shape, shape)) {
        throw new Error(`EnsureShape: Shape of tensor ${$x.shape} is not compatible with expected shape ${shape}`);
    }
    return x;
}
export const ensureShape = /* @__PURE__ */ op({ ensureShape_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5zdXJlX3NoYXBlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvZW5zdXJlX3NoYXBlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUdILE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUVuRCxPQUFPLEVBQUMsbUJBQW1CLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFakQsT0FBTyxFQUFDLEVBQUUsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUUvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBd0JHO0FBQ0gsU0FBUyxZQUFZLENBQWlCLENBQVMsRUFBRSxLQUFrQjtJQUNqRSxNQUFNLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxhQUFhLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUN2RSxJQUFJLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRTtRQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLGdDQUNaLEVBQUUsQ0FBQyxLQUFLLDBDQUEwQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQ2hFO0lBRUQsT0FBTyxDQUFDLENBQUM7QUFDWCxDQUFDO0FBQ0QsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFBQyxZQUFZLEVBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge1RlbnNvcn0gZnJvbSAnLi4vdGVuc29yJztcbmltcG9ydCB7Y29udmVydFRvVGVuc29yfSBmcm9tICcuLi90ZW5zb3JfdXRpbF9lbnYnO1xuaW1wb3J0IHtSYW5rLCBTaGFwZU1hcH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHthcnJheXNFcXVhbFdpdGhOdWxsfSBmcm9tICcuLi91dGlsX2Jhc2UnO1xuXG5pbXBvcnQge29wfSBmcm9tICcuL29wZXJhdGlvbic7XG5cbi8qKlxuICogQ2hlY2tzIHRoZSBpbnB1dCB0ZW5zb3IgbWF0aGVzIHRoZSBnaXZlbiBzaGFwZS5cbiAqXG4gKiBHaXZlbiBhbiBpbnB1dCB0ZW5zb3IsIHJldHVybnMgYSBuZXcgdGVuc29yIHdpdGggdGhlIHNhbWUgdmFsdWVzIGFzIHRoZVxuICogaW5wdXQgdGVuc29yIHdpdGggc2hhcGUgYHNoYXBlYC5cbiAqXG4gKiBUaGUgbWV0aG9kIHN1cHBvcnRzIHRoZSBudWxsIHZhbHVlIGluIHRlbnNvci4gSXQgd2lsbCBzdGlsbCBjaGVjayB0aGUgc2hhcGVzLFxuICogYW5kIG51bGwgaXMgYSBwbGFjZWhvbGRlci5cbiAqXG4gKlxuICogYGBganNcbiAqIGNvbnN0IHggPSB0Zi50ZW5zb3IxZChbMSwgMiwgMywgNF0pO1xuICogY29uc3QgeSA9IHRmLnRlbnNvcjFkKFsxLCBudWxsLCAzLCA0XSk7XG4gKiBjb25zdCB6ID0gdGYudGVuc29yMmQoWzEsIDIsIDMsIDRdLCBbMiwyXSk7XG4gKiB0Zi5lbnN1cmVTaGFwZSh4LCBbNF0pLnByaW50KCk7XG4gKiB0Zi5lbnN1cmVTaGFwZSh5LCBbNF0pLnByaW50KCk7XG4gKiB0Zi5lbnN1cmVTaGFwZSh6LCBbbnVsbCwgMl0pLnByaW50KCk7XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0geCBUaGUgaW5wdXQgdGVuc29yIHRvIGJlIGVuc3VyZWQuXG4gKiBAcGFyYW0gc2hhcGUgQSBUZW5zb3JTaGFwZSByZXByZXNlbnRpbmcgdGhlIHNoYXBlIG9mIHRoaXMgdGVuc29yLCBhbiBhcnJheVxuICogICAgIG9yIG51bGwuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnVHJhbnNmb3JtYXRpb25zJ31cbiAqL1xuZnVuY3Rpb24gZW5zdXJlU2hhcGVfPFIgZXh0ZW5kcyBSYW5rPih4OiBUZW5zb3IsIHNoYXBlOiBTaGFwZU1hcFtSXSk6IFRlbnNvciB7XG4gIGNvbnN0ICR4ID0gY29udmVydFRvVGVuc29yKHgsICd4JywgJ2Vuc3VyZVNoYXBlJywgJ3N0cmluZ19vcl9udW1lcmljJyk7XG4gIGlmICghYXJyYXlzRXF1YWxXaXRoTnVsbCgkeC5zaGFwZSwgc2hhcGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBFbnN1cmVTaGFwZTogU2hhcGUgb2YgdGVuc29yICR7XG4gICAgICAgICR4LnNoYXBlfSBpcyBub3QgY29tcGF0aWJsZSB3aXRoIGV4cGVjdGVkIHNoYXBlICR7c2hhcGV9YCk7XG4gIH1cblxuICByZXR1cm4geDtcbn1cbmV4cG9ydCBjb25zdCBlbnN1cmVTaGFwZSA9IC8qIEBfX1BVUkVfXyAqLyBvcCh7ZW5zdXJlU2hhcGVffSk7XG4iXX0=