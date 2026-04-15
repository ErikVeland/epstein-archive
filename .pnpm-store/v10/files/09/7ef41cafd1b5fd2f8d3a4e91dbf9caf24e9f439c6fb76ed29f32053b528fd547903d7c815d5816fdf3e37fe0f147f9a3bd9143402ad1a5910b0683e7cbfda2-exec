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
import { concat, keep, reshape, scalar, slice, stack, tensor, tidy, unstack } from '@tensorflow/tfjs-core';
import { assertShapesMatchAllowUndefinedSize, inferElementShape, mergeElementShape } from './tensor_utils';
/**
 * TensorList stores a container of `tf.Tensor` objects, which are accessible
 * via tensors field.
 *
 * In order to get a copy of the underlying list, use the copy method:
 * ```
 *    TensorList b = a.copy();
 *    b.tensors().pushBack(t);  // This does not modify a.tensors().
 * ```
 *
 * Note that this is not a deep copy: the memory locations of the underlying
 * tensors will still point to the same locations of the corresponding tensors
 * in the original.
 */
export class TensorList {
    get id() {
        return this.idTensor.id;
    }
    /**
     *
     * @param tensors list of tensors
     * @param elementShape shape of each tensor, this can be a single number (any
     * shape is allowed) or partial shape (dim = -1).
     * @param elementDtype data type of each tensor
     * @param maxNumElements The maximum allowed size of `tensors`. Defaults to -1
     *   meaning that the size of `tensors` is unbounded.
     */
    constructor(tensors, elementShape, elementDtype, maxNumElements = -1) {
        this.tensors = tensors;
        this.elementShape = elementShape;
        this.elementDtype = elementDtype;
        if (tensors != null) {
            tensors.forEach(tensor => {
                if (elementDtype !== tensor.dtype) {
                    throw new Error(`Invalid data types; op elements ${elementDtype}, but list elements ${tensor.dtype}`);
                }
                assertShapesMatchAllowUndefinedSize(elementShape, tensor.shape, 'TensorList shape mismatch: ');
                keep(tensor);
            });
        }
        this.idTensor = scalar(0);
        this.maxNumElements = maxNumElements;
        keep(this.idTensor);
    }
    /**
     * Get a new TensorList containing a copy of the underlying tensor container.
     */
    copy() {
        return new TensorList([...this.tensors], this.elementShape, this.elementDtype);
    }
    /**
     * Dispose the tensors and idTensor and clear the tensor list.
     */
    clearAndClose(keepIds) {
        this.tensors.forEach(tensor => {
            if (keepIds == null || !keepIds.has(tensor.id)) {
                tensor.dispose();
            }
        });
        this.tensors.length = 0;
        this.idTensor.dispose();
    }
    /**
     * The size of the tensors in the tensor list.
     */
    size() {
        return this.tensors.length;
    }
    /**
     * Return a tensor that stacks a list of rank-R tf.Tensors into one rank-(R+1)
     * tf.Tensor.
     * @param elementShape shape of each tensor
     * @param elementDtype data type of each tensor
     * @param numElements the number of elements to stack
     */
    stack(elementShape, elementDtype, numElements = -1) {
        if (elementDtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${elementDtype}, but list elements ${this.elementDtype}`);
        }
        if (numElements !== -1 && this.tensors.length !== numElements) {
            throw new Error(`Operation expected a list with ${numElements} elements but got a list with ${this.tensors.length} elements.`);
        }
        assertShapesMatchAllowUndefinedSize(elementShape, this.elementShape, 'TensorList shape mismatch: ');
        const outputElementShape = inferElementShape(this.elementShape, this.tensors, elementShape);
        return tidy(() => {
            const reshapedTensors = this.tensors.map(tensor => reshape(tensor, outputElementShape));
            return stack(reshapedTensors, 0);
        });
    }
    /**
     * Pop a tensor from the end of the list.
     * @param elementShape shape of the tensor
     * @param elementDtype data type of the tensor
     */
    popBack(elementShape, elementDtype) {
        if (elementDtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${elementDtype}, but list elements ${this.elementDtype}`);
        }
        if (this.size() === 0) {
            throw new Error('Trying to pop from an empty list.');
        }
        const outputElementShape = inferElementShape(this.elementShape, this.tensors, elementShape);
        const tensor = this.tensors.pop();
        tensor.kept = false;
        assertShapesMatchAllowUndefinedSize(tensor.shape, elementShape, 'TensorList shape mismatch: ');
        return reshape(tensor, outputElementShape);
    }
    /**
     * Push a tensor to the end of the list.
     * @param tensor Tensor to be pushed.
     */
    pushBack(tensor) {
        if (tensor.dtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${tensor.dtype}, but list elements ${this.elementDtype}`);
        }
        assertShapesMatchAllowUndefinedSize(tensor.shape, this.elementShape, 'TensorList shape mismatch: ');
        if (this.maxNumElements === this.size()) {
            throw new Error(`Trying to push element into a full list.`);
        }
        keep(tensor);
        this.tensors.push(tensor);
    }
    /**
     * Update the size of the list.
     * @param size the new size of the list.
     */
    resize(size) {
        if (size < 0) {
            throw new Error(`TensorListResize expects size to be non-negative. Got: ${size}`);
        }
        if (this.maxNumElements !== -1 && size > this.maxNumElements) {
            throw new Error(`TensorListResize input size ${size} is greater maxNumElement ${this.maxNumElements}.`);
        }
        const destTensorList = new TensorList([], this.elementShape, this.elementDtype, this.maxNumElements);
        destTensorList.tensors.length = size;
        for (let i = 0; i < Math.min(this.tensors.length, size); ++i) {
            destTensorList.tensors[i] = this.tensors[i];
        }
        return destTensorList;
    }
    /**
     * Retrieve the element at the provided index
     * @param elementShape shape of the tensor
     * @param elementDtype dtype of the tensor
     * @param elementIndex index of the tensor
     */
    getItem(elementIndex, elementShape, elementDtype) {
        if (elementDtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${elementDtype}, but list elements ${this.elementDtype}`);
        }
        if (elementIndex < 0 || elementIndex > this.tensors.length) {
            throw new Error(`Trying to access element ${elementIndex} in a list with ${this.tensors.length} elements.`);
        }
        if (this.tensors[elementIndex] == null) {
            throw new Error(`element at index ${elementIndex} is null.`);
        }
        assertShapesMatchAllowUndefinedSize(this.tensors[elementIndex].shape, elementShape, 'TensorList shape mismatch: ');
        const outputElementShape = inferElementShape(this.elementShape, this.tensors, elementShape);
        return reshape(this.tensors[elementIndex], outputElementShape);
    }
    /**
     * Set the tensor at the index
     * @param elementIndex index of the tensor
     * @param tensor the tensor to be inserted into the list
     */
    setItem(elementIndex, tensor) {
        if (tensor.dtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${tensor.dtype}, but list elements ${this.elementDtype}`);
        }
        if (elementIndex < 0 ||
            this.maxNumElements !== -1 && elementIndex >= this.maxNumElements) {
            throw new Error(`Trying to set element ${elementIndex} in a list with max ${this.maxNumElements} elements.`);
        }
        assertShapesMatchAllowUndefinedSize(this.elementShape, tensor.shape, 'TensorList shape mismatch: ');
        keep(tensor);
        // dispose the previous value if it is replacing.
        if (this.tensors[elementIndex] != null) {
            this.tensors[elementIndex].kept = false;
        }
        this.tensors[elementIndex] = tensor;
    }
    /**
     * Return selected values in the TensorList as a stacked Tensor. All of
     * selected values must have been written and their shapes must all match.
     * @param indices indices of tensors to gather
     * @param elementDtype output tensor dtype
     * @param elementShape output tensor element shape
     */
    gather(indices, elementDtype, elementShape) {
        if (elementDtype !== this.elementDtype) {
            throw new Error(`Invalid data types; op elements ${elementDtype}, but list elements ${this.elementDtype}`);
        }
        assertShapesMatchAllowUndefinedSize(this.elementShape, elementShape, 'TensorList shape mismatch: ');
        // When indices is greater than the size of the list, indices beyond the
        // size of the list are ignored.
        indices = indices.slice(0, this.size());
        const outputElementShape = inferElementShape(this.elementShape, this.tensors, elementShape);
        if (indices.length === 0) {
            return tensor([], [0].concat(outputElementShape));
        }
        return tidy(() => {
            const tensors = indices.map(i => reshape(this.tensors[i], outputElementShape));
            return stack(tensors, 0);
        });
    }
    /**
     * Return the values in the TensorList as a concatenated Tensor.
     * @param elementDtype output tensor dtype
     * @param elementShape output tensor element shape
     */
    concat(elementDtype, elementShape) {
        if (!!elementDtype && elementDtype !== this.elementDtype) {
            throw new Error(`TensorList dtype is ${this.elementDtype} but concat requested dtype ${elementDtype}`);
        }
        assertShapesMatchAllowUndefinedSize(this.elementShape, elementShape, 'TensorList shape mismatch: ');
        const outputElementShape = inferElementShape(this.elementShape, this.tensors, elementShape);
        if (this.size() === 0) {
            return tensor([], [0].concat(outputElementShape));
        }
        return tidy(() => {
            const tensors = this.tensors.map(t => reshape(t, outputElementShape));
            return concat(tensors, 0);
        });
    }
}
/**
 * Creates a TensorList which, when stacked, has the value of tensor.
 * @param tensor from tensor
 * @param elementShape output tensor element shape
 */
export function fromTensor(tensor, elementShape, elementDtype) {
    const dtype = tensor.dtype;
    if (tensor.shape.length < 1) {
        throw new Error(`Tensor must be at least a vector, but saw shape: ${tensor.shape}`);
    }
    if (tensor.dtype !== elementDtype) {
        throw new Error(`Invalid data types; op elements ${tensor.dtype}, but list elements ${elementDtype}`);
    }
    const tensorElementShape = tensor.shape.slice(1);
    assertShapesMatchAllowUndefinedSize(tensorElementShape, elementShape, 'TensorList shape mismatch: ');
    const tensorList = unstack(tensor);
    return new TensorList(tensorList, elementShape, dtype);
}
/**
 * Return a TensorList of the given size with empty elements.
 * @param elementShape the shape of the future elements of the list
 * @param elementDtype the desired type of elements in the list
 * @param numElements the number of elements to reserve
 * @param maxNumElements the maximum number of elements in th list
 */
export function reserve(elementShape, elementDtype, numElements, maxNumElements) {
    return new TensorList([], elementShape, elementDtype, maxNumElements);
}
/**
 * Put tensors at specific indices of a stacked tensor into a TensorList.
 * @param indices list of indices on how to scatter the tensor.
 * @param tensor input tensor.
 * @param elementShape the shape of the future elements of the list
 * @param numElements the number of elements to scatter
 */
export function scatter(tensor, indices, elementShape, numElements) {
    if (indices.length !== tensor.shape[0]) {
        throw new Error(`Expected len(indices) == tensor.shape[0], but saw: ${indices.length} vs. ${tensor.shape[0]}`);
    }
    const maxIndex = Math.max(...indices);
    if (numElements != null && numElements !== -1 && maxIndex >= numElements) {
        throw new Error(`Max index must be < array size (${maxIndex}  vs. ${numElements})`);
    }
    const list = new TensorList([], elementShape, tensor.dtype, numElements);
    const tensors = unstack(tensor, 0);
    indices.forEach((value, index) => {
        list.setItem(value, tensors[index]);
    });
    return list;
}
/**
 * Split the values of a Tensor into a TensorList.
 * @param length the lengths to use when splitting value along
 *    its first dimension.
 * @param tensor the tensor to split.
 * @param elementShape the shape of the future elements of the list
 */
export function split(tensor, length, elementShape) {
    let totalLength = 0;
    const cumulativeLengths = length.map(len => {
        totalLength += len;
        return totalLength;
    });
    if (totalLength !== tensor.shape[0]) {
        throw new Error(`Expected sum of lengths to be equal to
          tensor.shape[0], but sum of lengths is
        ${totalLength}, and tensor's shape is: ${tensor.shape}`);
    }
    const shapeWithoutFirstDim = tensor.shape.slice(1);
    const outputElementShape = mergeElementShape(shapeWithoutFirstDim, elementShape);
    const elementPerRow = totalLength === 0 ? 0 : tensor.size / totalLength;
    const tensors = tidy(() => {
        const tensors = [];
        tensor = reshape(tensor, [1, totalLength, elementPerRow]);
        for (let i = 0; i < length.length; ++i) {
            const previousLength = (i === 0) ? 0 : cumulativeLengths[i - 1];
            const indices = [0, previousLength, 0];
            const sizes = [1, length[i], elementPerRow];
            tensors[i] = reshape(slice(tensor, indices, sizes), outputElementShape);
        }
        tensor.dispose();
        return tensors;
    });
    const list = new TensorList([], elementShape, tensor.dtype, length.length);
    for (let i = 0; i < tensors.length; i++) {
        list.setItem(i, tensors[i]);
    }
    return list;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuc29yX2xpc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWNvbnZlcnRlci9zcmMvZXhlY3V0b3IvdGVuc29yX2xpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgsT0FBTyxFQUFDLE1BQU0sRUFBWSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFVLE1BQU0sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFM0gsT0FBTyxFQUFDLG1DQUFtQyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFFekc7Ozs7Ozs7Ozs7Ozs7R0FhRztBQUVILE1BQU0sT0FBTyxVQUFVO0lBSXJCLElBQUksRUFBRTtRQUNKLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUNEOzs7Ozs7OztPQVFHO0lBQ0gsWUFDYSxPQUFpQixFQUFXLFlBQTZCLEVBQ3pELFlBQXNCLEVBQUUsY0FBYyxHQUFHLENBQUMsQ0FBQztRQUQzQyxZQUFPLEdBQVAsT0FBTyxDQUFVO1FBQVcsaUJBQVksR0FBWixZQUFZLENBQWlCO1FBQ3pELGlCQUFZLEdBQVosWUFBWSxDQUFVO1FBQ2pDLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QixJQUFJLFlBQVksS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFO29CQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUNaLFlBQVksdUJBQXVCLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2lCQUN4RDtnQkFDRCxtQ0FBbUMsQ0FDL0IsWUFBWSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztn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QUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzdCO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMjAgR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG5pbXBvcnQge2NvbmNhdCwgRGF0YVR5cGUsIGtlZXAsIHJlc2hhcGUsIHNjYWxhciwgc2xpY2UsIHN0YWNrLCBUZW5zb3IsIHRlbnNvciwgdGlkeSwgdW5zdGFja30gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHthc3NlcnRTaGFwZXNNYXRjaEFsbG93VW5kZWZpbmVkU2l6ZSwgaW5mZXJFbGVtZW50U2hhcGUsIG1lcmdlRWxlbWVudFNoYXBlfSBmcm9tICcuL3RlbnNvcl91dGlscyc7XG5cbi8qKlxuICogVGVuc29yTGlzdCBzdG9yZXMgYSBjb250YWluZXIgb2YgYHRmLlRlbnNvcmAgb2JqZWN0cywgd2hpY2ggYXJlIGFjY2Vzc2libGVcbiAqIHZpYSB0ZW5zb3JzIGZpZWxkLlxuICpcbiAqIEluIG9yZGVyIHRvIGdldCBhIGNvcHkgb2YgdGhlIHVuZGVybHlpbmcgbGlzdCwgdXNlIHRoZSBjb3B5IG1ldGhvZDpcbiAqIGBgYFxuICogICAgVGVuc29yTGlzdCBiID0gYS5jb3B5KCk7XG4gKiAgICBiLnRlbnNvcnMoKS5wdXNoQmFjayh0KTsgIC8vIFRoaXMgZG9lcyBub3QgbW9kaWZ5IGEudGVuc29ycygpLlxuICogYGBgXG4gKlxuICogTm90ZSB0aGF0IHRoaXMgaXMgbm90IGEgZGVlcCBjb3B5OiB0aGUgbWVtb3J5IGxvY2F0aW9ucyBvZiB0aGUgdW5kZXJseWluZ1xuICogdGVuc29ycyB3aWxsIHN0aWxsIHBvaW50IHRvIHRoZSBzYW1lIGxvY2F0aW9ucyBvZiB0aGUgY29ycmVzcG9uZGluZyB0ZW5zb3JzXG4gKiBpbiB0aGUgb3JpZ2luYWwuXG4gKi9cblxuZXhwb3J0IGNsYXNzIFRlbnNvckxpc3Qge1xuICByZWFkb25seSBpZFRlbnNvcjogVGVuc29yO1xuICBtYXhOdW1FbGVtZW50czogbnVtYmVyO1xuXG4gIGdldCBpZCgpIHtcbiAgICByZXR1cm4gdGhpcy5pZFRlbnNvci5pZDtcbiAgfVxuICAvKipcbiAgICpcbiAgICogQHBhcmFtIHRlbnNvcnMgbGlzdCBvZiB0ZW5zb3JzXG4gICAqIEBwYXJhbSBlbGVtZW50U2hhcGUgc2hhcGUgb2YgZWFjaCB0ZW5zb3IsIHRoaXMgY2FuIGJlIGEgc2luZ2xlIG51bWJlciAoYW55XG4gICAqIHNoYXBlIGlzIGFsbG93ZWQpIG9yIHBhcnRpYWwgc2hhcGUgKGRpbSA9IC0xKS5cbiAgICogQHBhcmFtIGVsZW1lbnREdHlwZSBkYXRhIHR5cGUgb2YgZWFjaCB0ZW5zb3JcbiAgICogQHBhcmFtIG1heE51bUVsZW1lbnRzIFRoZSBtYXhpbXVtIGFsbG93ZWQgc2l6ZSBvZiBgdGVuc29yc2AuIERlZmF1bHRzIHRvIC0xXG4gICAqICAgbWVhbmluZyB0aGF0IHRoZSBzaXplIG9mIGB0ZW5zb3JzYCBpcyB1bmJvdW5kZWQuXG4gICAqL1xuICBjb25zdHJ1Y3RvcihcbiAgICAgIHJlYWRvbmx5IHRlbnNvcnM6IFRlbnNvcltdLCByZWFkb25seSBlbGVtZW50U2hhcGU6IG51bWJlcnxudW1iZXJbXSxcbiAgICAgIHJlYWRvbmx5IGVsZW1lbnREdHlwZTogRGF0YVR5cGUsIG1heE51bUVsZW1lbnRzID0gLTEpIHtcbiAgICBpZiAodGVuc29ycyAhPSBudWxsKSB7XG4gICAgICB0ZW5zb3JzLmZvckVhY2godGVuc29yID0+IHtcbiAgICAgICAgaWYgKGVsZW1lbnREdHlwZSAhPT0gdGVuc29yLmR0eXBlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEgdHlwZXM7IG9wIGVsZW1lbnRzICR7XG4gICAgICAgICAgICAgIGVsZW1lbnREdHlwZX0sIGJ1dCBsaXN0IGVsZW1lbnRzICR7dGVuc29yLmR0eXBlfWApO1xuICAgICAgICB9XG4gICAgICAgIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgICAgICAgZWxlbWVudFNoYXBlLCB0ZW5zb3Iuc2hhcGUsICdUZW5zb3JMaXN0IHNoYXBlIG1pc21hdGNoOiAnKTtcblxuICAgICAgICBrZWVwKHRlbnNvcik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhpcy5pZFRlbnNvciA9IHNjYWxhcigwKTtcbiAgICB0aGlzLm1heE51bUVsZW1lbnRzID0gbWF4TnVtRWxlbWVudHM7XG4gICAga2VlcCh0aGlzLmlkVGVuc29yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBuZXcgVGVuc29yTGlzdCBjb250YWluaW5nIGEgY29weSBvZiB0aGUgdW5kZXJseWluZyB0ZW5zb3IgY29udGFpbmVyLlxuICAgKi9cbiAgY29weSgpOiBUZW5zb3JMaXN0IHtcbiAgICByZXR1cm4gbmV3IFRlbnNvckxpc3QoXG4gICAgICAgIFsuLi50aGlzLnRlbnNvcnNdLCB0aGlzLmVsZW1lbnRTaGFwZSwgdGhpcy5lbGVtZW50RHR5cGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIERpc3Bvc2UgdGhlIHRlbnNvcnMgYW5kIGlkVGVuc29yIGFuZCBjbGVhciB0aGUgdGVuc29yIGxpc3QuXG4gICAqL1xuICBjbGVhckFuZENsb3NlKGtlZXBJZHM/OiBTZXQ8bnVtYmVyPikge1xuICAgIHRoaXMudGVuc29ycy5mb3JFYWNoKHRlbnNvciA9PiB7XG4gICAgICBpZiAoa2VlcElkcyA9PSBudWxsIHx8ICFrZWVwSWRzLmhhcyh0ZW5zb3IuaWQpKSB7XG4gICAgICAgIHRlbnNvci5kaXNwb3NlKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy50ZW5zb3JzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5pZFRlbnNvci5kaXNwb3NlKCk7XG4gIH1cbiAgLyoqXG4gICAqIFRoZSBzaXplIG9mIHRoZSB0ZW5zb3JzIGluIHRoZSB0ZW5zb3IgbGlzdC5cbiAgICovXG4gIHNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMudGVuc29ycy5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGEgdGVuc29yIHRoYXQgc3RhY2tzIGEgbGlzdCBvZiByYW5rLVIgdGYuVGVuc29ycyBpbnRvIG9uZSByYW5rLShSKzEpXG4gICAqIHRmLlRlbnNvci5cbiAgICogQHBhcmFtIGVsZW1lbnRTaGFwZSBzaGFwZSBvZiBlYWNoIHRlbnNvclxuICAgKiBAcGFyYW0gZWxlbWVudER0eXBlIGRhdGEgdHlwZSBvZiBlYWNoIHRlbnNvclxuICAgKiBAcGFyYW0gbnVtRWxlbWVudHMgdGhlIG51bWJlciBvZiBlbGVtZW50cyB0byBzdGFja1xuICAgKi9cbiAgc3RhY2soZWxlbWVudFNoYXBlOiBudW1iZXJbXSwgZWxlbWVudER0eXBlOiBEYXRhVHlwZSwgbnVtRWxlbWVudHMgPSAtMSk6XG4gICAgICBUZW5zb3Ige1xuICAgIGlmIChlbGVtZW50RHR5cGUgIT09IHRoaXMuZWxlbWVudER0eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YSB0eXBlczsgb3AgZWxlbWVudHMgJHtcbiAgICAgICAgICBlbGVtZW50RHR5cGV9LCBidXQgbGlzdCBlbGVtZW50cyAke3RoaXMuZWxlbWVudER0eXBlfWApO1xuICAgIH1cbiAgICBpZiAobnVtRWxlbWVudHMgIT09IC0xICYmIHRoaXMudGVuc29ycy5sZW5ndGggIT09IG51bUVsZW1lbnRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE9wZXJhdGlvbiBleHBlY3RlZCBhIGxpc3Qgd2l0aCAke1xuICAgICAgICAgIG51bUVsZW1lbnRzfSBlbGVtZW50cyBidXQgZ290IGEgbGlzdCB3aXRoICR7XG4gICAgICAgICAgdGhpcy50ZW5zb3JzLmxlbmd0aH0gZWxlbWVudHMuYCk7XG4gICAgfVxuICAgIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgICBlbGVtZW50U2hhcGUsIHRoaXMuZWxlbWVudFNoYXBlLCAnVGVuc29yTGlzdCBzaGFwZSBtaXNtYXRjaDogJyk7XG4gICAgY29uc3Qgb3V0cHV0RWxlbWVudFNoYXBlID1cbiAgICAgICAgaW5mZXJFbGVtZW50U2hhcGUodGhpcy5lbGVtZW50U2hhcGUsIHRoaXMudGVuc29ycywgZWxlbWVudFNoYXBlKTtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCByZXNoYXBlZFRlbnNvcnMgPVxuICAgICAgICAgIHRoaXMudGVuc29ycy5tYXAodGVuc29yID0+IHJlc2hhcGUodGVuc29yLCBvdXRwdXRFbGVtZW50U2hhcGUpKTtcbiAgICAgIHJldHVybiBzdGFjayhyZXNoYXBlZFRlbnNvcnMsIDApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFBvcCBhIHRlbnNvciBmcm9tIHRoZSBlbmQgb2YgdGhlIGxpc3QuXG4gICAqIEBwYXJhbSBlbGVtZW50U2hhcGUgc2hhcGUgb2YgdGhlIHRlbnNvclxuICAgKiBAcGFyYW0gZWxlbWVudER0eXBlIGRhdGEgdHlwZSBvZiB0aGUgdGVuc29yXG4gICAqL1xuICBwb3BCYWNrKGVsZW1lbnRTaGFwZTogbnVtYmVyW10sIGVsZW1lbnREdHlwZTogRGF0YVR5cGUpOiBUZW5zb3Ige1xuICAgIGlmIChlbGVtZW50RHR5cGUgIT09IHRoaXMuZWxlbWVudER0eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YSB0eXBlczsgb3AgZWxlbWVudHMgJHtcbiAgICAgICAgICBlbGVtZW50RHR5cGV9LCBidXQgbGlzdCBlbGVtZW50cyAke3RoaXMuZWxlbWVudER0eXBlfWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnNpemUoKSA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUcnlpbmcgdG8gcG9wIGZyb20gYW4gZW1wdHkgbGlzdC4nKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0RWxlbWVudFNoYXBlID1cbiAgICAgICAgaW5mZXJFbGVtZW50U2hhcGUodGhpcy5lbGVtZW50U2hhcGUsIHRoaXMudGVuc29ycywgZWxlbWVudFNoYXBlKTtcbiAgICBjb25zdCB0ZW5zb3IgPSB0aGlzLnRlbnNvcnMucG9wKCk7XG4gICAgdGVuc29yLmtlcHQgPSBmYWxzZTtcblxuICAgIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgICB0ZW5zb3Iuc2hhcGUsIGVsZW1lbnRTaGFwZSwgJ1RlbnNvckxpc3Qgc2hhcGUgbWlzbWF0Y2g6ICcpO1xuXG4gICAgcmV0dXJuIHJlc2hhcGUodGVuc29yLCBvdXRwdXRFbGVtZW50U2hhcGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1c2ggYSB0ZW5zb3IgdG8gdGhlIGVuZCBvZiB0aGUgbGlzdC5cbiAgICogQHBhcmFtIHRlbnNvciBUZW5zb3IgdG8gYmUgcHVzaGVkLlxuICAgKi9cbiAgcHVzaEJhY2sodGVuc29yOiBUZW5zb3IpIHtcbiAgICBpZiAodGVuc29yLmR0eXBlICE9PSB0aGlzLmVsZW1lbnREdHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEgdHlwZXM7IG9wIGVsZW1lbnRzICR7XG4gICAgICAgICAgdGVuc29yLmR0eXBlfSwgYnV0IGxpc3QgZWxlbWVudHMgJHt0aGlzLmVsZW1lbnREdHlwZX1gKTtcbiAgICB9XG5cbiAgICBhc3NlcnRTaGFwZXNNYXRjaEFsbG93VW5kZWZpbmVkU2l6ZShcbiAgICAgICAgdGVuc29yLnNoYXBlLCB0aGlzLmVsZW1lbnRTaGFwZSwgJ1RlbnNvckxpc3Qgc2hhcGUgbWlzbWF0Y2g6ICcpO1xuXG4gICAgaWYgKHRoaXMubWF4TnVtRWxlbWVudHMgPT09IHRoaXMuc2l6ZSgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRyeWluZyB0byBwdXNoIGVsZW1lbnQgaW50byBhIGZ1bGwgbGlzdC5gKTtcbiAgICB9XG4gICAga2VlcCh0ZW5zb3IpO1xuICAgIHRoaXMudGVuc29ycy5wdXNoKHRlbnNvcik7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIHRoZSBzaXplIG9mIHRoZSBsaXN0LlxuICAgKiBAcGFyYW0gc2l6ZSB0aGUgbmV3IHNpemUgb2YgdGhlIGxpc3QuXG4gICAqL1xuICByZXNpemUoc2l6ZTogbnVtYmVyKSB7XG4gICAgaWYgKHNpemUgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYFRlbnNvckxpc3RSZXNpemUgZXhwZWN0cyBzaXplIHRvIGJlIG5vbi1uZWdhdGl2ZS4gR290OiAke3NpemV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubWF4TnVtRWxlbWVudHMgIT09IC0xICYmIHNpemUgPiB0aGlzLm1heE51bUVsZW1lbnRzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRlbnNvckxpc3RSZXNpemUgaW5wdXQgc2l6ZSAke1xuICAgICAgICAgIHNpemV9IGlzIGdyZWF0ZXIgbWF4TnVtRWxlbWVudCAke3RoaXMubWF4TnVtRWxlbWVudHN9LmApO1xuICAgIH1cblxuICAgIGNvbnN0IGRlc3RUZW5zb3JMaXN0OiBUZW5zb3JMaXN0ID0gbmV3IFRlbnNvckxpc3QoXG4gICAgICAgIFtdLCB0aGlzLmVsZW1lbnRTaGFwZSwgdGhpcy5lbGVtZW50RHR5cGUsIHRoaXMubWF4TnVtRWxlbWVudHMpO1xuICAgIGRlc3RUZW5zb3JMaXN0LnRlbnNvcnMubGVuZ3RoID0gc2l6ZTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IE1hdGgubWluKHRoaXMudGVuc29ycy5sZW5ndGgsIHNpemUpOyArK2kpIHtcbiAgICAgIGRlc3RUZW5zb3JMaXN0LnRlbnNvcnNbaV0gPSB0aGlzLnRlbnNvcnNbaV07XG4gICAgfVxuICAgIHJldHVybiBkZXN0VGVuc29yTGlzdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXRyaWV2ZSB0aGUgZWxlbWVudCBhdCB0aGUgcHJvdmlkZWQgaW5kZXhcbiAgICogQHBhcmFtIGVsZW1lbnRTaGFwZSBzaGFwZSBvZiB0aGUgdGVuc29yXG4gICAqIEBwYXJhbSBlbGVtZW50RHR5cGUgZHR5cGUgb2YgdGhlIHRlbnNvclxuICAgKiBAcGFyYW0gZWxlbWVudEluZGV4IGluZGV4IG9mIHRoZSB0ZW5zb3JcbiAgICovXG4gIGdldEl0ZW0oZWxlbWVudEluZGV4OiBudW1iZXIsIGVsZW1lbnRTaGFwZTogbnVtYmVyW10sIGVsZW1lbnREdHlwZTogRGF0YVR5cGUpOlxuICAgICAgVGVuc29yIHtcbiAgICBpZiAoZWxlbWVudER0eXBlICE9PSB0aGlzLmVsZW1lbnREdHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEgdHlwZXM7IG9wIGVsZW1lbnRzICR7XG4gICAgICAgICAgZWxlbWVudER0eXBlfSwgYnV0IGxpc3QgZWxlbWVudHMgJHt0aGlzLmVsZW1lbnREdHlwZX1gKTtcbiAgICB9XG4gICAgaWYgKGVsZW1lbnRJbmRleCA8IDAgfHwgZWxlbWVudEluZGV4ID4gdGhpcy50ZW5zb3JzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcnlpbmcgdG8gYWNjZXNzIGVsZW1lbnQgJHtcbiAgICAgICAgICBlbGVtZW50SW5kZXh9IGluIGEgbGlzdCB3aXRoICR7dGhpcy50ZW5zb3JzLmxlbmd0aH0gZWxlbWVudHMuYCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudGVuc29yc1tlbGVtZW50SW5kZXhdID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgZWxlbWVudCBhdCBpbmRleCAke2VsZW1lbnRJbmRleH0gaXMgbnVsbC5gKTtcbiAgICB9XG5cbiAgICBhc3NlcnRTaGFwZXNNYXRjaEFsbG93VW5kZWZpbmVkU2l6ZShcbiAgICAgICAgdGhpcy50ZW5zb3JzW2VsZW1lbnRJbmRleF0uc2hhcGUsIGVsZW1lbnRTaGFwZSxcbiAgICAgICAgJ1RlbnNvckxpc3Qgc2hhcGUgbWlzbWF0Y2g6ICcpO1xuICAgIGNvbnN0IG91dHB1dEVsZW1lbnRTaGFwZSA9XG4gICAgICAgIGluZmVyRWxlbWVudFNoYXBlKHRoaXMuZWxlbWVudFNoYXBlLCB0aGlzLnRlbnNvcnMsIGVsZW1lbnRTaGFwZSk7XG4gICAgcmV0dXJuIHJlc2hhcGUodGhpcy50ZW5zb3JzW2VsZW1lbnRJbmRleF0sIG91dHB1dEVsZW1lbnRTaGFwZSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSB0ZW5zb3IgYXQgdGhlIGluZGV4XG4gICAqIEBwYXJhbSBlbGVtZW50SW5kZXggaW5kZXggb2YgdGhlIHRlbnNvclxuICAgKiBAcGFyYW0gdGVuc29yIHRoZSB0ZW5zb3IgdG8gYmUgaW5zZXJ0ZWQgaW50byB0aGUgbGlzdFxuICAgKi9cbiAgc2V0SXRlbShlbGVtZW50SW5kZXg6IG51bWJlciwgdGVuc29yOiBUZW5zb3IpIHtcbiAgICBpZiAodGVuc29yLmR0eXBlICE9PSB0aGlzLmVsZW1lbnREdHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGRhdGEgdHlwZXM7IG9wIGVsZW1lbnRzICR7XG4gICAgICAgICAgdGVuc29yLmR0eXBlfSwgYnV0IGxpc3QgZWxlbWVudHMgJHt0aGlzLmVsZW1lbnREdHlwZX1gKTtcbiAgICB9XG5cbiAgICBpZiAoZWxlbWVudEluZGV4IDwgMCB8fFxuICAgICAgICB0aGlzLm1heE51bUVsZW1lbnRzICE9PSAtMSAmJiBlbGVtZW50SW5kZXggPj0gdGhpcy5tYXhOdW1FbGVtZW50cykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBUcnlpbmcgdG8gc2V0IGVsZW1lbnQgJHtcbiAgICAgICAgICBlbGVtZW50SW5kZXh9IGluIGEgbGlzdCB3aXRoIG1heCAke3RoaXMubWF4TnVtRWxlbWVudHN9IGVsZW1lbnRzLmApO1xuICAgIH1cblxuICAgIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgICB0aGlzLmVsZW1lbnRTaGFwZSwgdGVuc29yLnNoYXBlLCAnVGVuc29yTGlzdCBzaGFwZSBtaXNtYXRjaDogJyk7XG4gICAga2VlcCh0ZW5zb3IpO1xuXG4gICAgLy8gZGlzcG9zZSB0aGUgcHJldmlvdXMgdmFsdWUgaWYgaXQgaXMgcmVwbGFjaW5nLlxuICAgIGlmICh0aGlzLnRlbnNvcnNbZWxlbWVudEluZGV4XSAhPSBudWxsKSB7XG4gICAgICB0aGlzLnRlbnNvcnNbZWxlbWVudEluZGV4XS5rZXB0ID0gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy50ZW5zb3JzW2VsZW1lbnRJbmRleF0gPSB0ZW5zb3I7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIHNlbGVjdGVkIHZhbHVlcyBpbiB0aGUgVGVuc29yTGlzdCBhcyBhIHN0YWNrZWQgVGVuc29yLiBBbGwgb2ZcbiAgICogc2VsZWN0ZWQgdmFsdWVzIG11c3QgaGF2ZSBiZWVuIHdyaXR0ZW4gYW5kIHRoZWlyIHNoYXBlcyBtdXN0IGFsbCBtYXRjaC5cbiAgICogQHBhcmFtIGluZGljZXMgaW5kaWNlcyBvZiB0ZW5zb3JzIHRvIGdhdGhlclxuICAgKiBAcGFyYW0gZWxlbWVudER0eXBlIG91dHB1dCB0ZW5zb3IgZHR5cGVcbiAgICogQHBhcmFtIGVsZW1lbnRTaGFwZSBvdXRwdXQgdGVuc29yIGVsZW1lbnQgc2hhcGVcbiAgICovXG4gIGdhdGhlcihpbmRpY2VzOiBudW1iZXJbXSwgZWxlbWVudER0eXBlOiBEYXRhVHlwZSwgZWxlbWVudFNoYXBlOiBudW1iZXJbXSk6XG4gICAgICBUZW5zb3Ige1xuICAgIGlmIChlbGVtZW50RHR5cGUgIT09IHRoaXMuZWxlbWVudER0eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgZGF0YSB0eXBlczsgb3AgZWxlbWVudHMgJHtcbiAgICAgICAgICBlbGVtZW50RHR5cGV9LCBidXQgbGlzdCBlbGVtZW50cyAke3RoaXMuZWxlbWVudER0eXBlfWApO1xuICAgIH1cblxuICAgIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgICB0aGlzLmVsZW1lbnRTaGFwZSwgZWxlbWVudFNoYXBlLCAnVGVuc29yTGlzdCBzaGFwZSBtaXNtYXRjaDogJyk7XG5cbiAgICAvLyBXaGVuIGluZGljZXMgaXMgZ3JlYXRlciB0aGFuIHRoZSBzaXplIG9mIHRoZSBsaXN0LCBpbmRpY2VzIGJleW9uZCB0aGVcbiAgICAvLyBzaXplIG9mIHRoZSBsaXN0IGFyZSBpZ25vcmVkLlxuICAgIGluZGljZXMgPSBpbmRpY2VzLnNsaWNlKDAsIHRoaXMuc2l6ZSgpKTtcbiAgICBjb25zdCBvdXRwdXRFbGVtZW50U2hhcGUgPVxuICAgICAgICBpbmZlckVsZW1lbnRTaGFwZSh0aGlzLmVsZW1lbnRTaGFwZSwgdGhpcy50ZW5zb3JzLCBlbGVtZW50U2hhcGUpO1xuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRlbnNvcihbXSwgWzBdLmNvbmNhdChvdXRwdXRFbGVtZW50U2hhcGUpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCB0ZW5zb3JzID1cbiAgICAgICAgICBpbmRpY2VzLm1hcChpID0+IHJlc2hhcGUodGhpcy50ZW5zb3JzW2ldLCBvdXRwdXRFbGVtZW50U2hhcGUpKTtcbiAgICAgIHJldHVybiBzdGFjayh0ZW5zb3JzLCAwKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm4gdGhlIHZhbHVlcyBpbiB0aGUgVGVuc29yTGlzdCBhcyBhIGNvbmNhdGVuYXRlZCBUZW5zb3IuXG4gICAqIEBwYXJhbSBlbGVtZW50RHR5cGUgb3V0cHV0IHRlbnNvciBkdHlwZVxuICAgKiBAcGFyYW0gZWxlbWVudFNoYXBlIG91dHB1dCB0ZW5zb3IgZWxlbWVudCBzaGFwZVxuICAgKi9cbiAgY29uY2F0KGVsZW1lbnREdHlwZTogRGF0YVR5cGUsIGVsZW1lbnRTaGFwZTogbnVtYmVyW10pOiBUZW5zb3Ige1xuICAgIGlmICghIWVsZW1lbnREdHlwZSAmJiBlbGVtZW50RHR5cGUgIT09IHRoaXMuZWxlbWVudER0eXBlKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFRlbnNvckxpc3QgZHR5cGUgaXMgJHtcbiAgICAgICAgICB0aGlzLmVsZW1lbnREdHlwZX0gYnV0IGNvbmNhdCByZXF1ZXN0ZWQgZHR5cGUgJHtlbGVtZW50RHR5cGV9YCk7XG4gICAgfVxuXG4gICAgYXNzZXJ0U2hhcGVzTWF0Y2hBbGxvd1VuZGVmaW5lZFNpemUoXG4gICAgICAgIHRoaXMuZWxlbWVudFNoYXBlLCBlbGVtZW50U2hhcGUsICdUZW5zb3JMaXN0IHNoYXBlIG1pc21hdGNoOiAnKTtcbiAgICBjb25zdCBvdXRwdXRFbGVtZW50U2hhcGUgPVxuICAgICAgICBpbmZlckVsZW1lbnRTaGFwZSh0aGlzLmVsZW1lbnRTaGFwZSwgdGhpcy50ZW5zb3JzLCBlbGVtZW50U2hhcGUpO1xuXG4gICAgaWYgKHRoaXMuc2l6ZSgpID09PSAwKSB7XG4gICAgICByZXR1cm4gdGVuc29yKFtdLCBbMF0uY29uY2F0KG91dHB1dEVsZW1lbnRTaGFwZSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBjb25zdCB0ZW5zb3JzID0gdGhpcy50ZW5zb3JzLm1hcCh0ID0+IHJlc2hhcGUodCwgb3V0cHV0RWxlbWVudFNoYXBlKSk7XG4gICAgICByZXR1cm4gY29uY2F0KHRlbnNvcnMsIDApO1xuICAgIH0pO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFRlbnNvckxpc3Qgd2hpY2gsIHdoZW4gc3RhY2tlZCwgaGFzIHRoZSB2YWx1ZSBvZiB0ZW5zb3IuXG4gKiBAcGFyYW0gdGVuc29yIGZyb20gdGVuc29yXG4gKiBAcGFyYW0gZWxlbWVudFNoYXBlIG91dHB1dCB0ZW5zb3IgZWxlbWVudCBzaGFwZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZnJvbVRlbnNvcihcbiAgICB0ZW5zb3I6IFRlbnNvciwgZWxlbWVudFNoYXBlOiBudW1iZXJbXSwgZWxlbWVudER0eXBlOiBEYXRhVHlwZSkge1xuICBjb25zdCBkdHlwZSA9IHRlbnNvci5kdHlwZTtcbiAgaWYgKHRlbnNvci5zaGFwZS5sZW5ndGggPCAxKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgVGVuc29yIG11c3QgYmUgYXQgbGVhc3QgYSB2ZWN0b3IsIGJ1dCBzYXcgc2hhcGU6ICR7dGVuc29yLnNoYXBlfWApO1xuICB9XG4gIGlmICh0ZW5zb3IuZHR5cGUgIT09IGVsZW1lbnREdHlwZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBkYXRhIHR5cGVzOyBvcCBlbGVtZW50cyAke1xuICAgICAgICB0ZW5zb3IuZHR5cGV9LCBidXQgbGlzdCBlbGVtZW50cyAke2VsZW1lbnREdHlwZX1gKTtcbiAgfVxuICBjb25zdCB0ZW5zb3JFbGVtZW50U2hhcGUgPSB0ZW5zb3Iuc2hhcGUuc2xpY2UoMSk7XG4gIGFzc2VydFNoYXBlc01hdGNoQWxsb3dVbmRlZmluZWRTaXplKFxuICAgICAgdGVuc29yRWxlbWVudFNoYXBlLCBlbGVtZW50U2hhcGUsICdUZW5zb3JMaXN0IHNoYXBlIG1pc21hdGNoOiAnKTtcbiAgY29uc3QgdGVuc29yTGlzdDogVGVuc29yW10gPSB1bnN0YWNrKHRlbnNvcik7XG4gIHJldHVybiBuZXcgVGVuc29yTGlzdCh0ZW5zb3JMaXN0LCBlbGVtZW50U2hhcGUsIGR0eXBlKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gYSBUZW5zb3JMaXN0IG9mIHRoZSBnaXZlbiBzaXplIHdpdGggZW1wdHkgZWxlbWVudHMuXG4gKiBAcGFyYW0gZWxlbWVudFNoYXBlIHRoZSBzaGFwZSBvZiB0aGUgZnV0dXJlIGVsZW1lbnRzIG9mIHRoZSBsaXN0XG4gKiBAcGFyYW0gZWxlbWVudER0eXBlIHRoZSBkZXNpcmVkIHR5cGUgb2YgZWxlbWVudHMgaW4gdGhlIGxpc3RcbiAqIEBwYXJhbSBudW1FbGVtZW50cyB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIHRvIHJlc2VydmVcbiAqIEBwYXJhbSBtYXhOdW1FbGVtZW50cyB0aGUgbWF4aW11bSBudW1iZXIgb2YgZWxlbWVudHMgaW4gdGggbGlzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzZXJ2ZShcbiAgICBlbGVtZW50U2hhcGU6IG51bWJlcltdLCBlbGVtZW50RHR5cGU6IERhdGFUeXBlLCBudW1FbGVtZW50czogbnVtYmVyLFxuICAgIG1heE51bUVsZW1lbnRzOiBudW1iZXIpIHtcbiAgcmV0dXJuIG5ldyBUZW5zb3JMaXN0KFtdLCBlbGVtZW50U2hhcGUsIGVsZW1lbnREdHlwZSwgbWF4TnVtRWxlbWVudHMpO1xufVxuXG4vKipcbiAqIFB1dCB0ZW5zb3JzIGF0IHNwZWNpZmljIGluZGljZXMgb2YgYSBzdGFja2VkIHRlbnNvciBpbnRvIGEgVGVuc29yTGlzdC5cbiAqIEBwYXJhbSBpbmRpY2VzIGxpc3Qgb2YgaW5kaWNlcyBvbiBob3cgdG8gc2NhdHRlciB0aGUgdGVuc29yLlxuICogQHBhcmFtIHRlbnNvciBpbnB1dCB0ZW5zb3IuXG4gKiBAcGFyYW0gZWxlbWVudFNoYXBlIHRoZSBzaGFwZSBvZiB0aGUgZnV0dXJlIGVsZW1lbnRzIG9mIHRoZSBsaXN0XG4gKiBAcGFyYW0gbnVtRWxlbWVudHMgdGhlIG51bWJlciBvZiBlbGVtZW50cyB0byBzY2F0dGVyXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzY2F0dGVyKFxuICAgIHRlbnNvcjogVGVuc29yLCBpbmRpY2VzOiBudW1iZXJbXSwgZWxlbWVudFNoYXBlOiBudW1iZXJbXSxcbiAgICBudW1FbGVtZW50cz86IG51bWJlcik6IFRlbnNvckxpc3Qge1xuICBpZiAoaW5kaWNlcy5sZW5ndGggIT09IHRlbnNvci5zaGFwZVswXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgbGVuKGluZGljZXMpID09IHRlbnNvci5zaGFwZVswXSwgYnV0IHNhdzogJHtcbiAgICAgICAgaW5kaWNlcy5sZW5ndGh9IHZzLiAke3RlbnNvci5zaGFwZVswXX1gKTtcbiAgfVxuXG4gIGNvbnN0IG1heEluZGV4ID0gTWF0aC5tYXgoLi4uaW5kaWNlcyk7XG5cbiAgaWYgKG51bUVsZW1lbnRzICE9IG51bGwgJiYgbnVtRWxlbWVudHMgIT09IC0xICYmIG1heEluZGV4ID49IG51bUVsZW1lbnRzKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgTWF4IGluZGV4IG11c3QgYmUgPCBhcnJheSBzaXplICgke21heEluZGV4fSAgdnMuICR7bnVtRWxlbWVudHN9KWApO1xuICB9XG5cbiAgY29uc3QgbGlzdCA9IG5ldyBUZW5zb3JMaXN0KFtdLCBlbGVtZW50U2hhcGUsIHRlbnNvci5kdHlwZSwgbnVtRWxlbWVudHMpO1xuICBjb25zdCB0ZW5zb3JzID0gdW5zdGFjayh0ZW5zb3IsIDApO1xuICBpbmRpY2VzLmZvckVhY2goKHZhbHVlLCBpbmRleCkgPT4ge1xuICAgIGxpc3Quc2V0SXRlbSh2YWx1ZSwgdGVuc29yc1tpbmRleF0pO1xuICB9KTtcbiAgcmV0dXJuIGxpc3Q7XG59XG5cbi8qKlxuICogU3BsaXQgdGhlIHZhbHVlcyBvZiBhIFRlbnNvciBpbnRvIGEgVGVuc29yTGlzdC5cbiAqIEBwYXJhbSBsZW5ndGggdGhlIGxlbmd0aHMgdG8gdXNlIHdoZW4gc3BsaXR0aW5nIHZhbHVlIGFsb25nXG4gKiAgICBpdHMgZmlyc3QgZGltZW5zaW9uLlxuICogQHBhcmFtIHRlbnNvciB0aGUgdGVuc29yIHRvIHNwbGl0LlxuICogQHBhcmFtIGVsZW1lbnRTaGFwZSB0aGUgc2hhcGUgb2YgdGhlIGZ1dHVyZSBlbGVtZW50cyBvZiB0aGUgbGlzdFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3BsaXQoXG4gICAgdGVuc29yOiBUZW5zb3IsIGxlbmd0aDogbnVtYmVyW10sIGVsZW1lbnRTaGFwZTogbnVtYmVyW10pIHtcbiAgbGV0IHRvdGFsTGVuZ3RoID0gMDtcbiAgY29uc3QgY3VtdWxhdGl2ZUxlbmd0aHMgPSBsZW5ndGgubWFwKGxlbiA9PiB7XG4gICAgdG90YWxMZW5ndGggKz0gbGVuO1xuICAgIHJldHVybiB0b3RhbExlbmd0aDtcbiAgfSk7XG5cbiAgaWYgKHRvdGFsTGVuZ3RoICE9PSB0ZW5zb3Iuc2hhcGVbMF0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHN1bSBvZiBsZW5ndGhzIHRvIGJlIGVxdWFsIHRvXG4gICAgICAgICAgdGVuc29yLnNoYXBlWzBdLCBidXQgc3VtIG9mIGxlbmd0aHMgaXNcbiAgICAgICAgJHt0b3RhbExlbmd0aH0sIGFuZCB0ZW5zb3IncyBzaGFwZSBpczogJHt0ZW5zb3Iuc2hhcGV9YCk7XG4gIH1cblxuICBjb25zdCBzaGFwZVdpdGhvdXRGaXJzdERpbSA9IHRlbnNvci5zaGFwZS5zbGljZSgxKTtcbiAgY29uc3Qgb3V0cHV0RWxlbWVudFNoYXBlID1cbiAgICAgIG1lcmdlRWxlbWVudFNoYXBlKHNoYXBlV2l0aG91dEZpcnN0RGltLCBlbGVtZW50U2hhcGUpO1xuICBjb25zdCBlbGVtZW50UGVyUm93ID0gdG90YWxMZW5ndGggPT09IDAgPyAwIDogdGVuc29yLnNpemUgLyB0b3RhbExlbmd0aDtcbiAgY29uc3QgdGVuc29yczogVGVuc29yW10gPSB0aWR5KCgpID0+IHtcbiAgICBjb25zdCB0ZW5zb3JzID0gW107XG4gICAgdGVuc29yID0gcmVzaGFwZSh0ZW5zb3IsIFsxLCB0b3RhbExlbmd0aCwgZWxlbWVudFBlclJvd10pO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBwcmV2aW91c0xlbmd0aCA9IChpID09PSAwKSA/IDAgOiBjdW11bGF0aXZlTGVuZ3Roc1tpIC0gMV07XG4gICAgICBjb25zdCBpbmRpY2VzID0gWzAsIHByZXZpb3VzTGVuZ3RoLCAwXTtcbiAgICAgIGNvbnN0IHNpemVzID0gWzEsIGxlbmd0aFtpXSwgZWxlbWVudFBlclJvd107XG4gICAgICB0ZW5zb3JzW2ldID0gcmVzaGFwZShcbiAgICAgICAgICBzbGljZSh0ZW5zb3IsIGluZGljZXMsIHNpemVzKSwgb3V0cHV0RWxlbWVudFNoYXBlIGFzIG51bWJlcltdKTtcbiAgICB9XG4gICAgdGVuc29yLmRpc3Bvc2UoKTtcbiAgICByZXR1cm4gdGVuc29ycztcbiAgfSk7XG5cbiAgY29uc3QgbGlzdCA9IG5ldyBUZW5zb3JMaXN0KFtdLCBlbGVtZW50U2hhcGUsIHRlbnNvci5kdHlwZSwgbGVuZ3RoLmxlbmd0aCk7XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZW5zb3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgbGlzdC5zZXRJdGVtKGksIHRlbnNvcnNbaV0pO1xuICB9XG4gIHJldHVybiBsaXN0O1xufVxuIl19