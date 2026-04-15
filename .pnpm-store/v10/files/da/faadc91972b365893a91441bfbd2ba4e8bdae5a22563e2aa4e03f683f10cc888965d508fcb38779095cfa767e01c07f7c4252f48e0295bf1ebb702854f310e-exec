/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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
import { TensorScatterUpdate } from '../kernel_names';
import { convertToTensor } from '../tensor_util_env';
import { op } from './operation';
import * as scatter_nd_util from './scatter_nd_util';
/**
 * Creates a new tensor by applying sparse updates to individual
 * values or slices to the passed in tensor according to
 * indices. This operator is the similar to scatterNd op, except that the
 * udpates are scattered on an existing tensor (as opposed to a zero-tensor).
 *
 * If indices contains duplicates, then we pick the last update for the index.
 *
 * If an out of bound index is found on CPU, an error is returned.
 *
 * Warning: There are some GPU specific semantics for this operation.
 *  - If an out of bound index is found, the index is ignored.
 *  - The order in which updates are applied is nondeterministic, so the output
 * will be nondeterministic if indices contains duplicates.
 * ```js
 * const shape = [8];
 * const tensor = tf.ones(shape);
 * const indices = tf.tensor2d([4, 3, 1, 7], [4, 1], 'int32');
 * const updates = tf.tensor1d([9, 10, 11, 12]);
 *
 * tf.tensorScatterUpdate(tensor, indices, updates).print();
 *    //[1, 11, 1, 10, 9, 1, 1, 12]
 * ```
 *
 * @param tensor A Tensor. Tensor to copy/update.
 * @param indices The tensor contains the indices into the output tensor, must
 *     have at least 2 axes: (num_updates, index_depth).
 * @param updates The tensor contains the value for the indices.
 *
 * @doc {heading: 'Operations', subheading: 'Slicing and Joining'}
 */
