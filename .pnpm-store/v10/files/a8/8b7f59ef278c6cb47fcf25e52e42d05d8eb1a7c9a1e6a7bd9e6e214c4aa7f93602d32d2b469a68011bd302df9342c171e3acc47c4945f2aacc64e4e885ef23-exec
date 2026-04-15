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
import { convertToTensor } from '../../tensor_util_env';
import { assert } from '../../util';
import { greaterEqual } from '../greater_equal';
import { less } from '../less';
import { lessEqual } from '../less_equal';
import { logicalAnd } from '../logical_and';
import { minimum } from '../minimum';
import { neg } from '../neg';
import { op } from '../operation';
import { range } from '../range';
import { reshape } from '../reshape';
import { stack } from '../stack';
import { sub } from '../sub';
import { unstack } from '../unstack';
import { where } from '../where';
import { zeros } from '../zeros';
/**
 * Copy a tensor setting everything outside a central band in each innermost
 * matrix to zero.
 *
 * The band part is computed as follows: Assume input has `k` dimensions
 * `[I, J, K, ..., M, N]`, then the output is a tensor with the same shape where
 * `band[i, j, k, ..., m, n] = in_band(m, n) * input[i, j, k, ..., m, n]`.
 * The indicator function
 * `in_band(m, n) = (num_lower < 0 || (m-n) <= num_lower)`
 * `&& (num_upper < 0 || (n-m) <= num_upper)`
 *
 * ```js
 * const x = tf.tensor2d([[ 0,  1,  2, 3],
 *                        [-1,  0,  1, 2],
 *                        [-2, -1,  0, 1],
 *                        [-3, -2, -1, 0]]);
 * let y = tf.linalg.bandPart(x, 1, -1);
 * y.print(); // [[ 0,  1,  2, 3],
 *            //  [-1,  0,  1, 2],
 *            //  [ 0, -1,  0, 1],
 *            //  [ 0, 0 , -1, 0]]
 * let z = tf.linalg.bandPart(x, 2, 1);
 * z.print(); // [[ 0,  1,  0, 0],
 *            //  [-1,  0,  1, 0],
 *            //  [-2, -1,  0, 1],
 *            //  [ 0, -2, -1, 0]]
 * ```
 *
 * @param x Rank `k` tensor
 * @param numLower Number of subdiagonals to keep.
 *   If negative, keep entire lower triangle.
 * @param numUpper Number of subdiagonals to keep.
 *   If negative, keep entire upper triangle.
 * @returns Rank `k` tensor of the same shape as input.
 *   The extracted banded tensor.
 *
 * @doc {heading:'Operations', subheading:'Linear Algebra', namespace:'linalg'}
 */
