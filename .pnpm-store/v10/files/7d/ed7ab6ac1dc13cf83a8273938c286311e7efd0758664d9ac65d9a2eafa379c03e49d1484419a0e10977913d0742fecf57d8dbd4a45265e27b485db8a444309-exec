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
import { TensorBuffer, util } from '@tensorflow/tfjs-core';
export function uniqueImpl(values, axis, shape, dtype) {
    // Normalize and validate axis.
    const $axis = util.parseAxisParam(axis, shape)[0];
    // Calculate the new shape that is suitable for extracting data along the
    // given axis.
    //
    // The rank is 3.
    // The size of the 1st dimension is the size of all the axes < the given axis.
    // The size of the 2nd dimension is the same as the size of the given axis.
    // The size of the 3rd dimension is the size of all the axes > the given axis.
    //
    // For example, for a 4D tensor with shape=[2, 3, 5, 4] and axis=2, the
    // newShape would be: [2*3, 5, 4].
    //
    // Note that this is not the final output shape. This will be the shape for an
    // intermediate TensorBuffer (see inputBuffer below) to allow us to extract
    // values along the given axis. To demonstrate how it works, consider the
    // following example:
    //
    // Input: a 3D tensor, with shape [1, 2, 3]
    // [
    //   [
    //      [1,2,3],
    //      [4,5,6]
    //   ]
    // ]
    // Axis: 2 (the last axis).
    // Along axis 2, we expect to extract 3 tensors: [1,4], [2,5], [3,6].
    //
    // For this example, newShape would be: [2, 3, 1], where 2 is calculated from
    // 1*2. The re-shaped data would look like:
    //
    // [
    //   [
    //     [1], [2], [3]
    //   ],
    //   [
    //     [4], [5], [6]
    //   ]
    // ]
    //
    // Then, we can construct a 3-level nested loop by the following dimension
    // order to extract the values along the axis (dimension1):
    // i: dimension1       // 0,1,2 (newShape[1])
    //   m: dimension0     // 0,1   (newShape[0])
    //     n: dimension2   // 0     (newShape[2])
    //
    //                       m, i, n
    //                      ---------
    // Iteration 0: data at [0, 0, 0] => "1"
    // Iteration 1: data at [1, 0, 0] => "4"
    // We got [1,4].
    // Iteration 2: data at [0, 1, 0] => "2"
    // Iteration 3: data at [1, 1, 0] => "5"
    // We got [2,5].
    // Iteration 4: data at [0, 2, 0] => "3"
    // Iteration 5: data at [1, 2, 0] => "6"
    // We got [3,6].
    const newShape = [1, shape[0], 1];
    for (let i = 0; i < $axis; i++) {
        newShape[0] *= shape[i];
    }
    newShape[1] = shape[$axis];
    for (let i = $axis + 1; i < shape.length; i++) {
        newShape[2] *= shape[i];
    }
    // A map from unique elements (their string representations) to their values
    // in "indices" (below).
    const uniqueElements = new Map();
    // The indices of each unique element in the original tensor along the given
    // axis. It is 1D and has the same size as the given axis.
    const indices = new Int32Array(shape[$axis]);
    // Create a buffer so we can easily extract value at a given location.
    const inputBuffer = new TensorBuffer(newShape, dtype, values);
    // The indices along the given axis that have unique elements. This is a
    // de-duped version of "indices" above.
    const uniqueIndices = [];
    const is1DTensor = newShape[0] === 1 && newShape[2] === 1;
    for (let i = 0; i < shape[$axis]; i++) {
        // Extract values along the axis.
        let element;
        if (is1DTensor) {
            // Fast path for 1D tensor input.
            element = values[i].toString();
        }
        else {
            const axisValues = [];
            for (let m = 0; m < newShape[0]; m++) {
                for (let n = 0; n < newShape[2]; n++) {
                    axisValues.push(inputBuffer.get(m, i, n));
                }
            }
            element = axisValues.join(',');
        }
        // Dedup and update various indices.
        const existingIndex = uniqueElements.get(element);
        if (existingIndex != null) {
            indices[i] = existingIndex;
        }
        else {
            const uniqueIndex = uniqueElements.size;
            uniqueElements.set(element, uniqueIndex);
            indices[i] = uniqueIndex;
            uniqueIndices.push(i);
        }
    }
    // Now we know where each of the unique elements are located along the axis
    // (uniqueIndices). Extract them from input buffer and store them in the
    // output buffer.
    const outputTmpShape = newShape.slice();
    outputTmpShape[1] = uniqueElements.size;
    const outputBuffer = new TensorBuffer(outputTmpShape, dtype);
    uniqueIndices.forEach((uniqueElementIndex, i) => {
        for (let m = 0; m < newShape[0]; m++) {
            for (let n = 0; n < newShape[2]; n++) {
                outputBuffer.set(inputBuffer.get(m, uniqueElementIndex, n), m, i, n);
            }
        }
    });
    // The output shape can be calculated from the input shape with the size of
    // the given axis replaced by the number of unique elements along that axis.
    const outputShape = shape.slice();
    outputShape[$axis] = outputTmpShape[1];
    return {
        outputValues: outputBuffer.values,
        outputShape,
        indices,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVW5pcXVlX2ltcGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWJhY2tlbmQtY3B1L3NyYy9rZXJuZWxzL1VuaXF1ZV9pbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUVILE9BQU8sRUFBMEIsWUFBWSxFQUFjLElBQUksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBRTlGLE1BQU0sVUFBVSxVQUFVLENBQ3RCLE1BQXFCLEVBQUUsSUFBWSxFQUFFLEtBQWUsRUFBRSxLQUFlO0lBS3ZFLCtCQUErQjtJQUMvQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVsRCx5RUFBeUU7SUFDekUsY0FBYztJQUNkLEVBQUU7SUFDRixpQkFBaUI7SUFDakIsOEVBQThFO0lBQzlFLDJFQUEyRTtJQUMzRSw4RUFBOEU7SUFDOUUsRUFBRTtJQUNGLHVFQUF1RTtJQUN2RSxrQ0FBa0M7SUFDbEMsRUFBRTtJQUNGLDhFQUE4RTtJQUM5RSwyRUFBMkU7SUFDM0UseUVBQXlFO0lBQ3pFLHFCQUFxQjtJQUNyQixFQUFFO0lBQ0YsMkNBQTJDO0lBQzNDLElBQUk7SUFDSixNQUFNO0lBQ04sZ0JBQWdCO0lBQ2hCLGVBQWU7SUFDZixNQUFNO0lBQ04sSUFBSTtJQUNKLDJCQUEyQjtJQUMzQixxRUFBcUU7SUFDckUsRUFBRTtJQUNGLDZFQUE2RTtJQUM3RSwyQ0FBMkM7SUFDM0MsRUFBRTtJQUNGLElBQUk7SUFDSixNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLE9BQU87SUFDUCxNQUFNO0lBQ04sb0JBQW9CO0lBQ3BCLE1BQU07SUFDTixJQUFJO0lBQ0osRUFBRTtJQUNGLDBFQUEwRTtJQUMxRSwyREFBMkQ7SUFDM0QsNkNBQTZDO0lBQzdDLDZDQUE2QztJQUM3Qyw2Q0FBNkM7SUFDN0MsRUFBRTtJ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MjAyMCBHb29nbGUgTExDLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbmltcG9ydCB7QmFja2VuZFZhbHVlcywgRGF0YVR5cGUsIFRlbnNvckJ1ZmZlciwgVHlwZWRBcnJheSwgdXRpbH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuZXhwb3J0IGZ1bmN0aW9uIHVuaXF1ZUltcGwoXG4gICAgdmFsdWVzOiBCYWNrZW5kVmFsdWVzLCBheGlzOiBudW1iZXIsIHNoYXBlOiBudW1iZXJbXSwgZHR5cGU6IERhdGFUeXBlKToge1xuICBvdXRwdXRWYWx1ZXM6IEJhY2tlbmRWYWx1ZXMsXG4gIG91dHB1dFNoYXBlOiBudW1iZXJbXSxcbiAgaW5kaWNlczogQmFja2VuZFZhbHVlc1xufSB7XG4gIC8vIE5vcm1hbGl6ZSBhbmQgdmFsaWRhdGUgYXhpcy5cbiAgY29uc3QgJGF4aXMgPSB1dGlsLnBhcnNlQXhpc1BhcmFtKGF4aXMsIHNoYXBlKVswXTtcblxuICAvLyBDYWxjdWxhdGUgdGhlIG5ldyBzaGFwZSB0aGF0IGlzIHN1aXRhYmxlIGZvciBleHRyYWN0aW5nIGRhdGEgYWxvbmcgdGhlXG4gIC8vIGdpdmVuIGF4aXMuXG4gIC8vXG4gIC8vIFRoZSByYW5rIGlzIDMuXG4gIC8vIFRoZSBzaXplIG9mIHRoZSAxc3QgZGltZW5zaW9uIGlzIHRoZSBzaXplIG9mIGFsbCB0aGUgYXhlcyA8IHRoZSBnaXZlbiBheGlzLlxuICAvLyBUaGUgc2l6ZSBvZiB0aGUgMm5kIGRpbWVuc2lvbiBpcyB0aGUgc2FtZSBhcyB0aGUgc2l6ZSBvZiB0aGUgZ2l2ZW4gYXhpcy5cbiAgLy8gVGhlIHNpemUgb2YgdGhlIDNyZCBkaW1lbnNpb24gaXMgdGhlIHNpemUgb2YgYWxsIHRoZSBheGVzID4gdGhlIGdpdmVuIGF4aXMuXG4gIC8vXG4gIC8vIEZvciBleGFtcGxlLCBmb3IgYSA0RCB0ZW5zb3Igd2l0aCBzaGFwZT1bMiwgMywgNSwgNF0gYW5kIGF4aXM9MiwgdGhlXG4gIC8vIG5ld1NoYXBlIHdvdWxkIGJlOiBbMiozLCA1LCA0XS5cbiAgLy9cbiAgLy8gTm90ZSB0aGF0IHRoaXMgaXMgbm90IHRoZSBmaW5hbCBvdXRwdXQgc2hhcGUuIFRoaXMgd2lsbCBiZSB0aGUgc2hhcGUgZm9yIGFuXG4gIC8vIGludGVybWVkaWF0ZSBUZW5zb3JCdWZmZXIgKHNlZSBpbnB1dEJ1ZmZlciBiZWxvdykgdG8gYWxsb3cgdXMgdG8gZXh0cmFjdFxuICAvLyB2YWx1ZXMgYWxvbmcgdGhlIGdpdmVuIGF4aXMuIFRvIGRlbW9uc3RyYXRlIGhvdyBpdCB3b3JrcywgY29uc2lkZXIgdGhlXG4gIC8vIGZvbGxvd2luZyBleGFtcGxlOlxuICAvL1xuICAvLyBJbnB1dDogYSAzRCB0ZW5zb3IsIHdpdGggc2hhcGUgWzEsIDIsIDNdXG4gIC8vIFtcbiAgLy8gICBbXG4gIC8vICAgICAgWzEsMiwzXSxcbiAgLy8gICAgICBbNCw1LDZdXG4gIC8vICAgXVxuICAvLyBdXG4gIC8vIEF4aXM6IDIgKHRoZSBsYXN0IGF4aXMpLlxuICAvLyBBbG9uZyBheGlzIDIsIHdlIGV4cGVjdCB0byBleHRyYWN0IDMgdGVuc29yczogWzEsNF0sIFsyLDVdLCBbMyw2XS5cbiAgLy9cbiAgLy8gRm9yIHRoaXMgZXhhbXBsZSwgbmV3U2hhcGUgd291bGQgYmU6IFsyLCAzLCAxXSwgd2hlcmUgMiBpcyBjYWxjdWxhdGVkIGZyb21cbiAgLy8gMSoyLiBUaGUgcmUtc2hhcGVkIGRhdGEgd291bGQgbG9vayBsaWtlOlxuICAvL1xuICAvLyBbXG4gIC8vICAgW1xuICAvLyAgICAgWzFdLCBbMl0sIFszXVxuICAvLyAgIF0sXG4gIC8vICAgW1xuICAvLyAgICAgWzRdLCBbNV0sIFs2XVxuICAvLyAgIF1cbiAgLy8gXVxuICAvL1xuICAvLyBUaGVuLCB3ZSBjYW4gY29uc3RydWN0IGEgMy1sZXZlbCBuZXN0ZWQgbG9vcCBieSB0aGUgZm9sbG93aW5nIGRpbWVuc2lvblxuICAvLyBvcmRlciB0byBleHRyYWN0IHRoZSB2YWx1ZXMgYWxvbmcgdGhlIGF4aXMgKGRpbWVuc2lvbjEpOlxuICAvLyBpOiBkaW1lbnNpb24xICAgICAgIC8vIDAsMSwyIChuZXdTaGFwZVsxXSlcbiAgLy8gICBtOiBkaW1lbnNpb24wICAgICAvLyAwLDEgICAobmV3U2hhcGVbMF0pXG4gIC8vICAgICBuOiBkaW1lbnNpb24yICAgLy8gMCAgICAgKG5ld1NoYXBlWzJdKVxuICAvL1xuICAvLyAgICAgICAgICAgICAgICAgICAgICAgbSwgaSwgblxuICAvLyAgICAgICAgICAgICAgICAgICAgICAtLS0tLS0tLS1cbiAgLy8gSXRlcmF0aW9uIDA6IGRhdGEgYXQgWzAsIDAsIDBdID0+IFwiMVwiXG4gIC8vIEl0ZXJhdGlvbiAxOiBkYXRhIGF0IFsxLCAwLCAwXSA9PiBcIjRcIlxuICAvLyBXZSBnb3QgWzEsNF0uXG4gIC8vIEl0ZXJhdGlvbiAyOiBkYXRhIGF0IFswLCAxLCAwXSA9PiBcIjJcIlxuICAvLyBJdGVyYXRpb24gMzogZGF0YSBhdCBbMSwgMSwgMF0gPT4gXCI1XCJcbiAgLy8gV2UgZ290IFsyLDVdLlxuICAvLyBJdGVyYXRpb24gNDogZGF0YSBhdCBbMCwgMiwgMF0gPT4gXCIzXCJcbiAgLy8gSXRlcmF0aW9uIDU6IGRhdGEgYXQgWzEsIDIsIDBdID0+IFwiNlwiXG4gIC8vIFdlIGdvdCBbMyw2XS5cbiAgY29uc3QgbmV3U2hhcGUgPSBbMSwgc2hhcGVbMF0sIDFdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8ICRheGlzOyBpKyspIHtcbiAgICBuZXdTaGFwZVswXSAqPSBzaGFwZVtpXTtcbiAgfVxuICBuZXdTaGFwZVsxXSA9IHNoYXBlWyRheGlzXTtcbiAgZm9yIChsZXQgaSA9ICRheGlzICsgMTsgaSA8IHNoYXBlLmxlbmd0aDsgaSsrKSB7XG4gICAgbmV3U2hhcGVbMl0gKj0gc2hhcGVbaV07XG4gIH1cblxuICAvLyBBIG1hcCBmcm9tIHVuaXF1ZSBlbGVtZW50cyAodGhlaXIgc3RyaW5nIHJlcHJlc2VudGF0aW9ucykgdG8gdGhlaXIgdmFsdWVzXG4gIC8vIGluIFwiaW5kaWNlc1wiIChiZWxvdykuXG4gIGNvbnN0IHVuaXF1ZUVsZW1lbnRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgLy8gVGhlIGluZGljZXMgb2YgZWFjaCB1bmlxdWUgZWxlbWVudCBpbiB0aGUgb3JpZ2luYWwgdGVuc29yIGFsb25nIHRoZSBnaXZlblxuICAvLyBheGlzLiBJdCBpcyAxRCBhbmQgaGFzIHRoZSBzYW1lIHNpemUgYXMgdGhlIGdpdmVuIGF4aXMuXG4gIGNvbnN0IGluZGljZXMgPSBuZXcgSW50MzJBcnJheShzaGFwZVskYXhpc10pO1xuICAvLyBDcmVhdGUgYSBidWZmZXIgc28gd2UgY2FuIGVhc2lseSBleHRyYWN0IHZhbHVlIGF0IGEgZ2l2ZW4gbG9jYXRpb24uXG4gIGNvbnN0IGlucHV0QnVmZmVyID0gbmV3IFRlbnNvckJ1ZmZlcihuZXdTaGFwZSwgZHR5cGUsIHZhbHVlcyBhcyBUeXBlZEFycmF5KTtcbiAgLy8gVGhlIGluZGljZXMgYWxvbmcgdGhlIGdpdmVuIGF4aXMgdGhhdCBoYXZlIHVuaXF1ZSBlbGVtZW50cy4gVGhpcyBpcyBhXG4gIC8vIGRlLWR1cGVkIHZlcnNpb24gb2YgXCJpbmRpY2VzXCIgYWJvdmUuXG4gIGNvbnN0IHVuaXF1ZUluZGljZXM6IG51bWJlcltdID0gW107XG4gIGNvbnN0IGlzMURUZW5zb3IgPSBuZXdTaGFwZVswXSA9PT0gMSAmJiBuZXdTaGFwZVsyXSA9PT0gMTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaGFwZVskYXhpc107IGkrKykge1xuICAgIC8vIEV4dHJhY3QgdmFsdWVzIGFsb25nIHRoZSBheGlzLlxuICAgIGxldCBlbGVtZW50OiBzdHJpbmc7XG4gICAgaWYgKGlzMURUZW5zb3IpIHtcbiAgICAgIC8vIEZhc3QgcGF0aCBmb3IgMUQgdGVuc29yIGlucHV0LlxuICAgICAgZWxlbWVudCA9IHZhbHVlc1tpXS50b1N0cmluZygpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBheGlzVmFsdWVzID0gW107XG4gICAgICBmb3IgKGxldCBtID0gMDsgbSA8IG5ld1NoYXBlWzBdOyBtKyspIHtcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBuZXdTaGFwZVsyXTsgbisrKSB7XG4gICAgICAgICAgYXhpc1ZhbHVlcy5wdXNoKGlucHV0QnVmZmVyLmdldChtLCBpLCBuKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGVsZW1lbnQgPSBheGlzVmFsdWVzLmpvaW4oJywnKTtcbiAgICB9XG5cbiAgICAvLyBEZWR1cCBhbmQgdXBkYXRlIHZhcmlvdXMgaW5kaWNlcy5cbiAgICBjb25zdCBleGlzdGluZ0luZGV4ID0gdW5pcXVlRWxlbWVudHMuZ2V0KGVsZW1lbnQpO1xuICAgIGlmIChleGlzdGluZ0luZGV4ICE9IG51bGwpIHtcbiAgICAgIGluZGljZXNbaV0gPSBleGlzdGluZ0luZGV4O1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB1bmlxdWVJbmRleCA9IHVuaXF1ZUVsZW1lbnRzLnNpemU7XG4gICAgICB1bmlxdWVFbGVtZW50cy5zZXQoZWxlbWVudCwgdW5pcXVlSW5kZXgpO1xuICAgICAgaW5kaWNlc1tpXSA9IHVuaXF1ZUluZGV4O1xuICAgICAgdW5pcXVlSW5kaWNlcy5wdXNoKGkpO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vdyB3ZSBrbm93IHdoZXJlIGVhY2ggb2YgdGhlIHVuaXF1ZSBlbGVtZW50cyBhcmUgbG9jYXRlZCBhbG9uZyB0aGUgYXhpc1xuICAvLyAodW5pcXVlSW5kaWNlcykuIEV4dHJhY3QgdGhlbSBmcm9tIGlucHV0IGJ1ZmZlciBhbmQgc3RvcmUgdGhlbSBpbiB0aGVcbiAgLy8gb3V0cHV0IGJ1ZmZlci5cbiAgY29uc3Qgb3V0cHV0VG1wU2hhcGUgPSBuZXdTaGFwZS5zbGljZSgpO1xuICBvdXRwdXRUbXBTaGFwZVsxXSA9IHVuaXF1ZUVsZW1lbnRzLnNpemU7XG4gIGNvbnN0IG91dHB1dEJ1ZmZlciA9IG5ldyBUZW5zb3JCdWZmZXIob3V0cHV0VG1wU2hhcGUsIGR0eXBlKTtcbiAgdW5pcXVlSW5kaWNlcy5mb3JFYWNoKCh1bmlxdWVFbGVtZW50SW5kZXgsIGkpID0+IHtcbiAgICBmb3IgKGxldCBtID0gMDsgbSA8IG5ld1NoYXBlWzBdOyBtKyspIHtcbiAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbmV3U2hhcGVbMl07IG4rKykge1xuICAgICAgICBvdXRwdXRCdWZmZXIuc2V0KGlucHV0QnVmZmVyLmdldChtLCB1bmlxdWVFbGVtZW50SW5kZXgsIG4pLCBtLCBpLCBuKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vIFRoZSBvdXRwdXQgc2hhcGUgY2FuIGJlIGNhbGN1bGF0ZWQgZnJvbSB0aGUgaW5wdXQgc2hhcGUgd2l0aCB0aGUgc2l6ZSBvZlxuICAvLyB0aGUgZ2l2ZW4gYXhpcyByZXBsYWNlZCBieSB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBlbGVtZW50cyBhbG9uZyB0aGF0IGF4aXMuXG4gIGNvbnN0IG91dHB1dFNoYXBlID0gc2hhcGUuc2xpY2UoKTtcbiAgb3V0cHV0U2hhcGVbJGF4aXNdID0gb3V0cHV0VG1wU2hhcGVbMV07XG5cbiAgcmV0dXJuIHtcbiAgICBvdXRwdXRWYWx1ZXM6IG91dHB1dEJ1ZmZlci52YWx1ZXMgYXMgQmFja2VuZFZhbHVlcyxcbiAgICBvdXRwdXRTaGFwZSxcbiAgICBpbmRpY2VzLFxuICB9O1xufVxuIl19