function tensorScatterUpdate_(tensor, indices, updates) {
    const $tensor = convertToTensor(tensor, 'tensor', 'tensorScatterupdate');
    const $indices = convertToTensor(indices, 'indices', 'tensorScatterupdate', 'int32');
    const $updates = convertToTensor(updates, 'updates', 'tensorScatterupdate');
    scatter_nd_util.validateInput($updates, $indices, $tensor.shape);
    if ($tensor.dtype !== $updates.dtype) {
        throw new Error(`tensor and updates must have the same dtype, instead they are ${$tensor.dtype} and ${$updates.dtype}.`);
    }
    const inputs = {
        tensor: $tensor,
        indices: $indices,
        updates: $updates
    };
    const attrs = {};
    // tslint:disable-next-line: no-unnecessary-type-assertion
    return ENGINE.runKernel(TensorScatterUpdate, inputs, attrs);
}
export const tensorScatterUpdate = op({ tensorScatterUpdate_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuc29yX3NjYXR0ZXJfdXBkYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvdGVuc29yX3NjYXR0ZXJfdXBkYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFDakMsT0FBTyxFQUFDLG1CQUFtQixFQUFzRCxNQUFNLGlCQUFpQixDQUFDO0FBSXpHLE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUduRCxPQUFPLEVBQUMsRUFBRSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBQy9CLE9BQU8sS0FBSyxlQUFlLE1BQU0sbUJBQW1CLENBQUM7QUFFckQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQThCRztBQUNILFNBQVMsb0JBQW9CLENBQ3pCLE1BQTRCLEVBQUUsT0FBMEIsRUFDeEQsT0FBMEI7SUFDNUIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUscUJBQXFCLENBQUMsQ0FBQztJQUN6RSxNQUFNLFFBQVEsR0FDVixlQUFlLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4RSxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzVFLGVBQWUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakUsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsQ0FBQyxLQUFLLEVBQUU7UUFDcEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxpRUFDSSxPQUFPLENBQUMsS0FBSyxRQUFRLFFBQVEsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxNQUFNLEdBQThCO1FBQ3hDLE1BQU0sRUFBRSxPQUFPO1FBQ2YsT0FBTyxFQUFFLFFBQVE7UUFDakIsT0FBTyxFQUFFLFFBQVE7S0FDbEIsQ0FBQztJQUNGLE1BQU0sS0FBSyxHQUE2QixFQUFFLENBQUM7SUFFM0MsMERBQTBEO0lBQzFELE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FDWixtQkFBbUIsRUFBRSxNQUFtQyxFQUN4RCxLQUFnQyxDQUFjLENBQUM7QUFDNUQsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQyxFQUFDLG9CQUFvQixFQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIyIEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtFTkdJTkV9IGZyb20gJy4uL2VuZ2luZSc7XG5pbXBvcnQge1RlbnNvclNjYXR0ZXJVcGRhdGUsIFRlbnNvclNjYXR0ZXJVcGRhdGVBdHRycywgVGVuc29yU2NhdHRlclVwZGF0ZUlucHV0c30gZnJvbSAnLi4va2VybmVsX25hbWVzJztcbmltcG9ydCB7TmFtZWRBdHRyTWFwfSBmcm9tICcuLi9rZXJuZWxfcmVnaXN0cnknO1xuaW1wb3J0IHtUZW5zb3J9IGZyb20gJy4uL3RlbnNvcic7XG5pbXBvcnQge05hbWVkVGVuc29yTWFwfSBmcm9tICcuLi90ZW5zb3JfdHlwZXMnO1xuaW1wb3J0IHtjb252ZXJ0VG9UZW5zb3J9IGZyb20gJy4uL3RlbnNvcl91dGlsX2Vudic7XG5pbXBvcnQge1JhbmssIFRlbnNvckxpa2V9IGZyb20gJy4uL3R5cGVzJztcblxuaW1wb3J0IHtvcH0gZnJvbSAnLi9vcGVyYXRpb24nO1xuaW1wb3J0ICogYXMgc2NhdHRlcl9uZF91dGlsIGZyb20gJy4vc2NhdHRlcl9uZF91dGlsJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IHRlbnNvciBieSBhcHBseWluZyBzcGFyc2UgdXBkYXRlcyB0byBpbmRpdmlkdWFsXG4gKiB2YWx1ZXMgb3Igc2xpY2VzIHRvIHRoZSBwYXNzZWQgaW4gdGVuc29yIGFjY29yZGluZyB0b1xuICogaW5kaWNlcy4gVGhpcyBvcGVyYXRvciBpcyB0aGUgc2ltaWxhciB0byBzY2F0dGVyTmQgb3AsIGV4Y2VwdCB0aGF0IHRoZVxuICogdWRwYXRlcyBhcmUgc2NhdHRlcmVkIG9uIGFuIGV4aXN0aW5nIHRlbnNvciAoYXMgb3Bwb3NlZCB0byBhIHplcm8tdGVuc29yKS5cbiAqXG4gKiBJZiBpbmRpY2VzIGNvbnRhaW5zIGR1cGxpY2F0ZXMsIHRoZW4gd2UgcGljayB0aGUgbGFzdCB1cGRhdGUgZm9yIHRoZSBpbmRleC5cbiAqXG4gKiBJZiBhbiBvdXQgb2YgYm91bmQgaW5kZXggaXMgZm91bmQgb24gQ1BVLCBhbiBlcnJvciBpcyByZXR1cm5lZC5cbiAqXG4gKiBXYXJuaW5nOiBUaGVyZSBhcmUgc29tZSBHUFUgc3BlY2lmaWMgc2VtYW50aWNzIGZvciB0aGlzIG9wZXJhdGlvbi5cbiAqICAtIElmIGFuIG91dCBvZiBib3VuZCBpbmRleCBpcyBmb3VuZCwgdGhlIGluZGV4IGlzIGlnbm9yZWQuXG4gKiAgLSBUaGUgb3JkZXIgaW4gd2hpY2ggdXBkYXRlcyBhcmUgYXBwbGllZCBpcyBub25kZXRlcm1pbmlzdGljLCBzbyB0aGUgb3V0cHV0XG4gKiB3aWxsIGJlIG5vbmRldGVybWluaXN0aWMgaWYgaW5kaWNlcyBjb250YWlucyBkdXBsaWNhdGVzLlxuICogYGBganNcbiAqIGNvbnN0IHNoYXBlID0gWzhdO1xuICogY29uc3QgdGVuc29yID0gdGYub25lcyhzaGFwZSk7XG4gKiBjb25zdCBpbmRpY2VzID0gdGYudGVuc29yMmQoWzQsIDMsIDEsIDddLCBbNCwgMV0sICdpbnQzMicpO1xuICogY29uc3QgdXBkYXRlcyA9IHRmLnRlbnNvcjFkKFs5LCAxMCwgMTEsIDEyXSk7XG4gKlxuICogdGYudGVuc29yU2NhdHRlclVwZGF0ZSh0ZW5zb3IsIGluZGljZXMsIHVwZGF0ZXMpLnByaW50KCk7XG4gKiAgICAvL1sxLCAxMSwgMSwgMTAsIDksIDEsIDEsIDEyXVxuICogYGBgXG4gKlxuICogQHBhcmFtIHRlbnNvciBBIFRlbnNvci4gVGVuc29yIHRvIGNvcHkvdXBkYXRlLlxuICogQHBhcmFtIGluZGljZXMgVGhlIHRlbnNvciBjb250YWlucyB0aGUgaW5kaWNlcyBpbnRvIHRoZSBvdXRwdXQgdGVuc29yLCBtdXN0XG4gKiAgICAgaGF2ZSBhdCBsZWFzdCAyIGF4ZXM6IChudW1fdXBkYXRlcywgaW5kZXhfZGVwdGgpLlxuICogQHBhcmFtIHVwZGF0ZXMgVGhlIHRlbnNvciBjb250YWlucyB0aGUgdmFsdWUgZm9yIHRoZSBpbmRpY2VzLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdPcGVyYXRpb25zJywgc3ViaGVhZGluZzogJ1NsaWNpbmcgYW5kIEpvaW5pbmcnfVxuICovXG5mdW5jdGlvbiB0ZW5zb3JTY2F0dGVyVXBkYXRlXzxSIGV4dGVuZHMgUmFuaz4oXG4gICAgdGVuc29yOiBUZW5zb3I8Uj58VGVuc29yTGlrZSwgaW5kaWNlczogVGVuc29yfFRlbnNvckxpa2UsXG4gICAgdXBkYXRlczogVGVuc29yfFRlbnNvckxpa2UpOiBUZW5zb3I8Uj4ge1xuICBjb25zdCAkdGVuc29yID0gY29udmVydFRvVGVuc29yKHRlbnNvciwgJ3RlbnNvcicsICd0ZW5zb3JTY2F0dGVydXBkYXRlJyk7XG4gIGNvbnN0ICRpbmRpY2VzID1cbiAgICAgIGNvbnZlcnRUb1RlbnNvcihpbmRpY2VzLCAnaW5kaWNlcycsICd0ZW5zb3JTY2F0dGVydXBkYXRlJywgJ2ludDMyJyk7XG4gIGNvbnN0ICR1cGRhdGVzID0gY29udmVydFRvVGVuc29yKHVwZGF0ZXMsICd1cGRhdGVzJywgJ3RlbnNvclNjYXR0ZXJ1cGRhdGUnKTtcbiAgc2NhdHRlcl9uZF91dGlsLnZhbGlkYXRlSW5wdXQoJHVwZGF0ZXMsICRpbmRpY2VzLCAkdGVuc29yLnNoYXBlKTtcbiAgaWYgKCR0ZW5zb3IuZHR5cGUgIT09ICR1cGRhdGVzLmR0eXBlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgdGVuc29yIGFuZCB1cGRhdGVzIG11c3QgaGF2ZSB0aGUgc2FtZSBkdHlwZSwgaW5zdGVhZCB0aGV5IGFyZSAke1xuICAgICAgICAgICAgJHRlbnNvci5kdHlwZX0gYW5kICR7JHVwZGF0ZXMuZHR5cGV9LmApO1xuICB9XG5cbiAgY29uc3QgaW5wdXRzOiBUZW5zb3JTY2F0dGVyVXBkYXRlSW5wdXRzID0ge1xuICAgIHRlbnNvcjogJHRlbnNvcixcbiAgICBpbmRpY2VzOiAkaW5kaWNlcyxcbiAgICB1cGRhdGVzOiAkdXBkYXRlc1xuICB9O1xuICBjb25zdCBhdHRyczogVGVuc29yU2NhdHRlclVwZGF0ZUF0dHJzID0ge307XG5cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby11bm5lY2Vzc2FyeS10eXBlLWFzc2VydGlvblxuICByZXR1cm4gRU5HSU5FLnJ1bktlcm5lbChcbiAgICAgICAgICAgICBUZW5zb3JTY2F0dGVyVXBkYXRlLCBpbnB1dHMgYXMgdW5rbm93biBhcyBOYW1lZFRlbnNvck1hcCxcbiAgICAgICAgICAgICBhdHRycyBhcyB1bmtub3duIGFzIE5hbWVkQXR0ck1hcCkgYXMgVGVuc29yPFI+O1xufVxuXG5leHBvcnQgY29uc3QgdGVuc29yU2NhdHRlclVwZGF0ZSA9IG9wKHt0ZW5zb3JTY2F0dGVyVXBkYXRlX30pO1xuIl19