function bandPart_(a, numLower, numUpper) {
    const $a = convertToTensor(a, 'a', 'bandPart');
    assert($a.rank >= 2, () => `bandPart(): Rank must be at least 2, got ${$a.rank}.`);
    const shape = $a.shape;
    const [M, N] = $a.shape.slice(-2);
    let $numLower;
    let $numUpper;
    if (typeof numLower === 'number') {
        assert(numLower % 1 === 0, () => `bandPart(): numLower must be an integer, got ${numLower}.`);
        assert(numLower <= M, () => `bandPart(): numLower (${numLower})` +
            ` must not be greater than the number of rows (${M}).`);
        $numLower =
            convertToTensor(numLower < 0 ? M : numLower, 'numLower', 'bandPart');
    }
    else {
        assert(numLower.dtype === 'int32', () => `bandPart(): numLower's dtype must be an int32.`);
        // If numLower is a Scalar, checking `numLower <= M` could hurt performance,
        // but minimum(numLower, M) could avoid unexpected results.
        $numLower = where(less(numLower, 0), M, minimum(numLower, M));
    }
    if (typeof numUpper === 'number') {
        assert(numUpper % 1 === 0, () => `bandPart(): numUpper must be an integer, got ${numUpper}.`);
        assert(numUpper <= N, () => `bandPart(): numUpper (${numUpper})` +
            ` must not be greater than the number of columns (${N}).`);
        $numUpper =
            convertToTensor(numUpper < 0 ? N : numUpper, 'numUpper', 'bandPart');
    }
    else {
        assert(numUpper.dtype === 'int32', () => `bandPart(): numUpper's dtype must be an int32.`);
        $numUpper = where(less(numUpper, 0), N, minimum(numUpper, N));
    }
    const i = reshape(range(0, M, 1, 'int32'), [-1, 1]);
    const j = range(0, N, 1, 'int32');
    const ij = sub(i, j);
    const inBand = logicalAnd(lessEqual(ij, $numLower), greaterEqual(ij, neg($numUpper)));
    const zero = zeros([M, N], $a.dtype);
    return reshape(stack(unstack(reshape($a, [-1, M, N]))
        .map(mat => where(inBand, mat, zero))), shape);
}
export const bandPart = /* @__PURE__ */ op({ bandPart_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFuZF9wYXJ0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvbGluYWxnL2JhbmRfcGFydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFHSCxPQUFPLEVBQUMsZUFBZSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFdEQsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFlBQVksQ0FBQztBQUVsQyxPQUFPLEVBQUMsWUFBWSxFQUFDLE1BQU0sa0JBQWtCLENBQUM7QUFDOUMsT0FBTyxFQUFDLElBQUksRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUM3QixPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxVQUFVLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUMxQyxPQUFPLEVBQUMsT0FBTyxFQUFDLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxHQUFHLEVBQUMsTUFBTSxRQUFRLENBQUM7QUFDM0IsT0FBTyxFQUFDLEVBQUUsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNoQyxPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBQy9CLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMvQixPQUFPLEVBQUMsR0FBRyxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBQzNCLE9BQU8sRUFBQyxPQUFPLEVBQUMsTUFBTSxZQUFZLENBQUM7QUFDbkMsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLFVBQVUsQ0FBQztBQUMvQixPQUFPLEVBQUMsS0FBSyxFQUFDLE1BQU0sVUFBVSxDQUFDO0FBRS9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUNHO0FBQ0gsU0FBUyxTQUFTLENBQ2Qs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LFlBQVksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUzRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXJDLE9BQU8sT0FBTyxDQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzNCLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDaEQsS0FBSyxDQUFNLENBQUM7QUFDekIsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIwIEdvb2dsZSBMTEMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtTY2FsYXIsIFRlbnNvcn0gZnJvbSAnLi4vLi4vdGVuc29yJztcbmltcG9ydCB7Y29udmVydFRvVGVuc29yfSBmcm9tICcuLi8uLi90ZW5zb3JfdXRpbF9lbnYnO1xuaW1wb3J0IHtUZW5zb3JMaWtlfSBmcm9tICcuLi8uLi90eXBlcyc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnLi4vLi4vdXRpbCc7XG5cbmltcG9ydCB7Z3JlYXRlckVxdWFsfSBmcm9tICcuLi9ncmVhdGVyX2VxdWFsJztcbmltcG9ydCB7bGVzc30gZnJvbSAnLi4vbGVzcyc7XG5pbXBvcnQge2xlc3NFcXVhbH0gZnJvbSAnLi4vbGVzc19lcXVhbCc7XG5pbXBvcnQge2xvZ2ljYWxBbmR9IGZyb20gJy4uL2xvZ2ljYWxfYW5kJztcbmltcG9ydCB7bWluaW11bX0gZnJvbSAnLi4vbWluaW11bSc7XG5pbXBvcnQge25lZ30gZnJvbSAnLi4vbmVnJztcbmltcG9ydCB7b3B9IGZyb20gJy4uL29wZXJhdGlvbic7XG5pbXBvcnQge3JhbmdlfSBmcm9tICcuLi9yYW5nZSc7XG5pbXBvcnQge3Jlc2hhcGV9IGZyb20gJy4uL3Jlc2hhcGUnO1xuaW1wb3J0IHtzdGFja30gZnJvbSAnLi4vc3RhY2snO1xuaW1wb3J0IHtzdWJ9IGZyb20gJy4uL3N1Yic7XG5pbXBvcnQge3Vuc3RhY2t9IGZyb20gJy4uL3Vuc3RhY2snO1xuaW1wb3J0IHt3aGVyZX0gZnJvbSAnLi4vd2hlcmUnO1xuaW1wb3J0IHt6ZXJvc30gZnJvbSAnLi4vemVyb3MnO1xuXG4vKipcbiAqIENvcHkgYSB0ZW5zb3Igc2V0dGluZyBldmVyeXRoaW5nIG91dHNpZGUgYSBjZW50cmFsIGJhbmQgaW4gZWFjaCBpbm5lcm1vc3RcbiAqIG1hdHJpeCB0byB6ZXJvLlxuICpcbiAqIFRoZSBiYW5kIHBhcnQgaXMgY29tcHV0ZWQgYXMgZm9sbG93czogQXNzdW1lIGlucHV0IGhhcyBga2AgZGltZW5zaW9uc1xuICogYFtJLCBKLCBLLCAuLi4sIE0sIE5dYCwgdGhlbiB0aGUgb3V0cHV0IGlzIGEgdGVuc29yIHdpdGggdGhlIHNhbWUgc2hhcGUgd2hlcmVcbiAqIGBiYW5kW2ksIGosIGssIC4uLiwgbSwgbl0gPSBpbl9iYW5kKG0sIG4pICogaW5wdXRbaSwgaiwgaywgLi4uLCBtLCBuXWAuXG4gKiBUaGUgaW5kaWNhdG9yIGZ1bmN0aW9uXG4gKiBgaW5fYmFuZChtLCBuKSA9IChudW1fbG93ZXIgPCAwIHx8IChtLW4pIDw9IG51bV9sb3dlcilgXG4gKiBgJiYgKG51bV91cHBlciA8IDAgfHwgKG4tbSkgPD0gbnVtX3VwcGVyKWBcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgeCA9IHRmLnRlbnNvcjJkKFtbIDAsICAxLCAgMiwgM10sXG4gKiAgICAgICAgICAgICAgICAgICAgICAgIFstMSwgIDAsICAxLCAyXSxcbiAqICAgICAgICAgICAgICAgICAgICAgICAgWy0yLCAtMSwgIDAsIDFdLFxuICogICAgICAgICAgICAgICAgICAgICAgICBbLTMsIC0yLCAtMSwgMF1dKTtcbiAqIGxldCB5ID0gdGYubGluYWxnLmJhbmRQYXJ0KHgsIDEsIC0xKTtcbiAqIHkucHJpbnQoKTsgLy8gW1sgMCwgIDEsICAyLCAzXSxcbiAqICAgICAgICAgICAgLy8gIFstMSwgIDAsICAxLCAyXSxcbiAqICAgICAgICAgICAgLy8gIFsgMCwgLTEsICAwLCAxXSxcbiAqICAgICAgICAgICAgLy8gIFsgMCwgMCAsIC0xLCAwXV1cbiAqIGxldCB6ID0gdGYubGluYWxnLmJhbmRQYXJ0KHgsIDIsIDEpO1xuICogei5wcmludCgpOyAvLyBbWyAwLCAgMSwgIDAsIDBdLFxuICogICAgICAgICAgICAvLyAgWy0xLCAgMCwgIDEsIDBdLFxuICogICAgICAgICAgICAvLyAgWy0yLCAtMSwgIDAsIDFdLFxuICogICAgICAgICAgICAvLyAgWyAwLCAtMiwgLTEsIDBdXVxuICogYGBgXG4gKlxuICogQHBhcmFtIHggUmFuayBga2AgdGVuc29yXG4gKiBAcGFyYW0gbnVtTG93ZXIgTnVtYmVyIG9mIHN1YmRpYWdvbmFscyB0byBrZWVwLlxuICogICBJZiBuZWdhdGl2ZSwga2VlcCBlbnRpcmUgbG93ZXIgdHJpYW5nbGUuXG4gKiBAcGFyYW0gbnVtVXBwZXIgTnVtYmVyIG9mIHN1YmRpYWdvbmFscyB0byBrZWVwLlxuICogICBJZiBuZWdhdGl2ZSwga2VlcCBlbnRpcmUgdXBwZXIgdHJpYW5nbGUuXG4gKiBAcmV0dXJucyBSYW5rIGBrYCB0ZW5zb3Igb2YgdGhlIHNhbWUgc2hhcGUgYXMgaW5wdXQuXG4gKiAgIFRoZSBleHRyYWN0ZWQgYmFuZGVkIHRlbnNvci5cbiAqXG4gKiBAZG9jIHtoZWFkaW5nOidPcGVyYXRpb25zJywgc3ViaGVhZGluZzonTGluZWFyIEFsZ2VicmEnLCBuYW1lc3BhY2U6J2xpbmFsZyd9XG4gKi9cbmZ1bmN0aW9uIGJhbmRQYXJ0XzxUIGV4dGVuZHMgVGVuc29yPihcbiAgICBhOiBUfFRlbnNvckxpa2UsIG51bUxvd2VyOiBudW1iZXJ8U2NhbGFyLCBudW1VcHBlcjogbnVtYmVyfFNjYWxhcik6IFQge1xuICBjb25zdCAkYSA9IGNvbnZlcnRUb1RlbnNvcihhLCAnYScsICdiYW5kUGFydCcpO1xuICBhc3NlcnQoXG4gICAgICAkYS5yYW5rID49IDIsXG4gICAgICAoKSA9PiBgYmFuZFBhcnQoKTogUmFuayBtdXN0IGJlIGF0IGxlYXN0IDIsIGdvdCAkeyRhLnJhbmt9LmApO1xuXG4gIGNvbnN0IHNoYXBlID0gJGEuc2hhcGU7XG4gIGNvbnN0IFtNLCBOXSA9ICRhLnNoYXBlLnNsaWNlKC0yKTtcblxuICBsZXQgJG51bUxvd2VyOiBTY2FsYXI7XG4gIGxldCAkbnVtVXBwZXI6IFNjYWxhcjtcbiAgaWYgKHR5cGVvZiBudW1Mb3dlciA9PT0gJ251bWJlcicpIHtcbiAgICBhc3NlcnQoXG4gICAgICAgIG51bUxvd2VyICUgMSA9PT0gMCxcbiAgICAgICAgKCkgPT4gYGJhbmRQYXJ0KCk6IG51bUxvd2VyIG11c3QgYmUgYW4gaW50ZWdlciwgZ290ICR7bnVtTG93ZXJ9LmApO1xuICAgIGFzc2VydChcbiAgICAgICAgbnVtTG93ZXIgPD0gTSxcbiAgICAgICAgKCkgPT4gYGJhbmRQYXJ0KCk6IG51bUxvd2VyICgke251bUxvd2VyfSlgICtcbiAgICAgICAgICAgIGAgbXVzdCBub3QgYmUgZ3JlYXRlciB0aGFuIHRoZSBudW1iZXIgb2Ygcm93cyAoJHtNfSkuYCk7XG4gICAgJG51bUxvd2VyID1cbiAgICAgICAgY29udmVydFRvVGVuc29yKG51bUxvd2VyIDwgMCA/IE0gOiBudW1Mb3dlciwgJ251bUxvd2VyJywgJ2JhbmRQYXJ0JykgYXNcbiAgICAgICAgU2NhbGFyO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydChcbiAgICAgICAgbnVtTG93ZXIuZHR5cGUgPT09ICdpbnQzMicsXG4gICAgICAgICgpID0+IGBiYW5kUGFydCgpOiBudW1Mb3dlcidzIGR0eXBlIG11c3QgYmUgYW4gaW50MzIuYCk7XG4gICAgLy8gSWYgbnVtTG93ZXIgaXMgYSBTY2FsYXIsIGNoZWNraW5nIGBudW1Mb3dlciA8PSBNYCBjb3VsZCBodXJ0IHBlcmZvcm1hbmNlLFxuICAgIC8vIGJ1dCBtaW5pbXVtKG51bUxvd2VyLCBNKSBjb3VsZCBhdm9pZCB1bmV4cGVjdGVkIHJlc3VsdHMuXG4gICAgJG51bUxvd2VyID0gd2hlcmUobGVzcyhudW1Mb3dlciwgMCksIE0sIG1pbmltdW0obnVtTG93ZXIsIE0pKSBhcyBTY2FsYXI7XG4gIH1cblxuICBpZiAodHlwZW9mIG51bVVwcGVyID09PSAnbnVtYmVyJykge1xuICAgIGFzc2VydChcbiAgICAgICAgbnVtVXBwZXIgJSAxID09PSAwLFxuICAgICAgICAoKSA9PiBgYmFuZFBhcnQoKTogbnVtVXBwZXIgbXVzdCBiZSBhbiBpbnRlZ2VyLCBnb3QgJHtudW1VcHBlcn0uYCk7XG4gICAgYXNzZXJ0KFxuICAgICAgICBudW1VcHBlciA8PSBOLFxuICAgICAgICAoKSA9PiBgYmFuZFBhcnQoKTogbnVtVXBwZXIgKCR7bnVtVXBwZXJ9KWAgK1xuICAgICAgICAgICAgYCBtdXN0IG5vdCBiZSBncmVhdGVyIHRoYW4gdGhlIG51bWJlciBvZiBjb2x1bW5zICgke059KS5gKTtcbiAgICAkbnVtVXBwZXIgPVxuICAgICAgICBjb252ZXJ0VG9UZW5zb3IobnVtVXBwZXIgPCAwID8gTiA6IG51bVVwcGVyLCAnbnVtVXBwZXInLCAnYmFuZFBhcnQnKSBhc1xuICAgICAgICBTY2FsYXI7XG4gIH0gZWxzZSB7XG4gICAgYXNzZXJ0KFxuICAgICAgICBudW1VcHBlci5kdHlwZSA9PT0gJ2ludDMyJyxcbiAgICAgICAgKCkgPT4gYGJhbmRQYXJ0KCk6IG51bVVwcGVyJ3MgZHR5cGUgbXVzdCBiZSBhbiBpbnQzMi5gKTtcbiAgICAkbnVtVXBwZXIgPSB3aGVyZShsZXNzKG51bVVwcGVyLCAwKSwgTiwgbWluaW11bShudW1VcHBlciwgTikpIGFzIFNjYWxhcjtcbiAgfVxuXG4gIGNvbnN0IGkgPSByZXNoYXBlKHJhbmdlKDAsIE0sIDEsICdpbnQzMicpLCBbLTEsIDFdKTtcbiAgY29uc3QgaiA9IHJhbmdlKDAsIE4sIDEsICdpbnQzMicpO1xuICBjb25zdCBpaiA9IHN1YihpLCBqKTtcblxuICBjb25zdCBpbkJhbmQgPVxuICAgICAgbG9naWNhbEFuZChsZXNzRXF1YWwoaWosICRudW1Mb3dlciksIGdyZWF0ZXJFcXVhbChpaiwgbmVnKCRudW1VcHBlcikpKTtcblxuICBjb25zdCB6ZXJvID0gemVyb3MoW00sIE5dLCAkYS5kdHlwZSk7XG5cbiAgcmV0dXJuIHJlc2hhcGUoXG4gICAgICAgICAgICAgc3RhY2sodW5zdGFjayhyZXNoYXBlKCRhLCBbLTEsIE0sIE5dKSlcbiAgICAgICAgICAgICAgICAgICAgICAgLm1hcChtYXQgPT4gd2hlcmUoaW5CYW5kLCBtYXQsIHplcm8pKSksXG4gICAgICAgICAgICAgc2hhcGUpIGFzIFQ7XG59XG5cbmV4cG9ydCBjb25zdCBiYW5kUGFydCA9IC8qIEBfX1BVUkVfXyAqLyBvcCh7YmFuZFBhcnRffSk7XG4iXX0=