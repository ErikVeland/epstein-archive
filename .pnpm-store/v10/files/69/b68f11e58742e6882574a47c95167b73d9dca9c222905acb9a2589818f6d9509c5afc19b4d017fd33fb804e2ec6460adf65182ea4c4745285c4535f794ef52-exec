/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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
import { Tile } from '../kernel_names';
import { convertToTensor } from '../tensor_util_env';
import * as util from '../util';
import { op } from './operation';
/**
 * Construct a tensor by repeating it the number of times given by reps.
 *
 * This operation creates a new tensor by replicating `input` `reps`
 * times. The output tensor's `i`th dimension has `input.shape[i] *
 * reps[i]` elements, and the values of `input` are replicated
 * `reps[i]` times along the `i`th dimension. For example, tiling
 * `[a, b, c, d]` by `[2]` produces `[a, b, c, d, a, b, c, d]`.
 *
 * ```js
 * const a = tf.tensor1d([1, 2]);
 *
 * a.tile([2]).print();    // or tf.tile(a, [2])
 * ```
 *
 * ```js
 * const a = tf.tensor2d([1, 2, 3, 4], [2, 2]);
 *
 * a.tile([1, 2]).print();  // or tf.tile(a, [1,2])
 * ```
 * @param x The tensor to tile.
 * @param reps Determines the number of replications per dimension.
 *
 * @doc {heading: 'Tensors', subheading: 'Slicing and Joining'}
 */
