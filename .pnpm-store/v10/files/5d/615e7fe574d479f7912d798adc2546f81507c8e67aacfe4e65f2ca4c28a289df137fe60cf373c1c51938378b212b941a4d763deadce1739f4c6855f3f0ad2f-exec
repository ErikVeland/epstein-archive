/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Use of this source code is governed by an MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 * =============================================================================
 */
/**
 * TensorFlow.js Layers: Basic Layers.
 */
import { any, cast, mul, notEqual, reshape, serialization, tidy, transpose, util } from '@tensorflow/tfjs-core';
import { getActivation, serializeActivation } from '../activations';
import * as K from '../backend/tfjs_backend';
import { getConstraint, serializeConstraint } from '../constraints';
import { InputSpec, Layer } from '../engine/topology';
import { ValueError } from '../errors';
import { getInitializer, serializeInitializer } from '../initializers';
import { getRegularizer, serializeRegularizer } from '../regularizers';
import { assertPositiveInteger, mapActivationToFusedKernel } from '../utils/generic_utils';
import { arrayProd, range } from '../utils/math_utils';
import { getExactlyOneShape, getExactlyOneTensor } from '../utils/types_utils';
class Dropout extends Layer {
    constructor(args) {
        super(args);
        this.rate = Math.max(Math.min(args.rate, 1), 0);
        // So that the scalar doesn't get tidied up between executions.
        this.noiseShape = args.noiseShape;
        this.seed = args.seed;
        this.supportsMasking = true;
    }
    getNoiseShape(input) {
        if (this.noiseShape == null) {
            return this.noiseShape;
        }
        const inputShape = input.shape;
        const noiseShape = [];
        for (let i = 0; i < this.noiseShape.length; ++i) {
            noiseShape.push(this.noiseShape[i] == null ? inputShape[i] : this.noiseShape[i]);
        }
        return noiseShape;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            if (0 < this.rate && this.rate < 1) {
                const training = kwargs['training'] == null ? false : kwargs['training'];
                const noiseShape = this.getNoiseShape(input);
                const output = K.inTrainPhase(() => K.dropout(input, this.rate, noiseShape, this.seed), () => input, training);
                return output;
            }
            return inputs;
        });
    }
    getConfig() {
        const config = {
            rate: this.rate,
            noiseShape: this.noiseShape,
            seed: this.seed,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    dispose() {
        return super.dispose();
    }
}
/** @nocollapse */
Dropout.className = 'Dropout';
export { Dropout };
serialization.registerClass(Dropout);
class SpatialDropout1D extends Dropout {
    constructor(args) {
        super(args);
        this.inputSpec = [{ ndim: 3 }];
    }
    getNoiseShape(input) {
        const inputShape = input.shape;
        return [inputShape[0], 1, inputShape[2]];
    }
}
/** @nocollapse */
SpatialDropout1D.className = 'SpatialDropout1D';
export { SpatialDropout1D };
serialization.registerClass(SpatialDropout1D);
class Dense extends Layer {
    constructor(args) {
        super(args);
        // Default activation: Linear (none).
        this.activation = null;
        this.useBias = true;
        this.kernel = null;
        this.bias = null;
        this.DEFAULT_KERNEL_INITIALIZER = 'glorotNormal';
        this.DEFAULT_BIAS_INITIALIZER = 'zeros';
        if (args.batchInputShape == null && args.inputShape == null &&
            args.inputDim != null) {
            // This logic is copied from Layer's constructor, since we can't
            // do exactly what the Python constructor does for Dense().
            let batchSize = null;
            if (args.batchSize != null) {
                batchSize = args.batchSize;
            }
            this.batchInputShape = [batchSize, args.inputDim];
        }
        this.units = args.units;
        assertPositiveInteger(this.units, 'units');
        this.activation = getActivation(args.activation);
        if (args.useBias != null) {
            this.useBias = args.useBias;
        }
        this.kernelInitializer = getInitializer(args.kernelInitializer || this.DEFAULT_KERNEL_INITIALIZER);
        this.biasInitializer =
            getInitializer(args.biasInitializer || this.DEFAULT_BIAS_INITIALIZER);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.activityRegularizer = getRegularizer(args.activityRegularizer);
        this.supportsMasking = true;
        this.inputSpec = [{ minNDim: 2 }];
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const inputLastDim = inputShape[inputShape.length - 1];
        if (this.kernel == null) {
            this.kernel = this.addWeight('kernel', [inputLastDim, this.units], null, this.kernelInitializer, this.kernelRegularizer, true, this.kernelConstraint);
            if (this.useBias) {
                this.bias = this.addWeight('bias', [this.units], null, this.biasInitializer, this.biasRegularizer, true, this.biasConstraint);
            }
        }
        this.inputSpec = [{ minNDim: 2, axes: { [-1]: inputLastDim } }];
        this.built = true;
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const outputShape = inputShape.slice();
        outputShape[outputShape.length - 1] = this.units;
        return outputShape;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            // Dense layer accepts only a single input.
            const input = getExactlyOneTensor(inputs);
            const fusedActivationName = mapActivationToFusedKernel(this.activation.getClassName());
            let output;
            if (fusedActivationName != null) {
                output = K.dot(input, this.kernel.read(), fusedActivationName, this.bias ? this.bias.read() : null);
            }
            else {
                output = K.dot(input, this.kernel.read());
                if (this.bias != null) {
                    output = K.biasAdd(output, this.bias.read());
                }
                if (this.activation != null) {
                    output = this.activation.apply(output);
                }
            }
            return output;
        });
    }
    getConfig() {
        const config = {
            units: this.units,
            activation: serializeActivation(this.activation),
            useBias: this.useBias,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint)
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Dense.className = 'Dense';
export { Dense };
serialization.registerClass(Dense);
class Flatten extends Layer {
    constructor(args) {
        args = args || {};
        super(args);
        this.inputSpec = [{ minNDim: 3 }];
        this.dataFormat = args.dataFormat;
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        for (const dim of inputShape.slice(1)) {
            if (dim == null) {
                throw new ValueError(`The shape of the input to "Flatten" is not fully defined ` +
                    `(got ${inputShape.slice(1)}). Make sure to pass a complete ` +
                    `"input_shape" or "batch_input_shape" argument to the first ` +
                    `layer in your model.`);
            }
        }
        return [inputShape[0], arrayProd(inputShape, 1)];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            let input = getExactlyOneTensor(inputs);
            if (this.dataFormat === 'channelsFirst' && input.rank > 1) {
                const permutation = [0];
                for (let i = 2; i < input.rank; ++i) {
                    permutation.push(i);
                }
                permutation.push(1);
                input = transpose(input, permutation);
            }
            return K.batchFlatten(input);
        });
    }
    getConfig() {
        const config = {};
        if (this.dataFormat != null) {
            config['dataFormat'] = this.dataFormat;
        }
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Flatten.className = 'Flatten';
export { Flatten };
serialization.registerClass(Flatten);
class Activation extends Layer {
    constructor(args) {
        super(args);
        this.supportsMasking = true;
        this.activation = getActivation(args.activation);
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            return this.activation.apply(input);
        });
    }
    getConfig() {
        const config = { activation: serializeActivation(this.activation) };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Activation.className = 'Activation';
export { Activation };
serialization.registerClass(Activation);
class RepeatVector extends Layer {
    constructor(args) {
        super(args);
        this.n = args.n;
        this.inputSpec = [{ ndim: 2 }];
    }
    computeOutputShape(inputShape) {
        return [inputShape[0], this.n, inputShape[1]];
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = getExactlyOneTensor(inputs);
            return K.repeat(inputs, this.n);
        });
    }
    getConfig() {
        const config = {
            n: this.n,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
RepeatVector.className = 'RepeatVector';
export { RepeatVector };
serialization.registerClass(RepeatVector);
class Reshape extends Layer {
    constructor(args) {
        super(args);
        this.targetShape = args.targetShape;
        // Make sure that all unknown dimensions are represented as `null`.
        for (let i = 0; i < this.targetShape.length; ++i) {
            if (this.isUnknown(this.targetShape[i])) {
                this.targetShape[i] = null;
            }
        }
    }
    isUnknown(dim) {
        return dim < 0 || dim == null;
    }
    /**
     * Finds and replaces a missing dimension in output shape.
     *
     * This is a near direct port of the internal Numpy function
     * `_fix_unknown_dimension` in `numpy/core/src/multiarray/shape.c`.
     *
     * @param inputShape: Original shape of array begin reshape.
     * @param outputShape: Target shape of the array, with at most a single
     * `null` or negative number, which indicates an underdetermined dimension
     * that should be derived from `inputShape` and the known dimensions of
     *   `outputShape`.
     * @returns: The output shape with `null` replaced with its computed value.
     * @throws: ValueError: If `inputShape` and `outputShape` do not match.
     */
    fixUnknownDimension(inputShape, outputShape) {
        const errorMsg = 'Total size of new array must be unchanged.';
        const finalShape = outputShape.slice();
        let known = 1;
        let unknown = null;
        for (let i = 0; i < finalShape.length; ++i) {
            const dim = finalShape[i];
            if (this.isUnknown(dim)) {
                if (unknown === null) {
                    unknown = i;
                }
                else {
                    throw new ValueError('Can only specifiy one unknown dimension.');
                }
            }
            else {
                known *= dim;
            }
        }
        const originalSize = arrayProd(inputShape);
        if (unknown !== null) {
            if (known === 0 || originalSize % known !== 0) {
                throw new ValueError(errorMsg);
            }
            finalShape[unknown] = originalSize / known;
        }
        else if (originalSize !== known) {
            throw new ValueError(errorMsg);
        }
        return finalShape;
    }
    computeOutputShape(inputShape) {
        let anyUnknownDims = false;
        for (let i = 0; i < inputShape.length; ++i) {
            if (this.isUnknown(inputShape[i])) {
                anyUnknownDims = true;
                break;
            }
        }
        if (anyUnknownDims) {
            return inputShape.slice(0, 1).concat(this.targetShape);
        }
        else {
            return inputShape.slice(0, 1).concat(this.fixUnknownDimension(inputShape.slice(1), this.targetShape));
        }
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            const inputShape = input.shape;
            const outputShape = inputShape.slice(0, 1).concat(this.fixUnknownDimension(inputShape.slice(1), this.targetShape));
            return reshape(input, outputShape);
        });
    }
    getConfig() {
        const config = {
            targetShape: this.targetShape,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Reshape.className = 'Reshape';
export { Reshape };
serialization.registerClass(Reshape);
class Permute extends Layer {
    constructor(args) {
        super(args);
        if (args.dims == null) {
            throw new Error('Required configuration field `dims` is missing during Permute ' +
                'constructor call.');
        }
        if (!Array.isArray(args.dims)) {
            throw new Error('Permute constructor requires `dims` to be an Array, but received ' +
                `${args.dims} instead.`);
        }
        // Check the validity of the permutation indices.
        const expectedSortedIndices = range(1, args.dims.length + 1);
        if (!util.arraysEqual(args.dims.slice().sort(), expectedSortedIndices)) {
            throw new Error('Invalid permutation `dims`: ' + JSON.stringify(args.dims) +
                ' `dims` must contain consecutive integers starting from 1.');
        }
        this.dims = args.dims;
        this.dimsIncludingBatch = [0].concat(this.dims);
        this.inputSpec = [new InputSpec({ ndim: this.dims.length + 1 })];
    }
    computeOutputShape(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const outputShape = inputShape.slice();
        this.dims.forEach((dim, i) => {
            outputShape[i + 1] = inputShape[dim];
        });
        return outputShape;
    }
    call(inputs, kwargs) {
        return transpose(getExactlyOneTensor(inputs), this.dimsIncludingBatch);
    }
    getConfig() {
        const config = {
            dims: this.dims,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Permute.className = 'Permute';
export { Permute };
serialization.registerClass(Permute);
class Masking extends Layer {
    constructor(args) {
        super(args == null ? {} : args);
        this.supportsMasking = true;
        if (args != null) {
            this.maskValue = args.maskValue == null ? 0 : args.maskValue;
        }
        else {
            this.maskValue = 0;
        }
    }
    computeOutputShape(inputShape) {
        return inputShape;
    }
    getConfig() {
        const baseConfig = super.getConfig();
        const config = { maskValue: this.maskValue };
        Object.assign(config, baseConfig);
        return config;
    }
    computeMask(inputs, mask) {
        const input = getExactlyOneTensor(inputs);
        const axis = -1;
        return any(notEqual(input, this.maskValue), axis);
    }
    call(inputs, kwargs) {
        return tidy(() => {
            this.invokeCallHook(inputs, kwargs);
            const input = getExactlyOneTensor(inputs);
            const axis = -1;
            const keepDims = true;
            const booleanMask = any(notEqual(input, this.maskValue), axis, keepDims);
            const output = mul(input, cast(booleanMask, input.dtype));
            return output;
        });
    }
}
/** @nocollapse */
Masking.className = 'Masking';
export { Masking };
serialization.registerClass(Masking);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvY29yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVIOztHQUVHO0FBRUgsT0FBTyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFVLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFDLE1BQU0sdUJBQXVCLENBQUM7QUFFdEgsT0FBTyxFQUE2QixhQUFhLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5RixPQUFPLEtBQUssQ0FBQyxNQUFNLHlCQUF5QixDQUFDO0FBQzdDLE9BQU8sRUFBbUMsYUFBYSxFQUFFLG1CQUFtQixFQUFDLE1BQU0sZ0JBQWdCLENBQUM7QUFDcEcsT0FBTyxFQUFnQixTQUFTLEVBQUUsS0FBSyxFQUFZLE1BQU0sb0JBQW9CLENBQUM7QUFDOUUsT0FBTyxFQUFDLFVBQVUsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUNyQyxPQUFPLEVBQUMsY0FBYyxFQUFzQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBSXpHLE9BQU8sRUFBQyxjQUFjLEVBQXNDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFekcsT0FBTyxFQUFDLHFCQUFxQixFQUFFLDBCQUEwQixFQUFDLE1BQU0sd0JBQXdCLENBQUM7QUFDekYsT0FBTyxFQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUMsTUFBTSxzQkFBc0IsQ0FBQztBQXFCN0UsTUFBYSxPQUFRLFNBQVEsS0FBSztJQU9oQyxZQUFZLElBQXNCO1FBQ2hDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNaLElBQUksQ0FBQyxJQUFJ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QUMsQ0FBQztZQUNwQyxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMxQyxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDdEIsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN6RSxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQTFDRCxrQkFBa0I7QUFDWCxpQkFBUyxHQUFHLFNBQVMsQ0FBQztTQUZsQixPQUFPO0FBNkNwQixhQUFhLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IDIwMTggR29vZ2xlIExMQ1xuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZVxuICogbGljZW5zZSB0aGF0IGNhbiBiZSBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIG9yIGF0XG4gKiBodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVC5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiBUZW5zb3JGbG93LmpzIExheWVyczogQmFzaWMgTGF5ZXJzLlxuICovXG5cbmltcG9ydCB7YW55LCBjYXN0LCBtdWwsIG5vdEVxdWFsLCByZXNoYXBlLCBzZXJpYWxpemF0aW9uLCBUZW5zb3IsIHRpZHksIHRyYW5zcG9zZSwgdXRpbH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcblxuaW1wb3J0IHtBY3RpdmF0aW9uIGFzIEFjdGl2YXRpb25GbiwgZ2V0QWN0aXZhdGlvbiwgc2VyaWFsaXplQWN0aXZhdGlvbn0gZnJvbSAnLi4vYWN0aXZhdGlvbnMnO1xuaW1wb3J0ICogYXMgSyBmcm9tICcuLi9iYWNrZW5kL3RmanNfYmFja2VuZCc7XG5pbXBvcnQge0NvbnN0cmFpbnQsIENvbnN0cmFpbnRJZGVudGlmaWVyLCBnZXRDb25zdHJhaW50LCBzZXJpYWxpemVDb25zdHJhaW50fSBmcm9tICcuLi9jb25zdHJhaW50cyc7XG5pbXBvcnQge0Rpc3Bvc2VSZXN1bHQsIElucHV0U3BlYywgTGF5ZXIsIExheWVyQXJnc30gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7VmFsdWVFcnJvcn0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7Z2V0SW5pdGlhbGl6ZXIsIEluaXRpYWxpemVyLCBJbml0aWFsaXplcklkZW50aWZpZXIsIHNlcmlhbGl6ZUluaXRpYWxpemVyfSBmcm9tICcuLi9pbml0aWFsaXplcnMnO1xuaW1wb3J0IHtBY3RpdmF0aW9uSWRlbnRpZmllcn0gZnJvbSAnLi4va2VyYXNfZm9ybWF0L2FjdGl2YXRpb25fY29uZmlnJztcbmltcG9ydCB7RGF0YUZvcm1hdCwgU2hhcGV9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHtMYXllckNvbmZpZ30gZnJvbSAnLi4va2VyYXNfZm9ybWF0L3RvcG9sb2d5X2NvbmZpZyc7XG5pbXBvcnQge2dldFJlZ3VsYXJpemVyLCBSZWd1bGFyaXplciwgUmVndWxhcml6ZXJJZGVudGlmaWVyLCBzZXJpYWxpemVSZWd1bGFyaXplcn0gZnJvbSAnLi4vcmVndWxhcml6ZXJzJztcbmltcG9ydCB7S3dhcmdzfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQge2Fzc2VydFBvc2l0aXZlSW50ZWdlciwgbWFwQWN0aXZhdGlvblRvRnVzZWRLZXJuZWx9IGZyb20gJy4uL3V0aWxzL2dlbmVyaWNfdXRpbHMnO1xuaW1wb3J0IHthcnJheVByb2QsIHJhbmdlfSBmcm9tICcuLi91dGlscy9tYXRoX3V0aWxzJztcbmltcG9ydCB7Z2V0RXhhY3RseU9uZVNoYXBlLCBnZXRFeGFjdGx5T25lVGVuc29yfSBmcm9tICcuLi91dGlscy90eXBlc191dGlscyc7XG5pbXBvcnQge0xheWVyVmFyaWFibGV9IGZyb20gJy4uL3ZhcmlhYmxlcyc7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBEcm9wb3V0TGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqIEZsb2F0IGJldHdlZW4gMCBhbmQgMS4gRnJhY3Rpb24gb2YgdGhlIGlucHV0IHVuaXRzIHRvIGRyb3AuICovXG4gIHJhdGU6IG51bWJlcjtcblxuICAvKipcbiAgICogSW50ZWdlciBhcnJheSByZXByZXNlbnRpbmcgdGhlIHNoYXBlIG9mIHRoZSBiaW5hcnkgZHJvcG91dCBtYXNrIHRoYXQgd2lsbFxuICAgKiBiZSBtdWx0aXBsaWVkIHdpdGggdGhlIGlucHV0LlxuICAgKlxuICAgKiBGb3IgaW5zdGFuY2UsIGlmIHlvdXIgaW5wdXRzIGhhdmUgc2hhcGUgYChiYXRjaFNpemUsIHRpbWVzdGVwcywgZmVhdHVyZXMpYFxuICAgKiBhbmQgeW91IHdhbnQgdGhlIGRyb3BvdXQgbWFzayB0byBiZSB0aGUgc2FtZSBmb3IgYWxsIHRpbWVzdGVwcywgeW91IGNhbiB1c2VcbiAgICogYG5vaXNlX3NoYXBlPShiYXRjaF9zaXplLCAxLCBmZWF0dXJlcylgLlxuICAgKi9cbiAgbm9pc2VTaGFwZT86IG51bWJlcltdO1xuXG4gIC8qKiBBbiBpbnRlZ2VyIHRvIHVzZSBhcyByYW5kb20gc2VlZC4gKi9cbiAgc2VlZD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIERyb3BvdXQgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0Ryb3BvdXQnO1xuICBwcml2YXRlIHJlYWRvbmx5IHJhdGU6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBub2lzZVNoYXBlOiBudW1iZXJbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBzZWVkOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoYXJnczogRHJvcG91dExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMucmF0ZSA9IE1hdGgubWF4KE1hdGgubWluKGFyZ3MucmF0ZSwgMSksIDApO1xuICAgIC8vIFNvIHRoYXQgdGhlIHNjYWxhciBkb2Vzbid0IGdldCB0aWRpZWQgdXAgYmV0d2VlbiBleGVjdXRpb25zLlxuICAgIHRoaXMubm9pc2VTaGFwZSA9IGFyZ3Mubm9pc2VTaGFwZTtcbiAgICB0aGlzLnNlZWQgPSBhcmdzLnNlZWQ7XG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldE5vaXNlU2hhcGUoaW5wdXQ6IFRlbnNvcik6IFNoYXBlIHtcbiAgICBpZiAodGhpcy5ub2lzZVNoYXBlID09IG51bGwpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vaXNlU2hhcGU7XG4gICAgfVxuICAgIGNvbnN0IGlucHV0U2hhcGUgPSBpbnB1dC5zaGFwZTtcbiAgICBjb25zdCBub2lzZVNoYXBlOiBTaGFwZSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5ub2lzZVNoYXBlLmxlbmd0aDsgKytpKSB7XG4gICAgICBub2lzZVNoYXBlLnB1c2goXG4gICAgICAgICAgdGhpcy5ub2lzZVNoYXBlW2ldID09IG51bGwgPyBpbnB1dFNoYXBlW2ldIDogdGhpcy5ub2lzZVNoYXBlW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIG5vaXNlU2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgdGhpcy5pbnZva2VDYWxsSG9vayhpbnB1dHMsIGt3YXJncyk7XG4gICAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIGlmICgwIDwgdGhpcy5yYXRlICYmIHRoaXMucmF0ZSA8IDEpIHtcbiAgICAgICAgY29uc3QgdHJhaW5pbmcgPVxuICAgICAgICAgICAga3dhcmdzWyd0cmFpbmluZyddID09IG51bGwgPyBmYWxzZSA6IGt3YXJnc1sndHJhaW5pbmcnXTtcbiAgICAgICAgY29uc3Qgbm9pc2VTaGFwZSA9IHRoaXMuZ2V0Tm9pc2VTaGFwZShpbnB1dCk7XG4gICAgICAgIGNvbnN0IG91dHB1dCA9IEsuaW5UcmFpblBoYXNlKFxuICAgICAgICAgICAgKCkgPT4gSy5kcm9wb3V0KGlucHV0LCB0aGlzLnJhdGUsIG5vaXNlU2hhcGUsIHRoaXMuc2VlZCksXG4gICAgICAgICAgICAoKSA9PiBpbnB1dCwgdHJhaW5pbmcpO1xuICAgICAgICByZXR1cm4gb3V0cHV0O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGlucHV0cztcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIHJhdGU6IHRoaXMucmF0ZSxcbiAgICAgIG5vaXNlU2hhcGU6IHRoaXMubm9pc2VTaGFwZSxcbiAgICAgIHNlZWQ6IHRoaXMuc2VlZCxcbiAgICB9O1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxuXG4gIG92ZXJyaWRlIGRpc3Bvc2UoKTogRGlzcG9zZVJlc3VsdCB7XG4gICAgcmV0dXJuIHN1cGVyLmRpc3Bvc2UoKTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKERyb3BvdXQpO1xuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgRGVuc2VMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKiogUG9zaXRpdmUgaW50ZWdlciwgZGltZW5zaW9uYWxpdHkgb2YgdGhlIG91dHB1dCBzcGFjZS4gKi9cbiAgdW5pdHM6IG51bWJlcjtcbiAgLyoqXG4gICAqIEFjdGl2YXRpb24gZnVuY3Rpb24gdG8gdXNlLlxuICAgKlxuICAgKiBJZiB1bnNwZWNpZmllZCwgbm8gYWN0aXZhdGlvbiBpcyBhcHBsaWVkLlxuICAgKi9cbiAgYWN0aXZhdGlvbj86IEFjdGl2YXRpb25JZGVudGlmaWVyO1xuICAvKiogV2hldGhlciB0byBhcHBseSBhIGJpYXMuICovXG4gIHVzZUJpYXM/OiBib29sZWFuO1xuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBkZW5zZSBrZXJuZWwgd2VpZ2h0cyBtYXRyaXguXG4gICAqL1xuICBrZXJuZWxJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgYmlhcyB2ZWN0b3IuXG4gICAqL1xuICBiaWFzSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG4gIC8qKlxuICAgKiBJZiBzcGVjaWZpZWQsIGRlZmluZXMgaW5wdXRTaGFwZSBhcyBgW2lucHV0RGltXWAuXG4gICAqL1xuICBpbnB1dERpbT86IG51bWJlcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmb3IgdGhlIGtlcm5lbCB3ZWlnaHRzLlxuICAgKi9cbiAga2VybmVsQ29uc3RyYWludD86IENvbnN0cmFpbnRJZGVudGlmaWVyfENvbnN0cmFpbnQ7XG5cbiAgLyoqXG4gICAqIENvbnN0cmFpbnQgZm9yIHRoZSBiaWFzIHZlY3Rvci5cbiAgICovXG4gIGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludElkZW50aWZpZXJ8Q29uc3RyYWludDtcblxuICAvKipcbiAgICogUmVndWxhcml6ZXIgZnVuY3Rpb24gYXBwbGllZCB0byB0aGUgZGVuc2Uga2VybmVsIHdlaWdodHMgbWF0cml4LlxuICAgKi9cbiAga2VybmVsUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZ1bmN0aW9uIGFwcGxpZWQgdG8gdGhlIGJpYXMgdmVjdG9yLlxuICAgKi9cbiAgYmlhc1JlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmdW5jdGlvbiBhcHBsaWVkIHRvIHRoZSBhY3RpdmF0aW9uLlxuICAgKi9cbiAgYWN0aXZpdHlSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVySWRlbnRpZmllcnxSZWd1bGFyaXplcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGF0aWFsRHJvcG91dDFETGF5ZXJDb25maWcgZXh0ZW5kcyBMYXllckNvbmZpZyB7XG4gIC8qKiBGbG9hdCBiZXR3ZWVuIDAgYW5kIDEuIEZyYWN0aW9uIG9mIHRoZSBpbnB1dCB1bml0cyB0byBkcm9wLiAqL1xuICByYXRlOiBudW1iZXI7XG5cbiAgLyoqIEFuIGludGVnZXIgdG8gdXNlIGFzIHJhbmRvbSBzZWVkLiAqL1xuICBzZWVkPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgU3BhdGlhbERyb3BvdXQxRCBleHRlbmRzIERyb3BvdXQge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIG92ZXJyaWRlIGNsYXNzTmFtZSA9ICdTcGF0aWFsRHJvcG91dDFEJztcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBTcGF0aWFsRHJvcG91dDFETGF5ZXJDb25maWcpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICB0aGlzLmlucHV0U3BlYyA9IFt7bmRpbTogM31dO1xuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIGdldE5vaXNlU2hhcGUoaW5wdXQ6IFRlbnNvcik6IFNoYXBlIHtcbiAgICBjb25zdCBpbnB1dFNoYXBlID0gaW5wdXQuc2hhcGU7XG4gICAgcmV0dXJuIFtpbnB1dFNoYXBlWzBdLCAxLCBpbnB1dFNoYXBlWzJdXTtcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKFNwYXRpYWxEcm9wb3V0MUQpO1xuXG5leHBvcnQgY2xhc3MgRGVuc2UgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0RlbnNlJztcbiAgcHJpdmF0ZSB1bml0czogbnVtYmVyO1xuICAvLyBEZWZhdWx0IGFjdGl2YXRpb246IExpbmVhciAobm9uZSkuXG4gIHByaXZhdGUgYWN0aXZhdGlvbjogQWN0aXZhdGlvbkZuID0gbnVsbDtcbiAgcHJpdmF0ZSB1c2VCaWFzID0gdHJ1ZTtcbiAgcHJpdmF0ZSBrZXJuZWxJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByaXZhdGUgYmlhc0luaXRpYWxpemVyOiBJbml0aWFsaXplcjtcbiAgcHJpdmF0ZSBrZXJuZWw6IExheWVyVmFyaWFibGUgPSBudWxsO1xuICBwcml2YXRlIGJpYXM6IExheWVyVmFyaWFibGUgPSBudWxsO1xuXG4gIHJlYWRvbmx5IERFRkFVTFRfS0VSTkVMX0lOSVRJQUxJWkVSOiBJbml0aWFsaXplcklkZW50aWZpZXIgPSAnZ2xvcm90Tm9ybWFsJztcbiAgcmVhZG9ubHkgREVGQVVMVF9CSUFTX0lOSVRJQUxJWkVSOiBJbml0aWFsaXplcklkZW50aWZpZXIgPSAnemVyb3MnO1xuICBwcml2YXRlIHJlYWRvbmx5IGtlcm5lbENvbnN0cmFpbnQ/OiBDb25zdHJhaW50O1xuICBwcml2YXRlIHJlYWRvbmx5IGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludDtcbiAgcHJpdmF0ZSByZWFkb25seSBrZXJuZWxSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGJpYXNSZWd1bGFyaXplcj86IFJlZ3VsYXJpemVyO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IERlbnNlTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgaWYgKGFyZ3MuYmF0Y2hJbnB1dFNoYXBlID09IG51bGwgJiYgYXJncy5pbnB1dFNoYXBlID09IG51bGwgJiZcbiAgICAgICAgYXJncy5pbnB1dERpbSAhPSBudWxsKSB7XG4gICAgICAvLyBUaGlzIGxvZ2ljIGlzIGNvcGllZCBmcm9tIExheWVyJ3MgY29uc3RydWN0b3IsIHNpbmNlIHdlIGNhbid0XG4gICAgICAvLyBkbyBleGFjdGx5IHdoYXQgdGhlIFB5dGhvbiBjb25zdHJ1Y3RvciBkb2VzIGZvciBEZW5zZSgpLlxuICAgICAgbGV0IGJhdGNoU2l6ZTogbnVtYmVyID0gbnVsbDtcbiAgICAgIGlmIChhcmdzLmJhdGNoU2l6ZSAhPSBudWxsKSB7XG4gICAgICAgIGJhdGNoU2l6ZSA9IGFyZ3MuYmF0Y2hTaXplO1xuICAgICAgfVxuICAgICAgdGhpcy5iYXRjaElucHV0U2hhcGUgPSBbYmF0Y2hTaXplLCBhcmdzLmlucHV0RGltXTtcbiAgICB9XG5cbiAgICB0aGlzLnVuaXRzID0gYXJncy51bml0cztcbiAgICBhc3NlcnRQb3NpdGl2ZUludGVnZXIodGhpcy51bml0cywgJ3VuaXRzJyk7XG4gICAgdGhpcy5hY3RpdmF0aW9uID0gZ2V0QWN0aXZhdGlvbihhcmdzLmFjdGl2YXRpb24pO1xuICAgIGlmIChhcmdzLnVzZUJpYXMgIT0gbnVsbCkge1xuICAgICAgdGhpcy51c2VCaWFzID0gYXJncy51c2VCaWFzO1xuICAgIH1cbiAgICB0aGlzLmtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoXG4gICAgICAgIGFyZ3Mua2VybmVsSW5pdGlhbGl6ZXIgfHwgdGhpcy5ERUZBVUxUX0tFUk5FTF9JTklUSUFMSVpFUik7XG4gICAgdGhpcy5iaWFzSW5pdGlhbGl6ZXIgPVxuICAgICAgICBnZXRJbml0aWFsaXplcihhcmdzLmJpYXNJbml0aWFsaXplciB8fCB0aGlzLkRFRkFVTFRfQklBU19JTklUSUFMSVpFUik7XG4gICAgdGhpcy5rZXJuZWxDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgIHRoaXMuYmlhc0NvbnN0cmFpbnQgPSBnZXRDb25zdHJhaW50KGFyZ3MuYmlhc0NvbnN0cmFpbnQpO1xuICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmtlcm5lbFJlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmJpYXNSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MuYmlhc1JlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmFjdGl2aXR5UmVndWxhcml6ZXIpO1xuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gdHJ1ZTtcblxuICAgIHRoaXMuaW5wdXRTcGVjID0gW3ttaW5ORGltOiAyfV07XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3QgaW5wdXRMYXN0RGltID0gaW5wdXRTaGFwZVtpbnB1dFNoYXBlLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0aGlzLmtlcm5lbCA9PSBudWxsKSB7XG4gICAgICB0aGlzLmtlcm5lbCA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAgICdrZXJuZWwnLCBbaW5wdXRMYXN0RGltLCB0aGlzLnVuaXRzXSwgbnVsbCwgdGhpcy5rZXJuZWxJbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLmtlcm5lbFJlZ3VsYXJpemVyLCB0cnVlLCB0aGlzLmtlcm5lbENvbnN0cmFpbnQpO1xuICAgICAgaWYgKHRoaXMudXNlQmlhcykge1xuICAgICAgICB0aGlzLmJpYXMgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAgICdiaWFzJywgW3RoaXMudW5pdHNdLCBudWxsLCB0aGlzLmJpYXNJbml0aWFsaXplcixcbiAgICAgICAgICAgIHRoaXMuYmlhc1JlZ3VsYXJpemVyLCB0cnVlLCB0aGlzLmJpYXNDb25zdHJhaW50KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlucHV0U3BlYyA9IFt7bWluTkRpbTogMiwgYXhlczoge1stMV06IGlucHV0TGFzdERpbX19XTtcbiAgICB0aGlzLmJ1aWx0ID0gdHJ1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNvbXB1dGVPdXRwdXRTaGFwZShpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogU2hhcGV8U2hhcGVbXSB7XG4gICAgaW5wdXRTaGFwZSA9IGdldEV4YWN0bHlPbmVTaGFwZShpbnB1dFNoYXBlKTtcbiAgICBjb25zdCBvdXRwdXRTaGFwZSA9IGlucHV0U2hhcGUuc2xpY2UoKTtcbiAgICBvdXRwdXRTaGFwZVtvdXRwdXRTaGFwZS5sZW5ndGggLSAxXSA9IHRoaXMudW5pdHM7XG4gICAgcmV0dXJuIG91dHB1dFNoYXBlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgLy8gRGVuc2UgbGF5ZXIgYWNjZXB0cyBvbmx5IGEgc2luZ2xlIGlucHV0LlxuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBjb25zdCBmdXNlZEFjdGl2YXRpb25OYW1lID1cbiAgICAgICAgICBtYXBBY3RpdmF0aW9uVG9GdXNlZEtlcm5lbCh0aGlzLmFjdGl2YXRpb24uZ2V0Q2xhc3NOYW1lKCkpO1xuICAgICAgbGV0IG91dHB1dDogVGVuc29yO1xuXG4gICAgICBpZiAoZnVzZWRBY3RpdmF0aW9uTmFtZSAhPSBudWxsKSB7XG4gICAgICAgIG91dHB1dCA9IEsuZG90KFxuICAgICAgICAgICAgaW5wdXQsIHRoaXMua2VybmVsLnJlYWQoKSwgZnVzZWRBY3RpdmF0aW9uTmFtZSxcbiAgICAgICAgICAgIHRoaXMuYmlhcyA/IHRoaXMuYmlhcy5yZWFkKCkgOiBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dCA9IEsuZG90KGlucHV0LCB0aGlzLmtlcm5lbC5yZWFkKCkpO1xuICAgICAgICBpZiAodGhpcy5iaWFzICE9IG51bGwpIHtcbiAgICAgICAgICBvdXRwdXQgPSBLLmJpYXNBZGQob3V0cHV0LCB0aGlzLmJpYXMucmVhZCgpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5hY3RpdmF0aW9uICE9IG51bGwpIHtcbiAgICAgICAgICBvdXRwdXQgPSB0aGlzLmFjdGl2YXRpb24uYXBwbHkob3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICB1bml0czogdGhpcy51bml0cyxcbiAgICAgIGFjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5hY3RpdmF0aW9uKSxcbiAgICAgIHVzZUJpYXM6IHRoaXMudXNlQmlhcyxcbiAgICAgIGtlcm5lbEluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmtlcm5lbEluaXRpYWxpemVyKSxcbiAgICAgIGJpYXNJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5iaWFzSW5pdGlhbGl6ZXIpLFxuICAgICAga2VybmVsUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMua2VybmVsUmVndWxhcml6ZXIpLFxuICAgICAgYmlhc1JlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJpYXNSZWd1bGFyaXplciksXG4gICAgICBhY3Rpdml0eVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIpLFxuICAgICAga2VybmVsQ29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmtlcm5lbENvbnN0cmFpbnQpLFxuICAgICAgYmlhc0NvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5iaWFzQ29uc3RyYWludClcbiAgICB9O1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKERlbnNlKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEZsYXR0ZW5MYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKiogSW1hZ2UgZGF0YSBmb3JtYXQ6IGNoYW5uZWxzTGFzdCAoZGVmYXVsdCkgb3IgY2hhbm5lbHNGaXJzdC4gKi9cbiAgZGF0YUZvcm1hdD86IERhdGFGb3JtYXQ7XG59XG5cbmV4cG9ydCBjbGFzcyBGbGF0dGVuIGV4dGVuZHMgTGF5ZXIge1xuICBwcml2YXRlIGRhdGFGb3JtYXQ6IERhdGFGb3JtYXQ7XG5cbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnRmxhdHRlbic7XG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBGbGF0dGVuTGF5ZXJBcmdzKSB7XG4gICAgYXJncyA9IGFyZ3MgfHwge307XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbe21pbk5EaW06IDN9XTtcbiAgICB0aGlzLmRhdGFGb3JtYXQgPSBhcmdzLmRhdGFGb3JtYXQ7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgZm9yIChjb25zdCBkaW0gb2YgaW5wdXRTaGFwZS5zbGljZSgxKSkge1xuICAgICAgaWYgKGRpbSA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgYFRoZSBzaGFwZSBvZiB0aGUgaW5wdXQgdG8gXCJGbGF0dGVuXCIgaXMgbm90IGZ1bGx5IGRlZmluZWQgYCArXG4gICAgICAgICAgICBgKGdvdCAke2lucHV0U2hhcGUuc2xpY2UoMSl9KS4gTWFrZSBzdXJlIHRvIHBhc3MgYSBjb21wbGV0ZSBgICtcbiAgICAgICAgICAgIGBcImlucHV0X3NoYXBlXCIgb3IgXCJiYXRjaF9pbnB1dF9zaGFwZVwiIGFyZ3VtZW50IHRvIHRoZSBmaXJzdCBgICtcbiAgICAgICAgICAgIGBsYXllciBpbiB5b3VyIG1vZGVsLmApO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gW2lucHV0U2hhcGVbMF0sIGFycmF5UHJvZChpbnB1dFNoYXBlLCAxKV07XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgdGhpcy5pbnZva2VDYWxsSG9vayhpbnB1dHMsIGt3YXJncyk7XG5cbiAgICAgIGxldCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIGlmICh0aGlzLmRhdGFGb3JtYXQgPT09ICdjaGFubmVsc0ZpcnN0JyAmJiBpbnB1dC5yYW5rID4gMSkge1xuICAgICAgICBjb25zdCBwZXJtdXRhdGlvbjogbnVtYmVyW10gPSBbMF07XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDwgaW5wdXQucmFuazsgKytpKSB7XG4gICAgICAgICAgcGVybXV0YXRpb24ucHVzaChpKTtcbiAgICAgICAgfVxuICAgICAgICBwZXJtdXRhdGlvbi5wdXNoKDEpO1xuICAgICAgICBpbnB1dCA9IHRyYW5zcG9zZShpbnB1dCwgcGVybXV0YXRpb24pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gSy5iYXRjaEZsYXR0ZW4oaW5wdXQpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7fTtcbiAgICBpZiAodGhpcy5kYXRhRm9ybWF0ICE9IG51bGwpIHtcbiAgICAgIGNvbmZpZ1snZGF0YUZvcm1hdCddID0gdGhpcy5kYXRhRm9ybWF0O1xuICAgIH1cbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhGbGF0dGVuKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIEFjdGl2YXRpb25MYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogTmFtZSBvZiB0aGUgYWN0aXZhdGlvbiBmdW5jdGlvbiB0byB1c2UuXG4gICAqL1xuICBhY3RpdmF0aW9uOiBBY3RpdmF0aW9uSWRlbnRpZmllcjtcbn1cblxuZXhwb3J0IGNsYXNzIEFjdGl2YXRpb24gZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0FjdGl2YXRpb24nO1xuICBhY3RpdmF0aW9uOiBBY3RpdmF0aW9uRm47XG5cbiAgY29uc3RydWN0b3IoYXJnczogQWN0aXZhdGlvbkxheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gdHJ1ZTtcbiAgICB0aGlzLmFjdGl2YXRpb24gPSBnZXRBY3RpdmF0aW9uKGFyZ3MuYWN0aXZhdGlvbik7XG4gIH1cblxuICBvdmVycmlkZSBjYWxsKGlucHV0czogVGVuc29yfFRlbnNvcltdLCBrd2FyZ3M6IEt3YXJncyk6IFRlbnNvcnxUZW5zb3JbXSB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgdGhpcy5pbnZva2VDYWxsSG9vayhpbnB1dHMsIGt3YXJncyk7XG4gICAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICAgIHJldHVybiB0aGlzLmFjdGl2YXRpb24uYXBwbHkoaW5wdXQpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge2FjdGl2YXRpb246IHNlcmlhbGl6ZUFjdGl2YXRpb24odGhpcy5hY3RpdmF0aW9uKX07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoQWN0aXZhdGlvbik7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBSZXNoYXBlTGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqIFRoZSB0YXJnZXQgc2hhcGUuIERvZXMgbm90IGluY2x1ZGUgdGhlIGJhdGNoIGF4aXMuICovXG4gIHRhcmdldFNoYXBlOiBTaGFwZTtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFJlcGVhdFZlY3RvckxheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBUaGUgaW50ZWdlciBudW1iZXIgb2YgdGltZXMgdG8gcmVwZWF0IHRoZSBpbnB1dC5cbiAgICovXG4gIG46IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIFJlcGVhdFZlY3RvciBleHRlbmRzIExheWVyIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnUmVwZWF0VmVjdG9yJztcbiAgcmVhZG9ubHkgbjogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFJlcGVhdFZlY3RvckxheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIHRoaXMubiA9IGFyZ3MubjtcbiAgICB0aGlzLmlucHV0U3BlYyA9IFt7bmRpbTogMn1dO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlKTogU2hhcGUge1xuICAgIHJldHVybiBbaW5wdXRTaGFwZVswXSwgdGhpcy5uLCBpbnB1dFNoYXBlWzFdXTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICBpbnB1dHMgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICByZXR1cm4gSy5yZXBlYXQoaW5wdXRzLCB0aGlzLm4pO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgbjogdGhpcy5uLFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUmVwZWF0VmVjdG9yKTtcblxuZXhwb3J0IGNsYXNzIFJlc2hhcGUgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ1Jlc2hhcGUnO1xuICBwcml2YXRlIHRhcmdldFNoYXBlOiBTaGFwZTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBSZXNoYXBlTGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy50YXJnZXRTaGFwZSA9IGFyZ3MudGFyZ2V0U2hhcGU7XG5cbiAgICAvLyBNYWtlIHN1cmUgdGhhdCBhbGwgdW5rbm93biBkaW1lbnNpb25zIGFyZSByZXByZXNlbnRlZCBhcyBgbnVsbGAuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRhcmdldFNoYXBlLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAodGhpcy5pc1Vua25vd24odGhpcy50YXJnZXRTaGFwZVtpXSkpIHtcbiAgICAgICAgdGhpcy50YXJnZXRTaGFwZVtpXSA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpc1Vua25vd24oZGltOiBudW1iZXIpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZGltIDwgMCB8fCBkaW0gPT0gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbmQgcmVwbGFjZXMgYSBtaXNzaW5nIGRpbWVuc2lvbiBpbiBvdXRwdXQgc2hhcGUuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBuZWFyIGRpcmVjdCBwb3J0IG9mIHRoZSBpbnRlcm5hbCBOdW1weSBmdW5jdGlvblxuICAgKiBgX2ZpeF91bmtub3duX2RpbWVuc2lvbmAgaW4gYG51bXB5L2NvcmUvc3JjL211bHRpYXJyYXkvc2hhcGUuY2AuXG4gICAqXG4gICAqIEBwYXJhbSBpbnB1dFNoYXBlOiBPcmlnaW5hbCBzaGFwZSBvZiBhcnJheSBiZWdpbiByZXNoYXBlLlxuICAgKiBAcGFyYW0gb3V0cHV0U2hhcGU6IFRhcmdldCBzaGFwZSBvZiB0aGUgYXJyYXksIHdpdGggYXQgbW9zdCBhIHNpbmdsZVxuICAgKiBgbnVsbGAgb3IgbmVnYXRpdmUgbnVtYmVyLCB3aGljaCBpbmRpY2F0ZXMgYW4gdW5kZXJkZXRlcm1pbmVkIGRpbWVuc2lvblxuICAgKiB0aGF0IHNob3VsZCBiZSBkZXJpdmVkIGZyb20gYGlucHV0U2hhcGVgIGFuZCB0aGUga25vd24gZGltZW5zaW9ucyBvZlxuICAgKiAgIGBvdXRwdXRTaGFwZWAuXG4gICAqIEByZXR1cm5zOiBUaGUgb3V0cHV0IHNoYXBlIHdpdGggYG51bGxgIHJlcGxhY2VkIHdpdGggaXRzIGNvbXB1dGVkIHZhbHVlLlxuICAgKiBAdGhyb3dzOiBWYWx1ZUVycm9yOiBJZiBgaW5wdXRTaGFwZWAgYW5kIGBvdXRwdXRTaGFwZWAgZG8gbm90IG1hdGNoLlxuICAgKi9cbiAgcHJpdmF0ZSBmaXhVbmtub3duRGltZW5zaW9uKGlucHV0U2hhcGU6IFNoYXBlLCBvdXRwdXRTaGFwZTogU2hhcGUpOiBTaGFwZSB7XG4gICAgY29uc3QgZXJyb3JNc2cgPSAnVG90YWwgc2l6ZSBvZiBuZXcgYXJyYXkgbXVzdCBiZSB1bmNoYW5nZWQuJztcbiAgICBjb25zdCBmaW5hbFNoYXBlID0gb3V0cHV0U2hhcGUuc2xpY2UoKTtcbiAgICBsZXQga25vd24gPSAxO1xuICAgIGxldCB1bmtub3duID0gbnVsbDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbmFsU2hhcGUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGRpbSA9IGZpbmFsU2hhcGVbaV07XG4gICAgICBpZiAodGhpcy5pc1Vua25vd24oZGltKSkge1xuICAgICAgICBpZiAodW5rbm93biA9PT0gbnVsbCkge1xuICAgICAgICAgIHVua25vd24gPSBpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKCdDYW4gb25seSBzcGVjaWZpeSBvbmUgdW5rbm93biBkaW1lbnNpb24uJyk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGtub3duICo9IGRpbTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBvcmlnaW5hbFNpemUgPSBhcnJheVByb2QoaW5wdXRTaGFwZSk7XG4gICAgaWYgKHVua25vd24gIT09IG51bGwpIHtcbiAgICAgIGlmIChrbm93biA9PT0gMCB8fCBvcmlnaW5hbFNpemUgJSBrbm93biAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihlcnJvck1zZyk7XG4gICAgICB9XG4gICAgICBmaW5hbFNoYXBlW3Vua25vd25dID0gb3JpZ2luYWxTaXplIC8ga25vd247XG4gICAgfSBlbHNlIGlmIChvcmlnaW5hbFNpemUgIT09IGtub3duKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihlcnJvck1zZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZpbmFsU2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGUpOiBTaGFwZSB7XG4gICAgbGV0IGFueVVua25vd25EaW1zID0gZmFsc2U7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbnB1dFNoYXBlLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAodGhpcy5pc1Vua25vd24oaW5wdXRTaGFwZVtpXSkpIHtcbiAgICAgICAgYW55VW5rbm93bkRpbXMgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYW55VW5rbm93bkRpbXMpIHtcbiAgICAgIHJldHVybiBpbnB1dFNoYXBlLnNsaWNlKDAsIDEpLmNvbmNhdCh0aGlzLnRhcmdldFNoYXBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGlucHV0U2hhcGUuc2xpY2UoMCwgMSkuY29uY2F0KFxuICAgICAgICAgIHRoaXMuZml4VW5rbm93bkRpbWVuc2lvbihpbnB1dFNoYXBlLnNsaWNlKDEpLCB0aGlzLnRhcmdldFNoYXBlKSk7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBjb25zdCBpbnB1dFNoYXBlID0gaW5wdXQuc2hhcGU7XG4gICAgICBjb25zdCBvdXRwdXRTaGFwZSA9IGlucHV0U2hhcGUuc2xpY2UoMCwgMSkuY29uY2F0KFxuICAgICAgICAgIHRoaXMuZml4VW5rbm93bkRpbWVuc2lvbihpbnB1dFNoYXBlLnNsaWNlKDEpLCB0aGlzLnRhcmdldFNoYXBlKSk7XG4gICAgICByZXR1cm4gcmVzaGFwZShpbnB1dCwgb3V0cHV0U2hhcGUpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgdGFyZ2V0U2hhcGU6IHRoaXMudGFyZ2V0U2hhcGUsXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhSZXNoYXBlKTtcblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIFBlcm11dGVMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogQXJyYXkgb2YgaW50ZWdlcnMuIFBlcm11dGF0aW9uIHBhdHRlcm4uIERvZXMgbm90IGluY2x1ZGUgdGhlXG4gICAqIHNhbXBsZSAoYmF0Y2gpIGRpbWVuc2lvbi4gSW5kZXggc3RhcnRzIGF0IDEuXG4gICAqIEZvciBpbnN0YW5jZSwgYFsyLCAxXWAgcGVybXV0ZXMgdGhlIGZpcnN0IGFuZCBzZWNvbmQgZGltZW5zaW9uc1xuICAgKiBvZiB0aGUgaW5wdXQuXG4gICAqL1xuICBkaW1zOiBudW1iZXJbXTtcbn1cblxuZXhwb3J0IGNsYXNzIFBlcm11dGUgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ1Blcm11dGUnO1xuICByZWFkb25seSBkaW1zOiBudW1iZXJbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBkaW1zSW5jbHVkaW5nQmF0Y2g6IG51bWJlcltdO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M6IFBlcm11dGVMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgICBpZiAoYXJncy5kaW1zID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnUmVxdWlyZWQgY29uZmlndXJhdGlvbiBmaWVsZCBgZGltc2AgaXMgbWlzc2luZyBkdXJpbmcgUGVybXV0ZSAnICtcbiAgICAgICAgICAnY29uc3RydWN0b3IgY2FsbC4nKTtcbiAgICB9XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFyZ3MuZGltcykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAnUGVybXV0ZSBjb25zdHJ1Y3RvciByZXF1aXJlcyBgZGltc2AgdG8gYmUgYW4gQXJyYXksIGJ1dCByZWNlaXZlZCAnICtcbiAgICAgICAgICBgJHthcmdzLmRpbXN9IGluc3RlYWQuYCk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgdGhlIHZhbGlkaXR5IG9mIHRoZSBwZXJtdXRhdGlvbiBpbmRpY2VzLlxuICAgIGNvbnN0IGV4cGVjdGVkU29ydGVkSW5kaWNlcyA9IHJhbmdlKDEsIGFyZ3MuZGltcy5sZW5ndGggKyAxKTtcbiAgICBpZiAoIXV0aWwuYXJyYXlzRXF1YWwoYXJncy5kaW1zLnNsaWNlKCkuc29ydCgpLCBleHBlY3RlZFNvcnRlZEluZGljZXMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgJ0ludmFsaWQgcGVybXV0YXRpb24gYGRpbXNgOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncy5kaW1zKSArXG4gICAgICAgICAgJyBgZGltc2AgbXVzdCBjb250YWluIGNvbnNlY3V0aXZlIGludGVnZXJzIHN0YXJ0aW5nIGZyb20gMS4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmRpbXMgPSBhcmdzLmRpbXM7XG4gICAgdGhpcy5kaW1zSW5jbHVkaW5nQmF0Y2ggPSBbMF0uY29uY2F0KHRoaXMuZGltcyk7XG4gICAgdGhpcy5pbnB1dFNwZWMgPSBbbmV3IElucHV0U3BlYyh7bmRpbTogdGhpcy5kaW1zLmxlbmd0aCArIDF9KV07XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3Qgb3V0cHV0U2hhcGUgPSBpbnB1dFNoYXBlLnNsaWNlKCk7XG4gICAgdGhpcy5kaW1zLmZvckVhY2goKGRpbTogbnVtYmVyLCBpOiBudW1iZXIpID0+IHtcbiAgICAgIG91dHB1dFNoYXBlW2kgKyAxXSA9IChpbnB1dFNoYXBlIGFzIFNoYXBlKVtkaW1dO1xuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICByZXR1cm4gdHJhbnNwb3NlKGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKSwgdGhpcy5kaW1zSW5jbHVkaW5nQmF0Y2gpO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgZGltczogdGhpcy5kaW1zLFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoUGVybXV0ZSk7XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBNYXNraW5nQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBNYXNraW5nIFZhbHVlLiBEZWZhdWx0cyB0byBgMC4wYC5cbiAgICovXG4gIG1hc2tWYWx1ZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGNsYXNzIE1hc2tpbmcgZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ01hc2tpbmcnO1xuICBtYXNrVmFsdWU6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihhcmdzPzogTWFza2luZ0FyZ3MpIHtcbiAgICBzdXBlcihhcmdzID09IG51bGwgPyB7fSA6IGFyZ3MpO1xuICAgIHRoaXMuc3VwcG9ydHNNYXNraW5nID0gdHJ1ZTtcbiAgICBpZiAoYXJncyAhPSBudWxsKSB7XG4gICAgICB0aGlzLm1hc2tWYWx1ZSA9IGFyZ3MubWFza1ZhbHVlID09IG51bGwgPyAwIDogYXJncy5tYXNrVmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubWFza1ZhbHVlID0gMDtcbiAgICB9XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIHJldHVybiBpbnB1dFNoYXBlO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCkge1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBjb25zdCBjb25maWcgPSB7bWFza1ZhbHVlOiB0aGlzLm1hc2tWYWx1ZX07XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlTWFzayhpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwgbWFzaz86IFRlbnNvcnxUZW5zb3JbXSk6XG4gICAgICBUZW5zb3Ige1xuICAgIGNvbnN0IGlucHV0ID0gZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpO1xuICAgIGNvbnN0IGF4aXMgPSAtMTtcbiAgICByZXR1cm4gYW55KG5vdEVxdWFsKGlucHV0LCB0aGlzLm1hc2tWYWx1ZSksIGF4aXMpO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIHRoaXMuaW52b2tlQ2FsbEhvb2soaW5wdXRzLCBrd2FyZ3MpO1xuICAgICAgY29uc3QgaW5wdXQgPSBnZXRFeGFjdGx5T25lVGVuc29yKGlucHV0cyk7XG4gICAgICBjb25zdCBheGlzID0gLTE7XG4gICAgICBjb25zdCBrZWVwRGltcyA9IHRydWU7XG4gICAgICBjb25zdCBib29sZWFuTWFzayA9IGFueShub3RFcXVhbChpbnB1dCwgdGhpcy5tYXNrVmFsdWUpLCBheGlzLCBrZWVwRGltcyk7XG4gICAgICBjb25zdCBvdXRwdXQgPSBtdWwoaW5wdXQsIGNhc3QoYm9vbGVhbk1hc2ssIGlucHV0LmR0eXBlKSk7XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTWFza2luZyk7XG4iXX0=