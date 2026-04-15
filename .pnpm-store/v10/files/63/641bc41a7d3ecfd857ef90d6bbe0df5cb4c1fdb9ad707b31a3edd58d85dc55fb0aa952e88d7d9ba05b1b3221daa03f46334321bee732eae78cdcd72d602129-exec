/**
 * @license
 * Copyright 2017 Google LLC. All Rights Reserved.
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
// Workaround for: https://github.com/bazelbuild/rules_nodejs/issues/1265
/// <reference types="@webgpu/types/dist" />
import { getGlobal } from './global_util';
import { tensorToString } from './tensor_format';
import * as util from './util';
import { computeStrides, toNestedArray } from './util';
/**
 * A mutable object, similar to `tf.Tensor`, that allows users to set values
 * at locations before converting to an immutable `tf.Tensor`.
 *
 * See `tf.buffer` for creating a tensor buffer.
 *
 * @doc {heading: 'Tensors', subheading: 'Classes'}
 */
export class TensorBuffer {
    constructor(shape, dtype, values) {
        this.dtype = dtype;
        this.shape = shape.slice();
        this.size = util.sizeFromShape(shape);
        if (values != null) {
            const n = values.length;
            util.assert(n === this.size, () => `Length of values '${n}' does not match the size ` +
                `inferred by the shape '${this.size}'.`);
        }
        if (dtype === 'complex64') {
            throw new Error(`complex64 dtype TensorBuffers are not supported. Please create ` +
                `a TensorBuffer for the real and imaginary parts separately and ` +
                `call tf.complex(real, imag).`);
        }
        this.values = values || util.getArrayFromDType(dtype, this.size);
        this.strides = computeStrides(shape);
    }
    /**
     * Sets a value in the buffer at a given location.
     *
     * @param value The value to set.
     * @param locs  The location indices.
     *
     * @doc {heading: 'Tensors', subheading: 'Creation'}
     */
    set(value, ...locs) {
        if (locs.length === 0) {
            locs = [0];
        }
        util.assert(locs.length === this.rank, () => `The number of provided coordinates (${locs.length}) must ` +
            `match the rank (${this.rank})`);
        const index = this.locToIndex(locs);
        this.values[index] = value;
    }
    /**
     * Returns the value in the buffer at the provided location.
     *
     * @param locs The location indices.
     *
     * @doc {heading: 'Tensors', subheading: 'Creation'}
     */
    get(...locs) {
        if (locs.length === 0) {
            locs = [0];
        }
        let i = 0;
        for (const loc of locs) {
            if (loc < 0 || loc >= this.shape[i]) {
                const msg = `Requested out of range element at ${locs}. ` +
                    `  Buffer shape=${this.shape}`;
                throw new Error(msg);
            }
            i++;
        }
        let index = locs[locs.length - 1];
        for (let i = 0; i < locs.length - 1; ++i) {
            index += this.strides[i] * locs[i];
        }
        return this.values[index];
    }
    locToIndex(locs) {
        if (this.rank === 0) {
            return 0;
        }
        else if (this.rank === 1) {
            return locs[0];
        }
        let index = locs[locs.length - 1];
        for (let i = 0; i < locs.length - 1; ++i) {
            index += this.strides[i] * locs[i];
        }
        return index;
    }
    indexToLoc(index) {
        if (this.rank === 0) {
            return [];
        }
        else if (this.rank === 1) {
            return [index];
        }
        const locs = new Array(this.shape.length);
        for (let i = 0; i < locs.length - 1; ++i) {
            locs[i] = Math.floor(index / this.strides[i]);
            index -= locs[i] * this.strides[i];
        }
        locs[locs.length - 1] = index;
        return locs;
    }
    get rank() {
        return this.shape.length;
    }
    /**
     * Creates an immutable `tf.Tensor` object from the buffer.
     *
     * @doc {heading: 'Tensors', subheading: 'Creation'}
     */
    toTensor() {
        return trackerFn().makeTensor(this.values, this.shape, this.dtype);
    }
}
// For tracking tensor creation and disposal.
let trackerFn = null;
// Used by chaining methods to call into ops.
let opHandler = null;
// Used to warn about deprecated methods.
let deprecationWarningFn = null;
// This here so that we can use this method on dev branches and keep the
// functionality at master.
// tslint:disable-next-line:no-unused-expression
[deprecationWarningFn];
/**
 * An external consumer can register itself as the tensor tracker. This way
 * the Tensor class can notify the tracker for every tensor created and
 * disposed.
 */
export function setTensorTracker(fn) {
    trackerFn = fn;
}
/**
 * An external consumer can register itself as the op handler. This way the
 * Tensor class can have chaining methods that call into ops via the op
 * handler.
 */
export function setOpHandler(handler) {
    opHandler = handler;
}
/**
 * Sets the deprecation warning function to be used by this file. This way the
 * Tensor class can be a leaf but still use the environment.
 */
export function setDeprecationWarningFn(fn) {
    deprecationWarningFn = fn;
}
/**
 * A `tf.Tensor` object represents an immutable, multidimensional array of
 * numbers that has a shape and a data type.
 *
 * For performance reasons, functions that create tensors do not necessarily
 * perform a copy of the data passed to them (e.g. if the data is passed as a
 * `Float32Array`), and changes to the data will change the tensor. This is not
 * a feature and is not supported. To avoid this behavior, use the tensor before
 * changing the input data or create a copy with `copy = tf.add(yourTensor, 0)`.
 *
 * See `tf.tensor` for details on how to create a `tf.Tensor`.
 *
 * @doc {heading: 'Tensors', subheading: 'Classes'}
 */
