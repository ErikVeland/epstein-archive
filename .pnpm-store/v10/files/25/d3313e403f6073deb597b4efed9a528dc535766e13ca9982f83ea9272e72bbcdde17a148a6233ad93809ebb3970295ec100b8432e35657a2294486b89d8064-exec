/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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
import { isWebGLData, isWebGPUData } from '../types';
import { assert, assertNonNegativeIntegerDimensions, flatten, inferDtype, isTypedArray, sizeFromShape, toTypedArray } from '../util';
/** This is shared code across all tensor creation methods. */
export function makeTensor(values, shape, inferredShape, dtype) {
    if (dtype == null) {
        dtype = inferDtype(values);
    }
    else if (dtype === 'complex64') {
        throw new Error(`Cannot construct a complex64 tensor directly. ` +
            `Please use tf.complex(real, imag).`);
    }
    if (isWebGPUData(values) || isWebGLData(values)) {
        if (dtype !== 'float32' && dtype !== 'int32') {
            throw new Error(`Creating tensor from GPU data only supports ` +
                `'float32'|'int32' dtype, while the dtype is ${dtype}.`);
        }
        return ENGINE.backend.createTensorFromGPUData(values, shape || inferredShape, dtype);
    }
    if (!isTypedArray(values) && !Array.isArray(values) &&
        typeof values !== 'number' && typeof values !== 'boolean' &&
        typeof values !== 'string') {
        throw new Error('values passed to tensor(values) must be a number/boolean/string or ' +
            'an array of numbers/booleans/strings, or a TypedArray');
    }
    // Verify that the shape matches the inferred shape.
    if (shape != null) {
        assertNonNegativeIntegerDimensions(shape);
        const providedSize = sizeFromShape(shape);
        const inferredSize = sizeFromShape(inferredShape);
        assert(providedSize === inferredSize, () => `Based on the provided shape, [${shape}], the tensor should have ` +
            `${providedSize} values but has ${inferredSize}`);
        for (let i = 0; i < inferredShape.length; ++i) {
            const inferred = inferredShape[i];
            const flatDimsDontMatch = i === inferredShape.length - 1 ?
                inferred !== sizeFromShape(shape.slice(i)) :
                true;
            assert(inferredShape[i] === shape[i] || !flatDimsDontMatch, () => `Error creating a new Tensor. Inferred shape ` +
                `(${inferredShape}) does not match the provided ` +
                `shape (${shape}). `);
        }
    }
    if (!isTypedArray(values) && !Array.isArray(values)) {
        values = [values];
    }
    shape = shape || inferredShape;
    values = dtype !== 'string' ?
        toTypedArray(values, dtype) :
        flatten(values, [], true);
    return ENGINE.makeTensor(values, shape, dtype);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuc29yX29wc191dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy9vcHMvdGVuc29yX29wc191dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sRUFBQyxNQUFNLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFakMsT0FBTyxFQUFDLFdBQVcsRUFBRSxZQUFZLEVBQWdELE1BQU0sVUFBVSxDQUFDO0FBRWxHLE9BQU8sRUFBQyxNQUFNLEVBQUUsa0NBQWtDLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBQyxNQUFNLFNBQVMsQ0FBQztBQUVuSSw4REFBOEQ7QUFDOUQsTUFBTSxVQUFVLFVBQVUsQ0FDdEIsTUFBdUMsRUFBRSxLQUFlLEVBQ3hELGFBQXVCLEVBQUUsS0FBZ0I7SUFDM0MsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1FBQ2pCLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDNUI7U0FBTSxJQUFJLEtBQUssS0FBSyxXQUFXLEVBQUU7UUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FDWCxnREFBZ0Q7WUFDaEQsb0NBQW9DLENBQUMsQ0FBQztLQUMzQztJQUVELElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUMvQyxJQUFJLEtBQUssS0FBSyxTQUFTLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRTtZQUM1QyxNQUFNLElBQUksS0FBSyxDQUNYLDhDQUE4QztnQkFDOUMsK0NBQStDLEtBQUssR0FBRyxDQUFDLENBQUM7U0FDOUQ7UUFDRCxPQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQ3pDLE1BQU0sRUFBRSxLQUFLLElBQUksYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzVDO0lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQy9DLE9BQU8sTUFBTSxLQUFLLFFBQVEsSUFBSSxPQUFPLE1BQU0sS0FBSyxTQUFTO1FBQ3pELE9BQU8sTUFBTSxLQUFLLFFBQVEsRUFBRTtRQUM5QixNQUFNLElBQUksS0FBSyxDQUNYLHFFQUFxRTtZQUNyRSx1REFBdUQsQ0FBQyxDQUFDO0tBQzlEO0lBQ0Qsb0RBQW9EO0lBQ3BELElBQUksS0FBSyxJQUFJLElBQUksRUFBRTtRQUNqQixrQ0FBa0MsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUUxQyxNQUFNLFlBQVksR0FBRyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUMsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELE1BQU0sQ0FDRixZQUFZLEtBQUssWUFBWSxFQUM3QixHQUFHLEVBQUUsQ0FDRCxpQ0FBaUMsS0FBSyw0QkFBNEI7WUFDbEUsR0FBRyxZQUFZLG1CQUFtQixZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRTFELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQzdDLE1BQU0sUUFBUSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQyxNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBSyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxRQUFRLEtBQUssYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLENBQUM7WUFDVCxNQUFNLENBQ0YsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUNuRCxHQUFHLEVBQUUsQ0FBQyw4Q0FBOEM7Z0JBQ2hELElBQUksYUFBYSxnQ0FBZ0M7Z0JBQ2pELFVBQVUsS0FBSyxLQUFLLENBQUMsQ0FBQztTQUMvQjtLQUNGO0lBRUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDbkQsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFhLENBQUM7S0FDL0I7SUFFRCxLQUFLLEdBQUcsS0FBSyxJQUFJLGFBQWEsQ0FBQztJQUMvQixNQUFNLEdBQUcsS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLFlBQVksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM3QixPQUFPLENBQUMsTUFBa0IsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFhLENBQUM7SUFDdEQsT0FBTyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQW9CLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQy9ELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7RU5HSU5FfSBmcm9tICcuLi9lbmdpbmUnO1xuaW1wb3J0IHtUZW5zb3J9IGZyb20gJy4uL3RlbnNvcic7XG5pbXBvcnQge2lzV2ViR0xEYXRhLCBpc1dlYkdQVURhdGEsIFRlbnNvckxpa2UsIFR5cGVkQXJyYXksIFdlYkdMRGF0YSwgV2ViR1BVRGF0YX0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHtEYXRhVHlwZX0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHthc3NlcnQsIGFzc2VydE5vbk5lZ2F0aXZlSW50ZWdlckRpbWVuc2lvbnMsIGZsYXR0ZW4sIGluZmVyRHR5cGUsIGlzVHlwZWRBcnJheSwgc2l6ZUZyb21TaGFwZSwgdG9UeXBlZEFycmF5fSBmcm9tICcuLi91dGlsJztcblxuLyoqIFRoaXMgaXMgc2hhcmVkIGNvZGUgYWNyb3NzIGFsbCB0ZW5zb3IgY3JlYXRpb24gbWV0aG9kcy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYWtlVGVuc29yKFxuICAgIHZhbHVlczogVGVuc29yTGlrZXxXZWJHTERhdGF8V2ViR1BVRGF0YSwgc2hhcGU6IG51bWJlcltdLFxuICAgIGluZmVycmVkU2hhcGU6IG51bWJlcltdLCBkdHlwZT86IERhdGFUeXBlKTogVGVuc29yIHtcbiAgaWYgKGR0eXBlID09IG51bGwpIHtcbiAgICBkdHlwZSA9IGluZmVyRHR5cGUodmFsdWVzKTtcbiAgfSBlbHNlIGlmIChkdHlwZSA9PT0gJ2NvbXBsZXg2NCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY29uc3RydWN0IGEgY29tcGxleDY0IHRlbnNvciBkaXJlY3RseS4gYCArXG4gICAgICAgIGBQbGVhc2UgdXNlIHRmLmNvbXBsZXgocmVhbCwgaW1hZykuYCk7XG4gIH1cblxuICBpZiAoaXNXZWJHUFVEYXRhKHZhbHVlcykgfHwgaXNXZWJHTERhdGEodmFsdWVzKSkge1xuICAgIGlmIChkdHlwZSAhPT0gJ2Zsb2F0MzInICYmIGR0eXBlICE9PSAnaW50MzInKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYENyZWF0aW5nIHRlbnNvciBmcm9tIEdQVSBkYXRhIG9ubHkgc3VwcG9ydHMgYCArXG4gICAgICAgICAgYCdmbG9hdDMyJ3wnaW50MzInIGR0eXBlLCB3aGlsZSB0aGUgZHR5cGUgaXMgJHtkdHlwZX0uYCk7XG4gICAgfVxuICAgIHJldHVybiBFTkdJTkUuYmFja2VuZC5jcmVhdGVUZW5zb3JGcm9tR1BVRGF0YShcbiAgICAgICAgdmFsdWVzLCBzaGFwZSB8fCBpbmZlcnJlZFNoYXBlLCBkdHlwZSk7XG4gIH1cblxuICBpZiAoIWlzVHlwZWRBcnJheSh2YWx1ZXMpICYmICFBcnJheS5pc0FycmF5KHZhbHVlcykgJiZcbiAgICAgIHR5cGVvZiB2YWx1ZXMgIT09ICdudW1iZXInICYmIHR5cGVvZiB2YWx1ZXMgIT09ICdib29sZWFuJyAmJlxuICAgICAgdHlwZW9mIHZhbHVlcyAhPT0gJ3N0cmluZycpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICd2YWx1ZXMgcGFzc2VkIHRvIHRlbnNvcih2YWx1ZXMpIG11c3QgYmUgYSBudW1iZXIvYm9vbGVhbi9zdHJpbmcgb3IgJyArXG4gICAgICAgICdhbiBhcnJheSBvZiBudW1iZXJzL2Jvb2xlYW5zL3N0cmluZ3MsIG9yIGEgVHlwZWRBcnJheScpO1xuICB9XG4gIC8vIFZlcmlmeSB0aGF0IHRoZSBzaGFwZSBtYXRjaGVzIHRoZSBpbmZlcnJlZCBzaGFwZS5cbiAgaWYgKHNoYXBlICE9IG51bGwpIHtcbiAgICBhc3NlcnROb25OZWdhdGl2ZUludGVnZXJEaW1lbnNpb25zKHNoYXBlKTtcblxuICAgIGNvbnN0IHByb3ZpZGVkU2l6ZSA9IHNpemVGcm9tU2hhcGUoc2hhcGUpO1xuICAgIGNvbnN0IGluZmVycmVkU2l6ZSA9IHNpemVGcm9tU2hhcGUoaW5mZXJyZWRTaGFwZSk7XG4gICAgYXNzZXJ0KFxuICAgICAgICBwcm92aWRlZFNpemUgPT09IGluZmVycmVkU2l6ZSxcbiAgICAgICAgKCkgPT5cbiAgICAgICAgICAgIGBCYXNlZCBvbiB0aGUgcHJvdmlkZWQgc2hhcGUsIFske3NoYXBlfV0sIHRoZSB0ZW5zb3Igc2hvdWxkIGhhdmUgYCArXG4gICAgICAgICAgICBgJHtwcm92aWRlZFNpemV9IHZhbHVlcyBidXQgaGFzICR7aW5mZXJyZWRTaXplfWApO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmZlcnJlZFNoYXBlLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBpbmZlcnJlZCA9IGluZmVycmVkU2hhcGVbaV07XG4gICAgICBjb25zdCBmbGF0RGltc0RvbnRNYXRjaCA9IGkgPT09IGluZmVycmVkU2hhcGUubGVuZ3RoIC0gMSA/XG4gICAgICAgICAgaW5mZXJyZWQgIT09IHNpemVGcm9tU2hhcGUoc2hhcGUuc2xpY2UoaSkpIDpcbiAgICAgICAgICB0cnVlO1xuICAgICAgYXNzZXJ0KFxuICAgICAgICAgIGluZmVycmVkU2hhcGVbaV0gPT09IHNoYXBlW2ldIHx8ICFmbGF0RGltc0RvbnRNYXRjaCxcbiAgICAgICAgICAoKSA9PiBgRXJyb3IgY3JlYXRpbmcgYSBuZXcgVGVuc29yLiBJbmZlcnJlZCBzaGFwZSBgICtcbiAgICAgICAgICAgICAgYCgke2luZmVycmVkU2hhcGV9KSBkb2VzIG5vdCBtYXRjaCB0aGUgcHJvdmlkZWQgYCArXG4gICAgICAgICAgICAgIGBzaGFwZSAoJHtzaGFwZX0pLiBgKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWlzVHlwZWRBcnJheSh2YWx1ZXMpICYmICFBcnJheS5pc0FycmF5KHZhbHVlcykpIHtcbiAgICB2YWx1ZXMgPSBbdmFsdWVzXSBhcyBudW1iZXJbXTtcbiAgfVxuXG4gIHNoYXBlID0gc2hhcGUgfHwgaW5mZXJyZWRTaGFwZTtcbiAgdmFsdWVzID0gZHR5cGUgIT09ICdzdHJpbmcnID9cbiAgICAgIHRvVHlwZWRBcnJheSh2YWx1ZXMsIGR0eXBlKSA6XG4gICAgICBmbGF0dGVuKHZhbHVlcyBhcyBzdHJpbmdbXSwgW10sIHRydWUpIGFzIHN0cmluZ1tdO1xuICByZXR1cm4gRU5HSU5FLm1ha2VUZW5zb3IodmFsdWVzIGFzIFR5cGVkQXJyYXksIHNoYXBlLCBkdHlwZSk7XG59XG4iXX0=