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
import { ENGINE } from '../engine';
import { BitwiseAnd } from '../kernel_names';
import { convertToTensor } from '../tensor_util_env';
import { arraysEqual } from '../util_base';
import { op } from './operation';
/**
 * Bitwise `AND` operation for input tensors.
 *
 * Given two input tensors, returns a new tensor
 * with the `AND` calculated values.
 *
 * The method supports int32 values
 *
 *
 * ```js
 * const x = tf.tensor1d([0, 5, 3, 14], 'int32');
 * const y = tf.tensor1d([5, 0, 7, 11], 'int32');
 * tf.bitwiseAnd(x, y).print();
 * ```
 *
 * @param x The input tensor to be calculated.
 * @param y The input tensor to be calculated.
 *
 * @doc {heading: 'Operations', subheading: 'Logical'}
 */
function bitwiseAnd_(x, y) {
    const $x = convertToTensor(x, 'x', 'bitwiseAnd');
    const $y = convertToTensor(y, 'y', 'bitwiseAnd');
    if (!arraysEqual($x.shape, $y.shape)) {
        throw new Error(`BitwiseAnd: Tensors must have the same shape. x: ${$x.shape}, y: ${$y.shape}`);
    }
    if ($x.dtype !== 'int32' || $y.dtype !== 'int32') {
        throw new Error(`BitwiseAnd: Only supports 'int32' values in tensor, found type of x: ${$x.dtype} and type of y: ${$y.dtype}`);
    }
    const inputs = { a: $x, b: $y };
    return ENGINE.runKernel(BitwiseAnd, inputs);
}
export const bitwiseAnd = /* @__PURE__ */ op({ bitwiseAnd_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYml0d2lzZV9hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvcmUvc3JjL29wcy9iaXR3aXNlX2FuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFFSCxPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBQ2pDLE9BQU8sRUFBQyxVQUFVLEVBQW1CLE1BQU0saUJBQWlCLENBQUM7QUFHN0QsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxjQUFjLENBQUM7QUFFekMsT0FBTyxFQUFDLEVBQUUsRUFBQyxNQUFNLGFBQWEsQ0FBQztBQUUvQjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNILFNBQVMsV0FBVyxDQUFpQixDQUFTLEVBQUUsQ0FBUztJQUN2RCxNQUFNLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNqRCxNQUFNLEVBQUUsR0FBRyxlQUFlLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUVqRCxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQ1osRUFBRSxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztLQUNqQztJQUNELElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxPQUFPLElBQUksRUFBRSxDQUFDLEtBQUssS0FBSyxPQUFPLEVBQUU7UUFDaEQsTUFBTSxJQUFJLEtBQUssQ0FDWCx3RUFDSSxFQUFFLENBQUMsS0FBSyxtQkFBbUIsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDaEQ7SUFFRCxNQUFNLE1BQU0sR0FBcUIsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUNoRCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQW1DLENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBQ0QsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFBQyxXQUFXLEVBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjMgR29vZ2xlIExMQy5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge0VOR0lORX0gZnJvbSAnLi4vZW5naW5lJztcbmltcG9ydCB7Qml0d2lzZUFuZCwgQml0d2lzZUFuZElucHV0c30gZnJvbSAnLi4va2VybmVsX25hbWVzJztcbmltcG9ydCB7VGVuc29yfSBmcm9tICcuLi90ZW5zb3InO1xuaW1wb3J0IHtOYW1lZFRlbnNvck1hcH0gZnJvbSAnLi4vdGVuc29yX3R5cGVzJztcbmltcG9ydCB7Y29udmVydFRvVGVuc29yfSBmcm9tICcuLi90ZW5zb3JfdXRpbF9lbnYnO1xuaW1wb3J0IHtSYW5rfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQge2FycmF5c0VxdWFsfSBmcm9tICcuLi91dGlsX2Jhc2UnO1xuXG5pbXBvcnQge29wfSBmcm9tICcuL29wZXJhdGlvbic7XG5cbi8qKlxuICogQml0d2lzZSBgQU5EYCBvcGVyYXRpb24gZm9yIGlucHV0IHRlbnNvcnMuXG4gKlxuICogR2l2ZW4gdHdvIGlucHV0IHRlbnNvcnMsIHJldHVybnMgYSBuZXcgdGVuc29yXG4gKiB3aXRoIHRoZSBgQU5EYCBjYWxjdWxhdGVkIHZhbHVlcy5cbiAqXG4gKiBUaGUgbWV0aG9kIHN1cHBvcnRzIGludDMyIHZhbHVlc1xuICpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgeCA9IHRmLnRlbnNvcjFkKFswLCA1LCAzLCAxNF0sICdpbnQzMicpO1xuICogY29uc3QgeSA9IHRmLnRlbnNvcjFkKFs1LCAwLCA3LCAxMV0sICdpbnQzMicpO1xuICogdGYuYml0d2lzZUFuZCh4LCB5KS5wcmludCgpO1xuICogYGBgXG4gKlxuICogQHBhcmFtIHggVGhlIGlucHV0IHRlbnNvciB0byBiZSBjYWxjdWxhdGVkLlxuICogQHBhcmFtIHkgVGhlIGlucHV0IHRlbnNvciB0byBiZSBjYWxjdWxhdGVkLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdPcGVyYXRpb25zJywgc3ViaGVhZGluZzogJ0xvZ2ljYWwnfVxuICovXG5mdW5jdGlvbiBiaXR3aXNlQW5kXzxSIGV4dGVuZHMgUmFuaz4oeDogVGVuc29yLCB5OiBUZW5zb3IpOiBUZW5zb3I8Uj4ge1xuICBjb25zdCAkeCA9IGNvbnZlcnRUb1RlbnNvcih4LCAneCcsICdiaXR3aXNlQW5kJyk7XG4gIGNvbnN0ICR5ID0gY29udmVydFRvVGVuc29yKHksICd5JywgJ2JpdHdpc2VBbmQnKTtcblxuICBpZiAoIWFycmF5c0VxdWFsKCR4LnNoYXBlLCAkeS5zaGFwZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEJpdHdpc2VBbmQ6IFRlbnNvcnMgbXVzdCBoYXZlIHRoZSBzYW1lIHNoYXBlLiB4OiAke1xuICAgICAgICAkeC5zaGFwZX0sIHk6ICR7JHkuc2hhcGV9YCk7XG4gIH1cbiAgaWYgKCR4LmR0eXBlICE9PSAnaW50MzInIHx8ICR5LmR0eXBlICE9PSAnaW50MzInKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQml0d2lzZUFuZDogT25seSBzdXBwb3J0cyAnaW50MzInIHZhbHVlcyBpbiB0ZW5zb3IsIGZvdW5kIHR5cGUgb2YgeDogJHtcbiAgICAgICAgICAgICR4LmR0eXBlfSBhbmQgdHlwZSBvZiB5OiAkeyR5LmR0eXBlfWApO1xuICB9XG5cbiAgY29uc3QgaW5wdXRzOiBCaXR3aXNlQW5kSW5wdXRzID0ge2E6ICR4LCBiOiAkeX07XG4gIHJldHVybiBFTkdJTkUucnVuS2VybmVsKEJpdHdpc2VBbmQsIGlucHV0cyBhcyB1bmtub3duIGFzIE5hbWVkVGVuc29yTWFwKTtcbn1cbmV4cG9ydCBjb25zdCBiaXR3aXNlQW5kID0gLyogQF9fUFVSRV9fICovIG9wKHtiaXR3aXNlQW5kX30pO1xuIl19