export class Tensor {
    constructor(shape, dtype, dataId, id) {
        /** Whether this tensor has been globally kept. */
        this.kept = false;
        this.isDisposedInternal = false;
        this.shape = shape.slice();
        this.dtype = dtype || 'float32';
        this.size = util.sizeFromShape(shape);
        this.strides = computeStrides(shape);
        this.dataId = dataId;
        this.id = id;
        this.rankType = (this.rank < 5 ? this.rank.toString() : 'higher');
    }
    get rank() {
        return this.shape.length;
    }
    /**
     * Returns a promise of `tf.TensorBuffer` that holds the underlying data.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    async buffer() {
        const vals = await this.data();
        return opHandler.buffer(this.shape, this.dtype, vals);
    }
    /**
     * Returns a `tf.TensorBuffer` that holds the underlying data.
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    bufferSync() {
        return opHandler.buffer(this.shape, this.dtype, this.dataSync());
    }
    /**
     * Returns the tensor data as a nested array. The transfer of data is done
     * asynchronously.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    async array() {
        const vals = await this.data();
        return toNestedArray(this.shape, vals, this.dtype === 'complex64');
    }
    /**
     * Returns the tensor data as a nested array. The transfer of data is done
     * synchronously.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    arraySync() {
        return toNestedArray(this.shape, this.dataSync(), this.dtype === 'complex64');
    }
    /**
     * Asynchronously downloads the values from the `tf.Tensor`. Returns a
     * promise of `TypedArray` that resolves when the computation has finished.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    async data() {
        this.throwIfDisposed();
        const data = trackerFn().read(this.dataId);
        if (this.dtype === 'string') {
            const bytes = await data;
            try {
                return bytes.map(b => util.decodeString(b));
            }
            catch (_a) {
                throw new Error('Failed to decode the string bytes into utf-8. ' +
                    'To get the original bytes, call tensor.bytes().');
            }
        }
        return data;
    }
    /**
     * Copy the tensor's data to a new GPU resource. Comparing to the `dataSync()`
     * and `data()`, this method prevents data from being downloaded to CPU.
     *
     * For WebGL backend, the data will be stored on a densely packed texture.
     * This means that the texture will use the RGBA channels to store value.
     *
     * For WebGPU backend, the data will be stored on a buffer. There is no
     * parameter, so can not use a user-defined size to create the buffer.
     *
     * @param options:
     *     For WebGL,
     *         - customTexShape: Optional. If set, will use the user defined
     *     texture shape to create the texture.
     *
     * @returns For WebGL backend, a GPUData contains the new texture and
     *     its information.
     *     {
     *        tensorRef: The tensor that is associated with this texture,
     *        texture: WebGLTexture,
     *        texShape: [number, number] // [height, width]
     *     }
     *
     *     For WebGPU backend, a GPUData contains the new buffer.
     *     {
     *        tensorRef: The tensor that is associated with this buffer,
     *        buffer: GPUBuffer,
     *     }
     *
     *     Remember to dispose the GPUData after it is used by
     *     `res.tensorRef.dispose()`.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    dataToGPU(options) {
        this.throwIfDisposed();
        return trackerFn().readToGPU(this.dataId, options);
    }
    /**
     * Synchronously downloads the values from the `tf.Tensor`. This blocks the
     * UI thread until the values are ready, which can cause performance issues.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    dataSync() {
        this.throwIfDisposed();
        const data = trackerFn().readSync(this.dataId);
        if (this.dtype === 'string') {
            try {
                return data.map(b => util.decodeString(b));
            }
            catch (_a) {
                throw new Error('Failed to decode the string bytes into utf-8. ' +
                    'To get the original bytes, call tensor.bytes().');
            }
        }
        return data;
    }
    /** Returns the underlying bytes of the tensor's data. */
    async bytes() {
        this.throwIfDisposed();
        const data = await trackerFn().read(this.dataId);
        if (this.dtype === 'string') {
            return data;
        }
        else {
            return new Uint8Array(data.buffer);
        }
    }
    /**
     * Disposes `tf.Tensor` from memory.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        if (this.kerasMask) {
            this.kerasMask.dispose();
        }
        trackerFn().disposeTensor(this);
        this.isDisposedInternal = true;
    }
    get isDisposed() {
        return this.isDisposedInternal;
    }
    throwIfDisposed() {
        if (this.isDisposed) {
            throw new Error(`Tensor is disposed.`);
        }
    }
    /**
     * Prints the `tf.Tensor`. See `tf.print` for details.
     *
     * @param verbose Whether to print verbose information about the tensor,
     *    including dtype and size.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    print(verbose = false) {
        return opHandler.print(this, verbose);
    }
    /**
     * Returns a copy of the tensor. See `tf.clone` for details.
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    clone() {
        this.throwIfDisposed();
        return opHandler.clone(this);
    }
    /**
     * Returns a human-readable description of the tensor. Useful for logging.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    toString(verbose = false) {
        const vals = this.dataSync();
        return tensorToString(vals, this.shape, this.dtype, verbose);
    }
    cast(dtype) {
        this.throwIfDisposed();
        return opHandler.cast(this, dtype);
    }
    variable(trainable = true, name, dtype) {
        this.throwIfDisposed();
        return trackerFn().makeVariable(this, trainable, name, dtype);
    }
}
Object.defineProperty(Tensor, Symbol.hasInstance, {
    value: (instance) => {
        // Implementation note: we should use properties of the object that will be
        // defined before the constructor body has finished executing (methods).
        // This is because when this code is transpiled by babel, babel will call
        // classCallCheck before the constructor body is run.
        // See https://github.com/tensorflow/tfjs/issues/3384 for backstory.
        return !!instance && instance.data != null && instance.dataSync != null &&
            instance.throwIfDisposed != null;
    }
});
export function getGlobalTensorClass() {
    // Use getGlobal so that we can augment the Tensor class across package
    // boundaries because the node resolution alg may result in different modules
    // being returned for this file depending on the path they are loaded from.
    return getGlobal('Tensor', () => {
        return Tensor;
    });
}
// Global side effect. Cache global reference to Tensor class
getGlobalTensorClass();
/**
 * A mutable `tf.Tensor`, useful for persisting state, e.g. for training.
 *
 * @doc {heading: 'Tensors', subheading: 'Classes'}
 */
export class Variable extends Tensor {
    constructor(initialValue, trainable, name, tensorId) {
        super(initialValue.shape, initialValue.dtype, initialValue.dataId, tensorId);
        this.trainable = trainable;
        this.name = name;
    }
    /**
     * Assign a new `tf.Tensor` to this variable. The new `tf.Tensor` must have
     * the same shape and dtype as the old `tf.Tensor`.
     *
     * @param newValue New tensor to be assigned to this variable.
     *
     * @doc {heading: 'Tensors', subheading: 'Classes'}
     */
    assign(newValue) {
        if (newValue.dtype !== this.dtype) {
            throw new Error(`dtype of the new value (${newValue.dtype}) and ` +
                `previous value (${this.dtype}) must match`);
        }
        if (!util.arraysEqual(newValue.shape, this.shape)) {
            throw new Error(`shape of the new value (${newValue.shape}) and ` +
                `previous value (${this.shape}) must match`);
        }
        trackerFn().disposeTensor(this);
        this.dataId = newValue.dataId;
        trackerFn().incRef(this, null /* backend */);
    }
    dispose() {
        trackerFn().disposeVariable(this);
        this.isDisposedInternal = true;
    }
}
Object.defineProperty(Variable, Symbol.hasInstance, {
    value: (instance) => {
        return instance instanceof Tensor && instance.assign != null &&
            instance.assign instanceof Function;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vdGZqcy1jb3JlL3NyYy90ZW5zb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUgseUVBQXlFO0FBQ3pFLDRDQUE0QztBQUU1QyxPQUFPLEVBQUMsU0FBUyxFQUFDLE1BQU0sZUFBZSxDQUFDO0FBQ3hDLE9BQU8sRUFBQyxjQUFjLEVBQUMsTUFBTSxpQkFBaUIsQ0FBQztBQUcvQyxPQUFPLEtBQUssSUFBSSxNQUFNLFFBQVEsQ0FBQztBQUMvQixPQUFPLEVBQUMsY0FBYyxFQUFFLGFBQWEsRUFBQyxNQUFNLFFBQVEsQ0FBQztBQVdyRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxPQUFPLFlBQVk7SUFNdkIsWUFBWSxLQUFrQixFQUFTLEtBQVEsRUFBRSxNQUF1QjtRQUFqQyxVQUFLLEdBQUwsS0FBSyxDQUFHO1FBQzdDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBaUIsQ0FBQztRQUMxQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFdEMsSUFBSSxNQUFNLElBQUksSUFBSSxFQUFFO1lBQ2xCLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FDUCxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksRUFDZixHQUFHLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEI7Z0JBQ3BELDBCQUEwQixJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQztTQUNsRDtRQUNELElBQUksS0FBSyxLQUFLLFdBQVcsRUFBRTtZQUN6QixNQUFNLElBQUksS0FBSyxDQUNYLGlFQUFpRTtnQkFDakUsaUVBQWlFO2dCQUNqRSw4QkFBOEIsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxDQUFDLE1BQU0sR0FB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TyxRQUFRLFlBQVksTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLElBQUksSUFBSTtZQUN4RCxRQUFRLENBQUMsTUFBTSxZQUFZLFFBQVEsQ0FBQztJQUMxQyxDQUFDO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIExMQy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vLyBXb3JrYXJvdW5kIGZvcjogaHR0cHM6Ly9naXRodWIuY29tL2JhemVsYnVpbGQvcnVsZXNfbm9kZWpzL2lzc3Vlcy8xMjY1XG4vLy8gPHJlZmVyZW5jZSB0eXBlcz1cIkB3ZWJncHUvdHlwZXMvZGlzdFwiIC8+XG5cbmltcG9ydCB7Z2V0R2xvYmFsfSBmcm9tICcuL2dsb2JhbF91dGlsJztcbmltcG9ydCB7dGVuc29yVG9TdHJpbmd9IGZyb20gJy4vdGVuc29yX2Zvcm1hdCc7XG5pbXBvcnQge0RhdGFJZCwgVGVuc29ySW5mb30gZnJvbSAnLi90ZW5zb3JfaW5mbyc7XG5pbXBvcnQge0FycmF5TWFwLCBCYWNrZW5kVmFsdWVzLCBEYXRhVHlwZSwgRGF0YVR5cGVNYXAsIERhdGFWYWx1ZXMsIE51bWVyaWNEYXRhVHlwZSwgUmFuaywgU2hhcGVNYXAsIFNpbmdsZVZhbHVlTWFwLCBUeXBlZEFycmF5fSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCAqIGFzIHV0aWwgZnJvbSAnLi91dGlsJztcbmltcG9ydCB7Y29tcHV0ZVN0cmlkZXMsIHRvTmVzdGVkQXJyYXl9IGZyb20gJy4vdXRpbCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVuc29yRGF0YTxEIGV4dGVuZHMgRGF0YVR5cGU+IHtcbiAgZGF0YUlkPzogRGF0YUlkO1xuICB2YWx1ZXM/OiBEYXRhVHlwZU1hcFtEXTtcbn1cblxuLy8gVGhpcyBpbnRlcmZhY2UgbWltaWNzIEtlcm5lbEJhY2tlbmQgKGluIGJhY2tlbmQudHMpLCB3aGljaCB3b3VsZCBjcmVhdGUgYVxuLy8gY2lyY3VsYXIgZGVwZW5kZW5jeSBpZiBpbXBvcnRlZC5cbmV4cG9ydCBpbnRlcmZhY2UgQmFja2VuZCB7fVxuXG4vKipcbiAqIEEgbXV0YWJsZSBvYmplY3QsIHNpbWlsYXIgdG8gYHRmLlRlbnNvcmAsIHRoYXQgYWxsb3dzIHVzZXJzIHRvIHNldCB2YWx1ZXNcbiAqIGF0IGxvY2F0aW9ucyBiZWZvcmUgY29udmVydGluZyB0byBhbiBpbW11dGFibGUgYHRmLlRlbnNvcmAuXG4gKlxuICogU2VlIGB0Zi5idWZmZXJgIGZvciBjcmVhdGluZyBhIHRlbnNvciBidWZmZXIuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW5zb3JCdWZmZXI8UiBleHRlbmRzIFJhbmssIEQgZXh0ZW5kcyBEYXRhVHlwZSA9ICdmbG9hdDMyJz4ge1xuICBzaXplOiBudW1iZXI7XG4gIHNoYXBlOiBTaGFwZU1hcFtSXTtcbiAgc3RyaWRlczogbnVtYmVyW107XG4gIHZhbHVlczogRGF0YVR5cGVNYXBbRF07XG5cbiAgY29uc3RydWN0b3Ioc2hhcGU6IFNoYXBlTWFwW1JdLCBwdWJsaWMgZHR5cGU6IEQsIHZhbHVlcz86IERhdGFUeXBlTWFwW0RdKSB7XG4gICAgdGhpcy5zaGFwZSA9IHNoYXBlLnNsaWNlKCkgYXMgU2hhcGVNYXBbUl07XG4gICAgdGhpcy5zaXplID0gdXRpbC5zaXplRnJvbVNoYXBlKHNoYXBlKTtcblxuICAgIGlmICh2YWx1ZXMgIT0gbnVsbCkge1xuICAgICAgY29uc3QgbiA9IHZhbHVlcy5sZW5ndGg7XG4gICAgICB1dGlsLmFzc2VydChcbiAgICAgICAgICBuID09PSB0aGlzLnNpemUsXG4gICAgICAgICAgKCkgPT4gYExlbmd0aCBvZiB2YWx1ZXMgJyR7bn0nIGRvZXMgbm90IG1hdGNoIHRoZSBzaXplIGAgK1xuICAgICAgICAgICAgICBgaW5mZXJyZWQgYnkgdGhlIHNoYXBlICcke3RoaXMuc2l6ZX0nLmApO1xuICAgIH1cbiAgICBpZiAoZHR5cGUgPT09ICdjb21wbGV4NjQnKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYGNvbXBsZXg2NCBkdHlwZSBUZW5zb3JCdWZmZXJzIGFyZSBub3Qgc3VwcG9ydGVkLiBQbGVhc2UgY3JlYXRlIGAgK1xuICAgICAgICAgIGBhIFRlbnNvckJ1ZmZlciBmb3IgdGhlIHJlYWwgYW5kIGltYWdpbmFyeSBwYXJ0cyBzZXBhcmF0ZWx5IGFuZCBgICtcbiAgICAgICAgICBgY2FsbCB0Zi5jb21wbGV4KHJlYWwsIGltYWcpLmApO1xuICAgIH1cbiAgICB0aGlzLnZhbHVlcyA9IHZhbHVlcyB8fCB1dGlsLmdldEFycmF5RnJvbURUeXBlKGR0eXBlLCB0aGlzLnNpemUpO1xuICAgIHRoaXMuc3RyaWRlcyA9IGNvbXB1dGVTdHJpZGVzKHNoYXBlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIGEgdmFsdWUgaW4gdGhlIGJ1ZmZlciBhdCBhIGdpdmVuIGxvY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gdmFsdWUgVGhlIHZhbHVlIHRvIHNldC5cbiAgICogQHBhcmFtIGxvY3MgIFRoZSBsb2NhdGlvbiBpbmRpY2VzLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdDcmVhdGlvbid9XG4gICAqL1xuICBzZXQodmFsdWU6IFNpbmdsZVZhbHVlTWFwW0RdLCAuLi5sb2NzOiBudW1iZXJbXSk6IHZvaWQge1xuICAgIGlmIChsb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbG9jcyA9IFswXTtcbiAgICB9XG4gICAgdXRpbC5hc3NlcnQoXG4gICAgICAgIGxvY3MubGVuZ3RoID09PSB0aGlzLnJhbmssXG4gICAgICAgICgpID0+IGBUaGUgbnVtYmVyIG9mIHByb3ZpZGVkIGNvb3JkaW5hdGVzICgke2xvY3MubGVuZ3RofSkgbXVzdCBgICtcbiAgICAgICAgICAgIGBtYXRjaCB0aGUgcmFuayAoJHt0aGlzLnJhbmt9KWApO1xuXG4gICAgY29uc3QgaW5kZXggPSB0aGlzLmxvY1RvSW5kZXgobG9jcyk7XG4gICAgdGhpcy52YWx1ZXNbaW5kZXhdID0gdmFsdWUgYXMgbnVtYmVyO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdGhlIHZhbHVlIGluIHRoZSBidWZmZXIgYXQgdGhlIHByb3ZpZGVkIGxvY2F0aW9uLlxuICAgKlxuICAgKiBAcGFyYW0gbG9jcyBUaGUgbG9jYXRpb24gaW5kaWNlcy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ3JlYXRpb24nfVxuICAgKi9cbiAgZ2V0KC4uLmxvY3M6IG51bWJlcltdKTogU2luZ2xlVmFsdWVNYXBbRF0ge1xuICAgIGlmIChsb2NzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgbG9jcyA9IFswXTtcbiAgICB9XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgbG9jIG9mIGxvY3MpIHtcbiAgICAgIGlmIChsb2MgPCAwIHx8IGxvYyA+PSB0aGlzLnNoYXBlW2ldKSB7XG4gICAgICAgIGNvbnN0IG1zZyA9IGBSZXF1ZXN0ZWQgb3V0IG9mIHJhbmdlIGVsZW1lbnQgYXQgJHtsb2NzfS4gYCArXG4gICAgICAgICAgICBgICBCdWZmZXIgc2hhcGU9JHt0aGlzLnNoYXBlfWA7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgaSsrO1xuICAgIH1cbiAgICBsZXQgaW5kZXggPSBsb2NzW2xvY3MubGVuZ3RoIC0gMV07XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb2NzLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgaW5kZXggKz0gdGhpcy5zdHJpZGVzW2ldICogbG9jc1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudmFsdWVzW2luZGV4XSBhcyBTaW5nbGVWYWx1ZU1hcFtEXTtcbiAgfVxuXG4gIGxvY1RvSW5kZXgobG9jczogbnVtYmVyW10pOiBudW1iZXIge1xuICAgIGlmICh0aGlzLnJhbmsgPT09IDApIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSBpZiAodGhpcy5yYW5rID09PSAxKSB7XG4gICAgICByZXR1cm4gbG9jc1swXTtcbiAgICB9XG4gICAgbGV0IGluZGV4ID0gbG9jc1tsb2NzLmxlbmd0aCAtIDFdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jcy5sZW5ndGggLSAxOyArK2kpIHtcbiAgICAgIGluZGV4ICs9IHRoaXMuc3RyaWRlc1tpXSAqIGxvY3NbaV07XG4gICAgfVxuICAgIHJldHVybiBpbmRleDtcbiAgfVxuXG4gIGluZGV4VG9Mb2MoaW5kZXg6IG51bWJlcik6IG51bWJlcltdIHtcbiAgICBpZiAodGhpcy5yYW5rID09PSAwKSB7XG4gICAgICByZXR1cm4gW107XG4gICAgfSBlbHNlIGlmICh0aGlzLnJhbmsgPT09IDEpIHtcbiAgICAgIHJldHVybiBbaW5kZXhdO1xuICAgIH1cbiAgICBjb25zdCBsb2NzOiBudW1iZXJbXSA9IG5ldyBBcnJheSh0aGlzLnNoYXBlLmxlbmd0aCk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsb2NzLmxlbmd0aCAtIDE7ICsraSkge1xuICAgICAgbG9jc1tpXSA9IE1hdGguZmxvb3IoaW5kZXggLyB0aGlzLnN0cmlkZXNbaV0pO1xuICAgICAgaW5kZXggLT0gbG9jc1tpXSAqIHRoaXMuc3RyaWRlc1tpXTtcbiAgICB9XG4gICAgbG9jc1tsb2NzLmxlbmd0aCAtIDFdID0gaW5kZXg7XG4gICAgcmV0dXJuIGxvY3M7XG4gIH1cblxuICBnZXQgcmFuaygpIHtcbiAgICByZXR1cm4gdGhpcy5zaGFwZS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBpbW11dGFibGUgYHRmLlRlbnNvcmAgb2JqZWN0IGZyb20gdGhlIGJ1ZmZlci5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ3JlYXRpb24nfVxuICAgKi9cbiAgdG9UZW5zb3IoKTogVGVuc29yPFI+IHtcbiAgICByZXR1cm4gdHJhY2tlckZuKCkubWFrZVRlbnNvcih0aGlzLnZhbHVlcywgdGhpcy5zaGFwZSwgdGhpcy5kdHlwZSkgYXNcbiAgICAgICAgVGVuc29yPFI+O1xuICB9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YVRvR1BVV2ViR0xPcHRpb24ge1xuICBjdXN0b21UZXhTaGFwZT86IFtudW1iZXIsIG51bWJlcl07XG59XG5cbmV4cG9ydCB0eXBlIERhdGFUb0dQVU9wdGlvbnMgPSBEYXRhVG9HUFVXZWJHTE9wdGlvbjtcblxuZXhwb3J0IGludGVyZmFjZSBHUFVEYXRhIHtcbiAgdGVuc29yUmVmOiBUZW5zb3I7XG4gIHRleHR1cmU/OiBXZWJHTFRleHR1cmU7XG4gIGJ1ZmZlcj86IEdQVUJ1ZmZlcjtcbiAgdGV4U2hhcGU/OiBbbnVtYmVyLCBudW1iZXJdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRlbnNvclRyYWNrZXIge1xuICBtYWtlVGVuc29yKFxuICAgICAgdmFsdWVzOiBEYXRhVmFsdWVzLCBzaGFwZTogbnVtYmVyW10sIGR0eXBlOiBEYXRhVHlwZSxcbiAgICAgIGJhY2tlbmQ/OiBCYWNrZW5kKTogVGVuc29yO1xuICBtYWtlVmFyaWFibGUoXG4gICAgICBpbml0aWFsVmFsdWU6IFRlbnNvciwgdHJhaW5hYmxlPzogYm9vbGVhbiwgbmFtZT86IHN0cmluZyxcbiAgICAgIGR0eXBlPzogRGF0YVR5cGUpOiBWYXJpYWJsZTtcbiAgaW5jUmVmKGE6IFRlbnNvciwgYmFja2VuZDogQmFja2VuZCk6IHZvaWQ7XG4gIGRpc3Bvc2VUZW5zb3IodDogVGVuc29yKTogdm9pZDtcbiAgZGlzcG9zZVZhcmlhYmxlKHY6IFZhcmlhYmxlKTogdm9pZDtcbiAgcmVhZChkYXRhSWQ6IERhdGFJZCk6IFByb21pc2U8QmFja2VuZFZhbHVlcz47XG4gIHJlYWRTeW5jKGRhdGFJZDogRGF0YUlkKTogQmFja2VuZFZhbHVlcztcbiAgcmVhZFRvR1BVKGRhdGFJZDogRGF0YUlkLCBvcHRpb25zPzogRGF0YVRvR1BVT3B0aW9ucyk6IEdQVURhdGE7XG59XG5cbi8qKlxuICogVGhlIFRlbnNvciBjbGFzcyBjYWxscyBpbnRvIHRoaXMgaGFuZGxlciB0byBkZWxlZ2F0ZSBjaGFpbmluZyBvcGVyYXRpb25zLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9wSGFuZGxlciB7XG4gIGNhc3Q8VCBleHRlbmRzIFRlbnNvcj4oeDogVCwgZHR5cGU6IERhdGFUeXBlKTogVDtcbiAgYnVmZmVyPFIgZXh0ZW5kcyBSYW5rLCBEIGV4dGVuZHMgRGF0YVR5cGU+KFxuICAgICAgc2hhcGU6IFNoYXBlTWFwW1JdLCBkdHlwZTogRCxcbiAgICAgIHZhbHVlcz86IERhdGFUeXBlTWFwW0RdKTogVGVuc29yQnVmZmVyPFIsIEQ+O1xuICBwcmludDxUIGV4dGVuZHMgVGVuc29yPih4OiBULCB2ZXJib3NlOiBib29sZWFuKTogdm9pZDtcbiAgY2xvbmU8VCBleHRlbmRzIFRlbnNvcj4oeDogVCk6IFQ7XG4gIC8vIFRPRE8oeWFzc29nYmEpIGJyaW5nIHJlc2hhcGUgYmFjaz9cbn1cblxuLy8gRm9yIHRyYWNraW5nIHRlbnNvciBjcmVhdGlvbiBhbmQgZGlzcG9zYWwuXG5sZXQgdHJhY2tlckZuOiAoKSA9PiBUZW5zb3JUcmFja2VyID0gbnVsbDtcbi8vIFVzZWQgYnkgY2hhaW5pbmcgbWV0aG9kcyB0byBjYWxsIGludG8gb3BzLlxubGV0IG9wSGFuZGxlcjogT3BIYW5kbGVyID0gbnVsbDtcbi8vIFVzZWQgdG8gd2FybiBhYm91dCBkZXByZWNhdGVkIG1ldGhvZHMuXG5sZXQgZGVwcmVjYXRpb25XYXJuaW5nRm46IChtc2c6IHN0cmluZykgPT4gdm9pZCA9IG51bGw7XG4vLyBUaGlzIGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoaXMgbWV0aG9kIG9uIGRldiBicmFuY2hlcyBhbmQga2VlcCB0aGVcbi8vIGZ1bmN0aW9uYWxpdHkgYXQgbWFzdGVyLlxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXVudXNlZC1leHByZXNzaW9uXG5bZGVwcmVjYXRpb25XYXJuaW5nRm5dO1xuXG4vKipcbiAqIEFuIGV4dGVybmFsIGNvbnN1bWVyIGNhbiByZWdpc3RlciBpdHNlbGYgYXMgdGhlIHRlbnNvciB0cmFja2VyLiBUaGlzIHdheVxuICogdGhlIFRlbnNvciBjbGFzcyBjYW4gbm90aWZ5IHRoZSB0cmFja2VyIGZvciBldmVyeSB0ZW5zb3IgY3JlYXRlZCBhbmRcbiAqIGRpc3Bvc2VkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VGVuc29yVHJhY2tlcihmbjogKCkgPT4gVGVuc29yVHJhY2tlcikge1xuICB0cmFja2VyRm4gPSBmbjtcbn1cblxuLyoqXG4gKiBBbiBleHRlcm5hbCBjb25zdW1lciBjYW4gcmVnaXN0ZXIgaXRzZWxmIGFzIHRoZSBvcCBoYW5kbGVyLiBUaGlzIHdheSB0aGVcbiAqIFRlbnNvciBjbGFzcyBjYW4gaGF2ZSBjaGFpbmluZyBtZXRob2RzIHRoYXQgY2FsbCBpbnRvIG9wcyB2aWEgdGhlIG9wXG4gKiBoYW5kbGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0T3BIYW5kbGVyKGhhbmRsZXI6IE9wSGFuZGxlcikge1xuICBvcEhhbmRsZXIgPSBoYW5kbGVyO1xufVxuXG4vKipcbiAqIFNldHMgdGhlIGRlcHJlY2F0aW9uIHdhcm5pbmcgZnVuY3Rpb24gdG8gYmUgdXNlZCBieSB0aGlzIGZpbGUuIFRoaXMgd2F5IHRoZVxuICogVGVuc29yIGNsYXNzIGNhbiBiZSBhIGxlYWYgYnV0IHN0aWxsIHVzZSB0aGUgZW52aXJvbm1lbnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXREZXByZWNhdGlvbldhcm5pbmdGbihmbjogKG1zZzogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGRlcHJlY2F0aW9uV2FybmluZ0ZuID0gZm47XG59XG5cbi8vIERlY2xhcmUgdGhpcyBuYW1lc3BhY2UgdG8gbWFrZSBUZW5zb3IgY2xhc3MgYXVnbWVudGF0aW9uIHdvcmsgaW4gZ29vZ2xlMy5cbmV4cG9ydCBkZWNsYXJlIG5hbWVzcGFjZSBUZW5zb3Ige31cbi8qKlxuICogQSBgdGYuVGVuc29yYCBvYmplY3QgcmVwcmVzZW50cyBhbiBpbW11dGFibGUsIG11bHRpZGltZW5zaW9uYWwgYXJyYXkgb2ZcbiAqIG51bWJlcnMgdGhhdCBoYXMgYSBzaGFwZSBhbmQgYSBkYXRhIHR5cGUuXG4gKlxuICogRm9yIHBlcmZvcm1hbmNlIHJlYXNvbnMsIGZ1bmN0aW9ucyB0aGF0IGNyZWF0ZSB0ZW5zb3JzIGRvIG5vdCBuZWNlc3NhcmlseVxuICogcGVyZm9ybSBhIGNvcHkgb2YgdGhlIGRhdGEgcGFzc2VkIHRvIHRoZW0gKGUuZy4gaWYgdGhlIGRhdGEgaXMgcGFzc2VkIGFzIGFcbiAqIGBGbG9hdDMyQXJyYXlgKSwgYW5kIGNoYW5nZXMgdG8gdGhlIGRhdGEgd2lsbCBjaGFuZ2UgdGhlIHRlbnNvci4gVGhpcyBpcyBub3RcbiAqIGEgZmVhdHVyZSBhbmQgaXMgbm90IHN1cHBvcnRlZC4gVG8gYXZvaWQgdGhpcyBiZWhhdmlvciwgdXNlIHRoZSB0ZW5zb3IgYmVmb3JlXG4gKiBjaGFuZ2luZyB0aGUgaW5wdXQgZGF0YSBvciBjcmVhdGUgYSBjb3B5IHdpdGggYGNvcHkgPSB0Zi5hZGQoeW91clRlbnNvciwgMClgLlxuICpcbiAqIFNlZSBgdGYudGVuc29yYCBmb3IgZGV0YWlscyBvbiBob3cgdG8gY3JlYXRlIGEgYHRmLlRlbnNvcmAuXG4gKlxuICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gKi9cbmV4cG9ydCBjbGFzcyBUZW5zb3I8UiBleHRlbmRzIFJhbmsgPSBSYW5rPiBpbXBsZW1lbnRzIFRlbnNvckluZm8ge1xuICAvKiogVW5pcXVlIGlkIG9mIHRoaXMgdGVuc29yLiAqL1xuICByZWFkb25seSBpZDogbnVtYmVyO1xuICAvKipcbiAgICogSWQgb2YgdGhlIGJ1Y2tldCBob2xkaW5nIHRoZSBkYXRhIGZvciB0aGlzIHRlbnNvci4gTXVsdGlwbGUgYXJyYXlzIGNhblxuICAgKiBwb2ludCB0byB0aGUgc2FtZSBidWNrZXQgKGUuZy4gd2hlbiBjYWxsaW5nIGFycmF5LnJlc2hhcGUoKSkuXG4gICAqL1xuICBkYXRhSWQ6IERhdGFJZDtcbiAgLyoqIFRoZSBzaGFwZSBvZiB0aGUgdGVuc29yLiAqL1xuICByZWFkb25seSBzaGFwZTogU2hhcGVNYXBbUl07XG4gIC8qKiBOdW1iZXIgb2YgZWxlbWVudHMgaW4gdGhlIHRlbnNvci4gKi9cbiAgcmVhZG9ubHkgc2l6ZTogbnVtYmVyO1xuICAvKiogVGhlIGRhdGEgdHlwZSBmb3IgdGhlIGFycmF5LiAqL1xuICByZWFkb25seSBkdHlwZTogRGF0YVR5cGU7XG4gIC8qKiBUaGUgcmFuayB0eXBlIGZvciB0aGUgYXJyYXkgKHNlZSBgUmFua2AgZW51bSkuICovXG4gIHJlYWRvbmx5IHJhbmtUeXBlOiBSO1xuXG4gIC8qKiBXaGV0aGVyIHRoaXMgdGVuc29yIGhhcyBiZWVuIGdsb2JhbGx5IGtlcHQuICovXG4gIGtlcHQgPSBmYWxzZTtcbiAgLyoqIFRoZSBpZCBvZiB0aGUgc2NvcGUgdGhpcyB0ZW5zb3IgaXMgYmVpbmcgdHJhY2tlZCBpbi4gKi9cbiAgc2NvcGVJZDogbnVtYmVyO1xuICAvKiogVGhlIGtlcmFzIG1hc2sgdGhhdCBzb21lIGtlcmFzIGxheWVycyBhdHRhY2ggdG8gdGhlIHRlbnNvciAqL1xuICBrZXJhc01hc2s/OiBUZW5zb3I7XG5cbiAgLyoqXG4gICAqIE51bWJlciBvZiBlbGVtZW50cyB0byBza2lwIGluIGVhY2ggZGltZW5zaW9uIHdoZW4gaW5kZXhpbmcuIFNlZVxuICAgKiBodHRwczovL2RvY3Muc2NpcHkub3JnL2RvYy9udW1weS9yZWZlcmVuY2UvZ2VuZXJhdGVkL1xcXG4gICAqIG51bXB5Lm5kYXJyYXkuc3RyaWRlcy5odG1sXG4gICAqL1xuICByZWFkb25seSBzdHJpZGVzOiBudW1iZXJbXTtcblxuICBjb25zdHJ1Y3RvcihzaGFwZTogU2hhcGVNYXBbUl0sIGR0eXBlOiBEYXRhVHlwZSwgZGF0YUlkOiBEYXRhSWQsIGlkOiBudW1iZXIpIHtcbiAgICB0aGlzLnNoYXBlID0gc2hhcGUuc2xpY2UoKSBhcyBTaGFwZU1hcFtSXTtcbiAgICB0aGlzLmR0eXBlID0gZHR5cGUgfHwgJ2Zsb2F0MzInO1xuICAgIHRoaXMuc2l6ZSA9IHV0aWwuc2l6ZUZyb21TaGFwZShzaGFwZSk7XG4gICAgdGhpcy5zdHJpZGVzID0gY29tcHV0ZVN0cmlkZXMoc2hhcGUpO1xuICAgIHRoaXMuZGF0YUlkID0gZGF0YUlkO1xuICAgIHRoaXMuaWQgPSBpZDtcbiAgICB0aGlzLnJhbmtUeXBlID0gKHRoaXMucmFuayA8IDUgPyB0aGlzLnJhbmsudG9TdHJpbmcoKSA6ICdoaWdoZXInKSBhcyBSO1xuICB9XG5cbiAgZ2V0IHJhbmsoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5zaGFwZS5sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIHByb21pc2Ugb2YgYHRmLlRlbnNvckJ1ZmZlcmAgdGhhdCBob2xkcyB0aGUgdW5kZXJseWluZyBkYXRhLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAgICovXG4gIGFzeW5jIGJ1ZmZlcjxEIGV4dGVuZHMgRGF0YVR5cGUgPSAnZmxvYXQzMic+KCk6IFByb21pc2U8VGVuc29yQnVmZmVyPFIsIEQ+PiB7XG4gICAgY29uc3QgdmFscyA9IGF3YWl0IHRoaXMuZGF0YTxEPigpO1xuICAgIHJldHVybiBvcEhhbmRsZXIuYnVmZmVyKHRoaXMuc2hhcGUsIHRoaXMuZHR5cGUgYXMgRCwgdmFscyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGB0Zi5UZW5zb3JCdWZmZXJgIHRoYXQgaG9sZHMgdGhlIHVuZGVybHlpbmcgZGF0YS5cbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBidWZmZXJTeW5jPEQgZXh0ZW5kcyBEYXRhVHlwZSA9ICdmbG9hdDMyJz4oKTogVGVuc29yQnVmZmVyPFIsIEQ+IHtcbiAgICByZXR1cm4gb3BIYW5kbGVyLmJ1ZmZlcih0aGlzLnNoYXBlLCB0aGlzLmR0eXBlIGFzIEQsIHRoaXMuZGF0YVN5bmMoKSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgdGVuc29yIGRhdGEgYXMgYSBuZXN0ZWQgYXJyYXkuIFRoZSB0cmFuc2ZlciBvZiBkYXRhIGlzIGRvbmVcbiAgICogYXN5bmNocm9ub3VzbHkuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdUZW5zb3JzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgYXN5bmMgYXJyYXkoKTogUHJvbWlzZTxBcnJheU1hcFtSXT4ge1xuICAgIGNvbnN0IHZhbHMgPSBhd2FpdCB0aGlzLmRhdGEoKTtcbiAgICByZXR1cm4gdG9OZXN0ZWRBcnJheSh0aGlzLnNoYXBlLCB2YWxzLCB0aGlzLmR0eXBlID09PSAnY29tcGxleDY0JykgYXNcbiAgICAgICAgQXJyYXlNYXBbUl07XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0aGUgdGVuc29yIGRhdGEgYXMgYSBuZXN0ZWQgYXJyYXkuIFRoZSB0cmFuc2ZlciBvZiBkYXRhIGlzIGRvbmVcbiAgICogc3luY2hyb25vdXNseS5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBhcnJheVN5bmMoKTogQXJyYXlNYXBbUl0ge1xuICAgIHJldHVybiB0b05lc3RlZEFycmF5KFxuICAgICAgICAgICAgICAgdGhpcy5zaGFwZSwgdGhpcy5kYXRhU3luYygpLCB0aGlzLmR0eXBlID09PSAnY29tcGxleDY0JykgYXNcbiAgICAgICAgQXJyYXlNYXBbUl07XG4gIH1cblxuICAvKipcbiAgICogQXN5bmNocm9ub3VzbHkgZG93bmxvYWRzIHRoZSB2YWx1ZXMgZnJvbSB0aGUgYHRmLlRlbnNvcmAuIFJldHVybnMgYVxuICAgKiBwcm9taXNlIG9mIGBUeXBlZEFycmF5YCB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIGNvbXB1dGF0aW9uIGhhcyBmaW5pc2hlZC5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBhc3luYyBkYXRhPEQgZXh0ZW5kcyBEYXRhVHlwZSA9IE51bWVyaWNEYXRhVHlwZT4oKTogUHJvbWlzZTxEYXRhVHlwZU1hcFtEXT4ge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgY29uc3QgZGF0YSA9IHRyYWNrZXJGbigpLnJlYWQodGhpcy5kYXRhSWQpO1xuICAgIGlmICh0aGlzLmR0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgY29uc3QgYnl0ZXMgPSBhd2FpdCBkYXRhIGFzIFVpbnQ4QXJyYXlbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBieXRlcy5tYXAoYiA9PiB1dGlsLmRlY29kZVN0cmluZyhiKSkgYXMgRGF0YVR5cGVNYXBbRF07XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgJ0ZhaWxlZCB0byBkZWNvZGUgdGhlIHN0cmluZyBieXRlcyBpbnRvIHV0Zi04LiAnICtcbiAgICAgICAgICAgICdUbyBnZXQgdGhlIG9yaWdpbmFsIGJ5dGVzLCBjYWxsIHRlbnNvci5ieXRlcygpLicpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YSBhcyBQcm9taXNlPERhdGFUeXBlTWFwW0RdPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb3B5IHRoZSB0ZW5zb3IncyBkYXRhIHRvIGEgbmV3IEdQVSByZXNvdXJjZS4gQ29tcGFyaW5nIHRvIHRoZSBgZGF0YVN5bmMoKWBcbiAgICogYW5kIGBkYXRhKClgLCB0aGlzIG1ldGhvZCBwcmV2ZW50cyBkYXRhIGZyb20gYmVpbmcgZG93bmxvYWRlZCB0byBDUFUuXG4gICAqXG4gICAqIEZvciBXZWJHTCBiYWNrZW5kLCB0aGUgZGF0YSB3aWxsIGJlIHN0b3JlZCBvbiBhIGRlbnNlbHkgcGFja2VkIHRleHR1cmUuXG4gICAqIFRoaXMgbWVhbnMgdGhhdCB0aGUgdGV4dHVyZSB3aWxsIHVzZSB0aGUgUkdCQSBjaGFubmVscyB0byBzdG9yZSB2YWx1ZS5cbiAgICpcbiAgICogRm9yIFdlYkdQVSBiYWNrZW5kLCB0aGUgZGF0YSB3aWxsIGJlIHN0b3JlZCBvbiBhIGJ1ZmZlci4gVGhlcmUgaXMgbm9cbiAgICogcGFyYW1ldGVyLCBzbyBjYW4gbm90IHVzZSBhIHVzZXItZGVmaW5lZCBzaXplIHRvIGNyZWF0ZSB0aGUgYnVmZmVyLlxuICAgKlxuICAgKiBAcGFyYW0gb3B0aW9uczpcbiAgICogICAgIEZvciBXZWJHTCxcbiAgICogICAgICAgICAtIGN1c3RvbVRleFNoYXBlOiBPcHRpb25hbC4gSWYgc2V0LCB3aWxsIHVzZSB0aGUgdXNlciBkZWZpbmVkXG4gICAqICAgICB0ZXh0dXJlIHNoYXBlIHRvIGNyZWF0ZSB0aGUgdGV4dHVyZS5cbiAgICpcbiAgICogQHJldHVybnMgRm9yIFdlYkdMIGJhY2tlbmQsIGEgR1BVRGF0YSBjb250YWlucyB0aGUgbmV3IHRleHR1cmUgYW5kXG4gICAqICAgICBpdHMgaW5mb3JtYXRpb24uXG4gICAqICAgICB7XG4gICAqICAgICAgICB0ZW5zb3JSZWY6IFRoZSB0ZW5zb3IgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggdGhpcyB0ZXh0dXJlLFxuICAgKiAgICAgICAgdGV4dHVyZTogV2ViR0xUZXh0dXJlLFxuICAgKiAgICAgICAgdGV4U2hhcGU6IFtudW1iZXIsIG51bWJlcl0gLy8gW2hlaWdodCwgd2lkdGhdXG4gICAqICAgICB9XG4gICAqXG4gICAqICAgICBGb3IgV2ViR1BVIGJhY2tlbmQsIGEgR1BVRGF0YSBjb250YWlucyB0aGUgbmV3IGJ1ZmZlci5cbiAgICogICAgIHtcbiAgICogICAgICAgIHRlbnNvclJlZjogVGhlIHRlbnNvciB0aGF0IGlzIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGJ1ZmZlcixcbiAgICogICAgICAgIGJ1ZmZlcjogR1BVQnVmZmVyLFxuICAgKiAgICAgfVxuICAgKlxuICAgKiAgICAgUmVtZW1iZXIgdG8gZGlzcG9zZSB0aGUgR1BVRGF0YSBhZnRlciBpdCBpcyB1c2VkIGJ5XG4gICAqICAgICBgcmVzLnRlbnNvclJlZi5kaXNwb3NlKClgLlxuICAgKlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAgICovXG4gIGRhdGFUb0dQVShvcHRpb25zPzogRGF0YVRvR1BVT3B0aW9ucyk6IEdQVURhdGEge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgcmV0dXJuIHRyYWNrZXJGbigpLnJlYWRUb0dQVSh0aGlzLmRhdGFJZCwgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogU3luY2hyb25vdXNseSBkb3dubG9hZHMgdGhlIHZhbHVlcyBmcm9tIHRoZSBgdGYuVGVuc29yYC4gVGhpcyBibG9ja3MgdGhlXG4gICAqIFVJIHRocmVhZCB1bnRpbCB0aGUgdmFsdWVzIGFyZSByZWFkeSwgd2hpY2ggY2FuIGNhdXNlIHBlcmZvcm1hbmNlIGlzc3Vlcy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBkYXRhU3luYzxEIGV4dGVuZHMgRGF0YVR5cGUgPSBOdW1lcmljRGF0YVR5cGU+KCk6IERhdGFUeXBlTWFwW0RdIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIGNvbnN0IGRhdGEgPSB0cmFja2VyRm4oKS5yZWFkU3luYyh0aGlzLmRhdGFJZCk7XG4gICAgaWYgKHRoaXMuZHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gKGRhdGEgYXMgVWludDhBcnJheVtdKS5tYXAoYiA9PiB1dGlsLmRlY29kZVN0cmluZyhiKSkgYXNcbiAgICAgICAgICAgIERhdGFUeXBlTWFwW0RdO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdGYWlsZWQgdG8gZGVjb2RlIHRoZSBzdHJpbmcgYnl0ZXMgaW50byB1dGYtOC4gJyArXG4gICAgICAgICAgICAnVG8gZ2V0IHRoZSBvcmlnaW5hbCBieXRlcywgY2FsbCB0ZW5zb3IuYnl0ZXMoKS4nKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGEgYXMgRGF0YVR5cGVNYXBbRF07XG4gIH1cblxuICAvKiogUmV0dXJucyB0aGUgdW5kZXJseWluZyBieXRlcyBvZiB0aGUgdGVuc29yJ3MgZGF0YS4gKi9cbiAgYXN5bmMgYnl0ZXMoKTogUHJvbWlzZTxVaW50OEFycmF5W118VWludDhBcnJheT4ge1xuICAgIHRoaXMudGhyb3dJZkRpc3Bvc2VkKCk7XG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IHRyYWNrZXJGbigpLnJlYWQodGhpcy5kYXRhSWQpO1xuICAgIGlmICh0aGlzLmR0eXBlID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIGRhdGEgYXMgVWludDhBcnJheVtdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoKGRhdGEgYXMgVHlwZWRBcnJheSkuYnVmZmVyKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlzcG9zZXMgYHRmLlRlbnNvcmAgZnJvbSBtZW1vcnkuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdUZW5zb3JzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5pc0Rpc3Bvc2VkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICh0aGlzLmtlcmFzTWFzaykge1xuICAgICAgdGhpcy5rZXJhc01hc2suZGlzcG9zZSgpO1xuICAgIH1cbiAgICB0cmFja2VyRm4oKS5kaXNwb3NlVGVuc29yKHRoaXMpO1xuICAgIHRoaXMuaXNEaXNwb3NlZEludGVybmFsID0gdHJ1ZTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpc0Rpc3Bvc2VkSW50ZXJuYWwgPSBmYWxzZTtcbiAgZ2V0IGlzRGlzcG9zZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuaXNEaXNwb3NlZEludGVybmFsO1xuICB9XG5cbiAgdGhyb3dJZkRpc3Bvc2VkKCkge1xuICAgIGlmICh0aGlzLmlzRGlzcG9zZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgVGVuc29yIGlzIGRpc3Bvc2VkLmApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQcmludHMgdGhlIGB0Zi5UZW5zb3JgLiBTZWUgYHRmLnByaW50YCBmb3IgZGV0YWlscy5cbiAgICpcbiAgICogQHBhcmFtIHZlcmJvc2UgV2hldGhlciB0byBwcmludCB2ZXJib3NlIGluZm9ybWF0aW9uIGFib3V0IHRoZSB0ZW5zb3IsXG4gICAqICAgIGluY2x1ZGluZyBkdHlwZSBhbmQgc2l6ZS5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICBwcmludCh2ZXJib3NlID0gZmFsc2UpOiB2b2lkIHtcbiAgICByZXR1cm4gb3BIYW5kbGVyLnByaW50KHRoaXMsIHZlcmJvc2UpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSB0ZW5zb3IuIFNlZSBgdGYuY2xvbmVgIGZvciBkZXRhaWxzLlxuICAgKiBAZG9jIHtoZWFkaW5nOiAnVGVuc29ycycsIHN1YmhlYWRpbmc6ICdDbGFzc2VzJ31cbiAgICovXG4gIGNsb25lPFQgZXh0ZW5kcyBUZW5zb3I+KHRoaXM6IFQpOiBUIHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHJldHVybiBvcEhhbmRsZXIuY2xvbmUodGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyBhIGh1bWFuLXJlYWRhYmxlIGRlc2NyaXB0aW9uIG9mIHRoZSB0ZW5zb3IuIFVzZWZ1bCBmb3IgbG9nZ2luZy5cbiAgICpcbiAgICogQGRvYyB7aGVhZGluZzogJ1RlbnNvcnMnLCBzdWJoZWFkaW5nOiAnQ2xhc3Nlcyd9XG4gICAqL1xuICB0b1N0cmluZyh2ZXJib3NlID0gZmFsc2UpOiBzdHJpbmcge1xuICAgIGNvbnN0IHZhbHMgPSB0aGlzLmRhdGFTeW5jKCk7XG4gICAgcmV0dXJuIHRlbnNvclRvU3RyaW5nKHZhbHMsIHRoaXMuc2hhcGUsIHRoaXMuZHR5cGUsIHZlcmJvc2UpO1xuICB9XG5cbiAgY2FzdDxUIGV4dGVuZHMgdGhpcz4oZHR5cGU6IERhdGFUeXBlKTogVCB7XG4gICAgdGhpcy50aHJvd0lmRGlzcG9zZWQoKTtcbiAgICByZXR1cm4gb3BIYW5kbGVyLmNhc3QodGhpcyBhcyBULCBkdHlwZSk7XG4gIH1cbiAgdmFyaWFibGUodHJhaW5hYmxlID0gdHJ1ZSwgbmFtZT86IHN0cmluZywgZHR5cGU/OiBEYXRhVHlwZSk6IFZhcmlhYmxlPFI+IHtcbiAgICB0aGlzLnRocm93SWZEaXNwb3NlZCgpO1xuICAgIHJldHVybiB0cmFja2VyRm4oKS5tYWtlVmFyaWFibGUodGhpcywgdHJhaW5hYmxlLCBuYW1lLCBkdHlwZSkgYXNcbiAgICAgICAgVmFyaWFibGU8Uj47XG4gIH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFRlbnNvciwgU3ltYm9sLmhhc0luc3RhbmNlLCB7XG4gIHZhbHVlOiAoaW5zdGFuY2U6IFRlbnNvcikgPT4ge1xuICAgIC8vIEltcGxlbWVudGF0aW9uIG5vdGU6IHdlIHNob3VsZCB1c2UgcHJvcGVydGllcyBvZiB0aGUgb2JqZWN0IHRoYXQgd2lsbCBiZVxuICAgIC8vIGRlZmluZWQgYmVmb3JlIHRoZSBjb25zdHJ1Y3RvciBib2R5IGhhcyBmaW5pc2hlZCBleGVjdXRpbmcgKG1ldGhvZHMpLlxuICAgIC8vIFRoaXMgaXMgYmVjYXVzZSB3aGVuIHRoaXMgY29kZSBpcyB0cmFuc3BpbGVkIGJ5IGJhYmVsLCBiYWJlbCB3aWxsIGNhbGxcbiAgICAvLyBjbGFzc0NhbGxDaGVjayBiZWZvcmUgdGhlIGNvbnN0cnVjdG9yIGJvZHkgaXMgcnVuLlxuICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy8zMzg0IGZvciBiYWNrc3RvcnkuXG4gICAgcmV0dXJuICEhaW5zdGFuY2UgJiYgaW5zdGFuY2UuZGF0YSAhPSBudWxsICYmIGluc3RhbmNlLmRhdGFTeW5jICE9IG51bGwgJiZcbiAgICAgICAgaW5zdGFuY2UudGhyb3dJZkRpc3Bvc2VkICE9IG51bGw7XG4gIH1cbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0R2xvYmFsVGVuc29yQ2xhc3MoKSB7XG4gIC8vIFVzZSBnZXRHbG9iYWwgc28gdGhhdCB3ZSBjYW4gYXVnbWVudCB0aGUgVGVuc29yIGNsYXNzIGFjcm9zcyBwYWNrYWdlXG4gIC8vIGJvdW5kYXJpZXMgYmVjYXVzZSB0aGUgbm9kZSByZXNvbHV0aW9uIGFsZyBtYXkgcmVzdWx0IGluIGRpZmZlcmVudCBtb2R1bGVzXG4gIC8vIGJlaW5nIHJldHVybmVkIGZvciB0aGlzIGZpbGUgZGVwZW5kaW5nIG9uIHRoZSBwYXRoIHRoZXkgYXJlIGxvYWRlZCBmcm9tLlxuICByZXR1cm4gZ2V0R2xvYmFsKCdUZW5zb3InLCAoKSA9PiB7XG4gICAgcmV0dXJuIFRlbnNvcjtcbiAgfSk7XG59XG5cbi8vIEdsb2JhbCBzaWRlIGVmZmVjdC4gQ2FjaGUgZ2xvYmFsIHJlZmVyZW5jZSB0byBUZW5zb3IgY2xhc3NcbmdldEdsb2JhbFRlbnNvckNsYXNzKCk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnVtZXJpY1RlbnNvcjxSIGV4dGVuZHMgUmFuayA9IFJhbms+IGV4dGVuZHMgVGVuc29yPFI+IHtcbiAgZHR5cGU6IE51bWVyaWNEYXRhVHlwZTtcbiAgZGF0YVN5bmM8RCBleHRlbmRzIERhdGFUeXBlID0gTnVtZXJpY0RhdGFUeXBlPigpOiBEYXRhVHlwZU1hcFtEXTtcbiAgZGF0YTxEIGV4dGVuZHMgRGF0YVR5cGUgPSBOdW1lcmljRGF0YVR5cGU+KCk6IFByb21pc2U8RGF0YVR5cGVNYXBbRF0+O1xuICBkYXRhVG9HUFUob3B0aW9ucz86IERhdGFUb0dQVU9wdGlvbnMpOiBHUFVEYXRhO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0cmluZ1RlbnNvcjxSIGV4dGVuZHMgUmFuayA9IFJhbms+IGV4dGVuZHMgVGVuc29yPFI+IHtcbiAgZHR5cGU6ICdzdHJpbmcnO1xuICBkYXRhU3luYzxEIGV4dGVuZHMgRGF0YVR5cGUgPSAnc3RyaW5nJz4oKTogRGF0YVR5cGVNYXBbRF07XG4gIGRhdGE8RCBleHRlbmRzIERhdGFUeXBlID0gJ3N0cmluZyc+KCk6IFByb21pc2U8RGF0YVR5cGVNYXBbRF0+O1xufVxuXG4vKiogQGRvY2xpbmsgVGVuc29yICovXG5leHBvcnQgdHlwZSBTY2FsYXIgPSBUZW5zb3I8UmFuay5SMD47XG4vKiogQGRvY2xpbmsgVGVuc29yICovXG5leHBvcnQgdHlwZSBUZW5zb3IxRCA9IFRlbnNvcjxSYW5rLlIxPjtcbi8qKiBAZG9jbGluayBUZW5zb3IgKi9cbmV4cG9ydCB0eXBlIFRlbnNvcjJEID0gVGVuc29yPFJhbmsuUjI+O1xuLyoqIEBkb2NsaW5rIFRlbnNvciAqL1xuZXhwb3J0IHR5cGUgVGVuc29yM0QgPSBUZW5zb3I8UmFuay5SMz47XG4vKiogQGRvY2xpbmsgVGVuc29yICovXG5leHBvcnQgdHlwZSBUZW5zb3I0RCA9IFRlbnNvcjxSYW5rLlI0Pjtcbi8qKiBAZG9jbGluayBUZW5zb3IgKi9cbmV4cG9ydCB0eXBlIFRlbnNvcjVEID0gVGVuc29yPFJhbmsuUjU+O1xuLyoqIEBkb2NsaW5rIFRlbnNvciAqL1xuZXhwb3J0IHR5cGUgVGVuc29yNkQgPSBUZW5zb3I8UmFuay5SNj47XG5cbi8qKlxuICogQSBtdXRhYmxlIGB0Zi5UZW5zb3JgLCB1c2VmdWwgZm9yIHBlcnNpc3Rpbmcgc3RhdGUsIGUuZy4gZm9yIHRyYWluaW5nLlxuICpcbiAqIEBkb2Mge2hlYWRpbmc6ICdUZW5zb3JzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICovXG5leHBvcnQgY2xhc3MgVmFyaWFibGU8UiBleHRlbmRzIFJhbmsgPSBSYW5rPiBleHRlbmRzIFRlbnNvcjxSPiB7XG4gIG5hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICAgIGluaXRpYWxWYWx1ZTogVGVuc29yPFI+LCBwdWJsaWMgdHJhaW5hYmxlOiBib29sZWFuLCBuYW1lOiBzdHJpbmcsXG4gICAgICB0ZW5zb3JJZDogbnVtYmVyKSB7XG4gICAgc3VwZXIoXG4gICAgICAgIGluaXRpYWxWYWx1ZS5zaGFwZSwgaW5pdGlhbFZhbHVlLmR0eXBlLCBpbml0aWFsVmFsdWUuZGF0YUlkLCB0ZW5zb3JJZCk7XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBc3NpZ24gYSBuZXcgYHRmLlRlbnNvcmAgdG8gdGhpcyB2YXJpYWJsZS4gVGhlIG5ldyBgdGYuVGVuc29yYCBtdXN0IGhhdmVcbiAgICogdGhlIHNhbWUgc2hhcGUgYW5kIGR0eXBlIGFzIHRoZSBvbGQgYHRmLlRlbnNvcmAuXG4gICAqXG4gICAqIEBwYXJhbSBuZXdWYWx1ZSBOZXcgdGVuc29yIHRvIGJlIGFzc2lnbmVkIHRvIHRoaXMgdmFyaWFibGUuXG4gICAqXG4gICAqIEBkb2Mge2hlYWRpbmc6ICdUZW5zb3JzJywgc3ViaGVhZGluZzogJ0NsYXNzZXMnfVxuICAgKi9cbiAgYXNzaWduKG5ld1ZhbHVlOiBUZW5zb3I8Uj4pOiB2b2lkIHtcbiAgICBpZiAobmV3VmFsdWUuZHR5cGUgIT09IHRoaXMuZHR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICBgZHR5cGUgb2YgdGhlIG5ldyB2YWx1ZSAoJHtuZXdWYWx1ZS5kdHlwZX0pIGFuZCBgICtcbiAgICAgICAgICBgcHJldmlvdXMgdmFsdWUgKCR7dGhpcy5kdHlwZX0pIG11c3QgbWF0Y2hgKTtcbiAgICB9XG4gICAgaWYgKCF1dGlsLmFycmF5c0VxdWFsKG5ld1ZhbHVlLnNoYXBlLCB0aGlzLnNoYXBlKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgIGBzaGFwZSBvZiB0aGUgbmV3IHZhbHVlICgke25ld1ZhbHVlLnNoYXBlfSkgYW5kIGAgK1xuICAgICAgICAgIGBwcmV2aW91cyB2YWx1ZSAoJHt0aGlzLnNoYXBlfSkgbXVzdCBtYXRjaGApO1xuICAgIH1cbiAgICB0cmFja2VyRm4oKS5kaXNwb3NlVGVuc29yKHRoaXMpO1xuICAgIHRoaXMuZGF0YUlkID0gbmV3VmFsdWUuZGF0YUlkO1xuICAgIHRyYWNrZXJGbigpLmluY1JlZih0aGlzLCBudWxsIC8qIGJhY2tlbmQgKi8pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZGlzcG9zZSgpOiB2b2lkIHtcbiAgICB0cmFja2VyRm4oKS5kaXNwb3NlVmFyaWFibGUodGhpcyk7XG4gICAgdGhpcy5pc0Rpc3Bvc2VkSW50ZXJuYWwgPSB0cnVlO1xuICB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShWYXJpYWJsZSwgU3ltYm9sLmhhc0luc3RhbmNlLCB7XG4gIHZhbHVlOiAoaW5zdGFuY2U6IFZhcmlhYmxlKSA9PiB7XG4gICAgcmV0dXJuIGluc3RhbmNlIGluc3RhbmNlb2YgVGVuc29yICYmIGluc3RhbmNlLmFzc2lnbiAhPSBudWxsICYmXG4gICAgICAgIGluc3RhbmNlLmFzc2lnbiBpbnN0YW5jZW9mIEZ1bmN0aW9uO1xuICB9XG59KTtcbiJdfQ==