function tile_(x, reps) {
    const $x = convertToTensor(x, 'x', 'tile', 'string_or_numeric');
    util.assert($x.rank === reps.length, () => `Error in transpose: rank of input ${$x.rank} ` +
        `must match length of reps ${reps}.`);
    const inputs = { x: $x };
    const attrs = { reps };
    return ENGINE.runKernel(Tile, inputs, attrs);
}
export const tile = /* @__PURE__ */ op({ tile_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvb3BzL3RpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUMsSUFBSSxFQUF3QixNQUFNLGlCQUFpQixDQUFDO0FBSTVELE9BQU8sRUFBQyxlQUFlLEVBQUMsTUFBTSxvQkFBb0IsQ0FBQztBQUVuRCxPQUFPLEtBQUssSUFBSSxNQUFNLFNBQVMsQ0FBQztBQUVoQyxPQUFPLEVBQUMsRUFBRSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBRS9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3Qkc7QUFDSCxTQUFTLEtBQUssQ0FBbUIsQ0FBZSxFQUFFLElBQWM7SUFDOUQsTUFBTSxFQUFFLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLG1CQUFtQixDQUFDLENBQUM7SUFDaEUsSUFBSSxDQUFDLE1BQU0sQ0FDUCxFQUFFLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQ3ZCLEdBQUcsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLENBQUMsSUFBSSxHQUFHO1FBQ2pELDZCQUE2QixJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBRTlDLE1BQU0sTUFBTSxHQUFlLEVBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQ25DLE1BQU0sS0FBSyxHQUFjLEVBQUMsSUFBSSxFQUFDLENBQUM7SUFFaEMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUNuQixJQUFJLEVBQUUsTUFBbUMsRUFDekMsS0FBZ0MsQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsZUFBZSxDQUFDLEVBQUUsQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAyMCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7RU5HSU5FfSBmcm9tICcuLi9lbmdpbmUnO1xuaW1wb3J0IHtUaWxlLCBUaWxlQXR0cnMsIFRpbGVJbnB1dHN9IGZyb20gJy4uL2tlcm5lbF9uYW1lcyc7XG5pbXBvcnQge05hbWVkQXR0ck1hcH0gZnJvbSAnLi4va2VybmVsX3JlZ2lzdHJ5JztcbmltcG9ydCB7VGVuc29yfSBmcm9tICcuLi90ZW5zb3InO1xuaW1wb3J0IHtOYW1lZFRlbnNvck1hcH0gZnJvbSAnLi4vdGVuc29yX3R5cGVzJztcbmltcG9ydCB7Y29udmVydFRvVGVuc29yfSBmcm9tICcuLi90ZW5zb3JfdXRpbF9lbnYnO1xuaW1wb3J0IHtUZW5zb3JMaWtlfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gJy4uL3V0aWwnO1xuXG5pbXBvcnQge29wfSBmcm9tICcuL29wZXJhdGlvbic7XG5cbi8qKlxuICogQ29uc3RydWN0IGEgdGVuc29yIGJ5IHJlcGVhdGluZyBpdCB0aGUgbnVtYmVyIG9mIHRpbWVzIGdpdmVuIGJ5IHJlcHMuXG4gKlxuICogVGhpcyBvcGVyYXRpb24gY3JlYXRlcyBhIG5ldyB0ZW5zb3IgYnkgcmVwbGljYXRpbmcgYGlucHV0YCBgcmVwc2BcbiAqIHRpbWVzLiBUaGUgb3V0cHV0IHRlbnNvcidzIGBpYHRoIGRpbWVuc2lvbiBoYXMgYGlucHV0LnNoYXBlW2ldICpcbiAqIHJlcHNbaV1gIGVsZW1lbnRzLCBhbmQgdGhlIHZhbHVlcyBvZiBgaW5wdXRgIGFyZSByZXBsaWNhdGVkXG4gKiBgcmVwc1tpXWAgdGltZXMgYWxvbmcgdGhlIGBpYHRoIGRpbWVuc2lvbi4gRm9yIGV4YW1wbGUsIHRpbGluZ1xuICogYFthLCBiLCBjLCBkXWAgYnkgYFsyXWAgcHJvZHVjZXMgYFthLCBiLCBjLCBkLCBhLCBiLCBjLCBkXWAuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGEgPSB0Zi50ZW5zb3IxZChbMSwgMl0pO1xuICpcbiAqIGEudGlsZShbMl0pLnByaW50KCk7ICAgIC8vIG9yIHRmLnRpbGUoYSwgWzJdKVxuICogYGBgXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGEgPSB0Zi50ZW5zb3IyZChbMSwgMiwgMywgNF0sIFsyLCAyXSk7XG4gKlxuICogYS50aWxlKFsxLCAyXSkucHJpbnQoKTsgIC8vIG9yIHRmLnRpbGUoYSwgWzEsMl0pXG4gKiBgYGBcbiAqIEBwYXJhbSB4IFRoZSB0ZW5zb3IgdG8gdGlsZS5cbiAqIEBwYXJhbSByZXBzIERldGVybWluZXMgdGhlIG51bWJlciBvZiByZXBsaWNhdGlvbnMgcGVyIGRpbWVuc2lvbi5cbiAqXG4gKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdTbGljaW5nIGFuZCBKb2luaW5nJ31cbiAqL1xuZnVuY3Rpb24gdGlsZV88VCBleHRlbmRzIFRlbnNvcj4oeDogVHxUZW5zb3JMaWtlLCByZXBzOiBudW1iZXJbXSk6IFQge1xuICBjb25zdCAkeCA9IGNvbnZlcnRUb1RlbnNvcih4LCAneCcsICd0aWxlJywgJ3N0cmluZ19vcl9udW1lcmljJyk7XG4gIHV0aWwuYXNzZXJ0KFxuICAgICAgJHgucmFuayA9PT0gcmVwcy5sZW5ndGgsXG4gICAgICAoKSA9PiBgRXJyb3IgaW4gdHJhbnNwb3NlOiByYW5rIG9mIGlucHV0ICR7JHgucmFua30gYCArXG4gICAgICAgICAgYG11c3QgbWF0Y2ggbGVuZ3RoIG9mIHJlcHMgJHtyZXBzfS5gKTtcblxuICBjb25zdCBpbnB1dHM6IFRpbGVJbnB1dHMgPSB7eDogJHh9O1xuICBjb25zdCBhdHRyczogVGlsZUF0dHJzID0ge3JlcHN9O1xuXG4gIHJldHVybiBFTkdJTkUucnVuS2VybmVsKFxuICAgICAgVGlsZSwgaW5wdXRzIGFzIHVua25vd24gYXMgTmFtZWRUZW5zb3JNYXAsXG4gICAgICBhdHRycyBhcyB1bmtub3duIGFzIE5hbWVkQXR0ck1hcCk7XG59XG5cbmV4cG9ydCBjb25zdCB0aWxlID0gLyogQF9fUFVSRV9fICovIG9wKHt0aWxlX30pO1xuIl19