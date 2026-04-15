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
import { convertToTensor } from '../../tensor_util_env';
import * as util from '../../util';
import { cast } from '../cast';
import { einsum } from '../einsum';
import { expandDims } from '../expand_dims';
import { op } from '../operation';
import { tensor1d } from '../tensor1d';
/**
 * Converts images from RGB format to grayscale.
 *
 * @param image A RGB tensor to convert. The `image`'s last dimension must
 *     be size 3 with at least a two-dimensional shape.
 *
 * @doc {heading: 'Operations', subheading: 'Images', namespace: 'image'}
 */
function rgbToGrayscale_(image) {
    const $image = convertToTensor(image, 'image', 'RGBToGrayscale');
    const lastDimsIdx = $image.rank - 1;
    const lastDims = $image.shape[lastDimsIdx];
    util.assert($image.rank >= 2, () => 'Error in RGBToGrayscale: images must be at least rank 2, ' +
        `but got rank ${$image.rank}.`);
    util.assert(lastDims === 3, () => 'Error in RGBToGrayscale: last dimension of an RGB image ' +
        `should be size 3, but got size ${lastDims}.`);
    // Remember original dtype so we can convert back if needed
    const origDtype = $image.dtype;
    const fltImage = cast($image, 'float32');
    const rgbWeights = tensor1d([0.2989, 0.5870, 0.1140]);
    let grayFloat;
    switch ($image.rank) {
        case 2:
            grayFloat = einsum('ij,j->i', fltImage, rgbWeights);
            break;
        case 3:
            grayFloat = einsum('ijk,k->ij', fltImage, rgbWeights);
            break;
        case 4:
            grayFloat = einsum('ijkl,l->ijk', fltImage, rgbWeights);
            break;
        case 5:
            grayFloat = einsum('ijklm,m->ijkl', fltImage, rgbWeights);
            break;
        case 6:
            grayFloat = einsum('ijklmn,n->ijklm', fltImage, rgbWeights);
            break;
        default:
            throw new Error('Not a valid tensor rank.');
    }
    grayFloat = expandDims(grayFloat, -1);
    return cast(grayFloat, origDtype);
}
export const rgbToGrayscale = /* @__PURE__ */ op({ rgbToGrayscale_ });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmdiX3RvX2dyYXlzY2FsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtY29yZS9zcmMvb3BzL2ltYWdlL3JnYl90b19ncmF5c2NhbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBR0gsT0FBTyxFQUFDLGVBQWUsRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRXRELE9BQU8sS0FBSyxJQUFJLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFBQyxJQUFJLEVBQUMsTUFBTSxTQUFTLENBQUM7QUFDN0IsT0FBTyxFQUFDLE1BQU0sRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNqQyxPQUFPLEVBQUMsVUFBVSxFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDMUMsT0FBTyxFQUFDLEVBQUUsRUFBQyxNQUFNLGNBQWMsQ0FBQztBQUNoQyxPQUFPLEVBQUMsUUFBUSxFQUFDLE1BQU0sYUFBYSxDQUFDO0FBRXJDOzs7Ozs7O0dBT0c7QUFDSCxTQUFTLGVBQWUsQ0FDVyxLQUFtQjtJQUNwRCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFM0MsSUFBSSxDQUFDLE1BQU0sQ0FDUCxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsRUFDaEIsR0FBRyxFQUFFLENBQUMsMkRBQTJEO1FBQzdELGdCQUFnQixNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUV4QyxJQUFJLENBQUMsTUFBTSxDQUNQLFFBQVEsS0FBSyxDQUFDLEVBQ2QsR0FBRyxFQUFFLENBQUMsMERBQTBEO1FBQzVELGtDQUFrQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO0lBRXZELDJEQUEyRDtJQUMzRCxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFFekMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBRXRELElBQUksU0FBUyxDQUFDO0lBQ2QsUUFBUSxNQUFNLENBQUMsSUFBSSxFQUFFO1FBQ25CLEtBQUssQ0FBQztZQUNKLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNwRCxNQUFNO1FBQ1IsS0FBSyxDQUFDO1lBQ0osU0FBUyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3RELE1BQU07UUFDUixLQUFLLENBQUM7WUFDSixTQUFTLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDeEQsTUFBTTtRQUNSLEtBQUssQ0FBQztZQUNKLFNBQVMsR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUMxRCxNQUFNO1FBQ1IsS0FBSyxDQUFDO1lBQ0osU0FBUyxHQUFHLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDNUQsTUFBTTtRQUNSO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0tBQy9DO0lBQ0QsU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV0QyxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFNLENBQUM7QUFDekMsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQUMsRUFBRSxDQUFDLEVBQUMsZUFBZSxFQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuaW1wb3J0IHtUZW5zb3IyRCwgVGVuc29yM0QsIFRlbnNvcjRELCBUZW5zb3I1RCwgVGVuc29yNkR9IGZyb20gJy4uLy4uL3RlbnNvcic7XG5pbXBvcnQge2NvbnZlcnRUb1RlbnNvcn0gZnJvbSAnLi4vLi4vdGVuc29yX3V0aWxfZW52JztcbmltcG9ydCB7VGVuc29yTGlrZX0gZnJvbSAnLi4vLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tICcuLi8uLi91dGlsJztcbmltcG9ydCB7Y2FzdH0gZnJvbSAnLi4vY2FzdCc7XG5pbXBvcnQge2VpbnN1bX0gZnJvbSAnLi4vZWluc3VtJztcbmltcG9ydCB7ZXhwYW5kRGltc30gZnJvbSAnLi4vZXhwYW5kX2RpbXMnO1xuaW1wb3J0IHtvcH0gZnJvbSAnLi4vb3BlcmF0aW9uJztcbmltcG9ydCB7dGVuc29yMWR9IGZyb20gJy4uL3RlbnNvcjFkJztcblxuLyoqXG4gKiBDb252ZXJ0cyBpbWFnZXMgZnJvbSBSR0IgZm9ybWF0IHRvIGdyYXlzY2FsZS5cbiAqXG4gKiBAcGFyYW0gaW1hZ2UgQSBSR0IgdGVuc29yIHRvIGNvbnZlcnQuIFRoZSBgaW1hZ2VgJ3MgbGFzdCBkaW1lbnNpb24gbXVzdFxuICogICAgIGJlIHNpemUgMyB3aXRoIGF0IGxlYXN0IGEgdHdvLWRpbWVuc2lvbmFsIHNoYXBlLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdPcGVyYXRpb25zJywgc3ViaGVhZGluZzogJ0ltYWdlcycsIG5hbWVzcGFjZTogJ2ltYWdlJ31cbiAqL1xuZnVuY3Rpb24gcmdiVG9HcmF5c2NhbGVfPFQgZXh0ZW5kcyBUZW5zb3IyRHxUZW5zb3IzRHxUZW5zb3I0RHxUZW5zb3I1RHxcbiAgICAgICAgICAgICAgICAgICAgICAgICBUZW5zb3I2RD4oaW1hZ2U6IFR8VGVuc29yTGlrZSk6IFQge1xuICBjb25zdCAkaW1hZ2UgPSBjb252ZXJ0VG9UZW5zb3IoaW1hZ2UsICdpbWFnZScsICdSR0JUb0dyYXlzY2FsZScpO1xuXG4gIGNvbnN0IGxhc3REaW1zSWR4ID0gJGltYWdlLnJhbmsgLSAxO1xuICBjb25zdCBsYXN0RGltcyA9ICRpbWFnZS5zaGFwZVtsYXN0RGltc0lkeF07XG5cbiAgdXRpbC5hc3NlcnQoXG4gICAgICAkaW1hZ2UucmFuayA+PSAyLFxuICAgICAgKCkgPT4gJ0Vycm9yIGluIFJHQlRvR3JheXNjYWxlOiBpbWFnZXMgbXVzdCBiZSBhdCBsZWFzdCByYW5rIDIsICcgK1xuICAgICAgICAgIGBidXQgZ290IHJhbmsgJHskaW1hZ2UucmFua30uYCk7XG5cbiAgdXRpbC5hc3NlcnQoXG4gICAgICBsYXN0RGltcyA9PT0gMyxcbiAgICAgICgpID0+ICdFcnJvciBpbiBSR0JUb0dyYXlzY2FsZTogbGFzdCBkaW1lbnNpb24gb2YgYW4gUkdCIGltYWdlICcgK1xuICAgICAgICAgIGBzaG91bGQgYmUgc2l6ZSAzLCBidXQgZ290IHNpemUgJHtsYXN0RGltc30uYCk7XG5cbiAgLy8gUmVtZW1iZXIgb3JpZ2luYWwgZHR5cGUgc28gd2UgY2FuIGNvbnZlcnQgYmFjayBpZiBuZWVkZWRcbiAgY29uc3Qgb3JpZ0R0eXBlID0gJGltYWdlLmR0eXBlO1xuICBjb25zdCBmbHRJbWFnZSA9IGNhc3QoJGltYWdlLCAnZmxvYXQzMicpO1xuXG4gIGNvbnN0IHJnYldlaWdodHMgPSB0ZW5zb3IxZChbMC4yOTg5LCAwLjU4NzAsIDAuMTE0MF0pO1xuXG4gIGxldCBncmF5RmxvYXQ7XG4gIHN3aXRjaCAoJGltYWdlLnJhbmspIHtcbiAgICBjYXNlIDI6XG4gICAgICBncmF5RmxvYXQgPSBlaW5zdW0oJ2lqLGotPmknLCBmbHRJbWFnZSwgcmdiV2VpZ2h0cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDM6XG4gICAgICBncmF5RmxvYXQgPSBlaW5zdW0oJ2lqayxrLT5paicsIGZsdEltYWdlLCByZ2JXZWlnaHRzKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgNDpcbiAgICAgIGdyYXlGbG9hdCA9IGVpbnN1bSgnaWprbCxsLT5pamsnLCBmbHRJbWFnZSwgcmdiV2VpZ2h0cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDU6XG4gICAgICBncmF5RmxvYXQgPSBlaW5zdW0oJ2lqa2xtLG0tPmlqa2wnLCBmbHRJbWFnZSwgcmdiV2VpZ2h0cyk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDY6XG4gICAgICBncmF5RmxvYXQgPSBlaW5zdW0oJ2lqa2xtbixuLT5pamtsbScsIGZsdEltYWdlLCByZ2JXZWlnaHRzKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vdCBhIHZhbGlkIHRlbnNvciByYW5rLicpO1xuICB9XG4gIGdyYXlGbG9hdCA9IGV4cGFuZERpbXMoZ3JheUZsb2F0LCAtMSk7XG5cbiAgcmV0dXJuIGNhc3QoZ3JheUZsb2F0LCBvcmlnRHR5cGUpIGFzIFQ7XG59XG5cbmV4cG9ydCBjb25zdCByZ2JUb0dyYXlzY2FsZSA9IC8qIEBfX1BVUkVfXyAqLyBvcCh7cmdiVG9HcmF5c2NhbGVffSk7XG4iXX0=