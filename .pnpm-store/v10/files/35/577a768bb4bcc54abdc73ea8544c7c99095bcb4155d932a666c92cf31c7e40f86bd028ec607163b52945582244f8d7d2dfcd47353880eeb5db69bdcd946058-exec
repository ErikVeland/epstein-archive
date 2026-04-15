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
 * TensorFlow.js Layers: Merge Layers.
 */
import * as tfc from '@tensorflow/tfjs-core';
import { serialization, tidy, util } from '@tensorflow/tfjs-core';
import * as K from '../backend/tfjs_backend';
import { Layer } from '../engine/topology';
import { NotImplementedError, ValueError } from '../errors';
import { l2Normalize } from '../losses';
import * as generic_utils from '../utils/generic_utils';
import * as mathUtils from '../utils/math_utils';
import { getExactlyOneShape } from '../utils/types_utils';
/**
 * Generic Merge layer for element-wise merge functions.
 *
 * Used to implement `Sum`, `Average`, `Concatenate`, etc.
 */
export class Merge extends Layer {
    constructor(args) {
        super(args || {});
        this.supportsMasking = true;
    }
    /**
     * Logic for merging multiple tensors, to be overridden by subclasses.
     * @param inputs
     */
    mergeFunction(inputs) {
        throw new NotImplementedError();
    }
    /**
     * Computes the shape of the result of an elementwise operation.
     *
     * @param shape1: Shape of the first tensor.
     * @param shape2: Shape of the second tensor.
     * @returns Expected output shape when an elementwise operation is carried
     *   out on 2 tensors with shapes `shape1` and `shape2`.
     * @throws ValueError: If `shape1` and `shape2` are not compatible for
     *   element-wise operations.
     */
    computeElementwiseOpOutputShape(shape1, shape2) {
        if (shape1 == null || shape2 == null) {
            return null;
        }
        else if (shape1.length < shape2.length) {
            return this.computeElementwiseOpOutputShape(shape2, shape1);
        }
        else if (shape2.length === 0) {
            return shape1;
        }
        const outputShape = shape1.slice(0, shape1.length - shape2.length);
        for (let k = 0; k < shape2.length; ++k) {
            const i = shape1[shape1.length - shape2.length + k];
            const j = shape2[k];
            if (i == null || j == null || i < 0 || j < 0) {
                outputShape.push(null);
            }
            else if (i === 1) {
                outputShape.push(j);
            }
            else if (j === 1) {
                outputShape.push(i);
            }
            else {
                if (i !== j) {
                    throw new ValueError('Operands could not be broadcast together with shapes ' +
                        JSON.stringify(shape1) + ' ' + JSON.stringify(shape2));
                }
                outputShape.push(i);
            }
        }
        return outputShape;
    }
    build(inputShape) {
        // Used purely for shape validation.
        if (Array.isArray(inputShape) && !Array.isArray(inputShape[0])) {
            // Make sure that inputShape is an Array of shape.
            inputShape = [getExactlyOneShape(inputShape)];
        }
        inputShape = inputShape;
        if (inputShape.length < 2) {
            throw new ValueError('A merge layer should be called on an Array of at least 2 inputs.' +
                ` Got ${inputShape.length} input(s).`);
        }
        // Make sure that there is at most one unique batch size among the input
        // shapes.
        let batchSizes = [];
        for (const shape of inputShape) {
            if (shape != null && shape[0] !== null) {
                batchSizes.push(shape[0]);
            }
        }
        batchSizes = generic_utils.unique(batchSizes);
        if (batchSizes.length > 1) {
            throw new ValueError(`Can not merge tensors with different batch sizes. ` +
                `Got tensors with shapes: ${JSON.stringify(inputShape)}.`);
        }
        let outputShape = inputShape[0] == null ? null : inputShape[0].slice(1);
        for (let i = 1; i < inputShape.length; ++i) {
            const shape = inputShape[i] == null ? null : inputShape[i].slice(1);
            outputShape = this.computeElementwiseOpOutputShape(outputShape, shape);
        }
        // If the inputs have different ranks, we have to reshape them to make them
        // broadcastable.
        const allRanks = inputShape.map(shape => shape.length);
        if (inputShape.indexOf(null) === -1 &&
            generic_utils.unique(allRanks).length === 1) {
            this.reshapeRequired = false;
        }
        else {
            this.reshapeRequired = true;
        }
    }
    call(inputs, kwargs) {
        return tidy(() => {
            inputs = inputs;
            if (this.reshapeRequired) {
                const reshapedInputs = [];
                const inputDims = inputs.map(input => input.rank);
                if (inputDims.indexOf(null) === -1) {
                    // If ranks of all inputs are available, we simply expand each of them
                    // at axis=1 until all of them have the same rank.
                    const maxNDim = mathUtils.max(inputDims);
                    for (let x of inputs) {
                        const xNDim = x.rank;
                        for (let k = 0; k < maxNDim - xNDim; ++k) {
                            x = K.expandDims(x, 1);
                        }
                        reshapedInputs.push(x);
                    }
                    return this.mergeFunction(reshapedInputs);
                }
                else {
                    // Transpose all inputs so that batch size is the last dimension.
                    // [batchSize, dim1, dim2, ...] -> [dim1, dim2, ..., batchSize]
                    let transposed = false;
                    for (const x of inputs) {
                        const xNDim = x.rank;
                        if (xNDim == null) {
                            const xShape = x.shape;
                            const batchSize = xShape[0];
                            const newShape = xShape.slice(1).concat([batchSize]);
                            let xTransposed = tfc.reshape(x, [batchSize].concat(mathUtils.arrayProd(xShape.slice(1))));
                            xTransposed = tfc.transpose(xTransposed, [1, 0]);
                            xTransposed = tfc.reshape(xTransposed, newShape);
                            reshapedInputs.push(xTransposed);
                            transposed = true;
                        }
                        else if (xNDim > 1) {
                            const dims = mathUtils.range(1, xNDim).concat([0]);
                            reshapedInputs.push(tfc.transpose(x, dims));
                            transposed = true;
                        }
                        else {
                            // We don't transpose inputs if they are 1D vectors or scalars.
                            reshapedInputs.push(x);
                        }
                    }
                    let y = this.mergeFunction(reshapedInputs);
                    const yNDim = y.rank;
                    if (transposed) {
                        // If inputs have been transposed, we have to transpose the output
                        // too.
                        if (yNDim == null) {
                            const yShape = y.shape;
                            const yNDim = yShape.length;
                            const batchSize = yShape[yNDim - 1];
                            const newShape = [batchSize].concat(yShape.slice(0, yShape.length - 1));
                            y = tfc.reshape(tfc.transpose(tfc.reshape(y, [-1, batchSize]), [1, 0]), newShape);
                        }
                        else if (yNDim > 1) {
                            const dims = [yNDim - 1].concat(mathUtils.range(0, yNDim - 1));
                            y = tfc.transpose(y, dims);
                        }
                    }
                    return y;
                }
            }
            else {
                return this.mergeFunction(inputs);
            }
        });
    }
    computeOutputShape(inputShape) {
        inputShape = inputShape;
        let outputShape;
        if (inputShape[0] == null) {
            outputShape = null;
        }
        else {
            outputShape = inputShape[0].slice(1);
        }
        for (let i = 1; i < inputShape.length; ++i) {
            const shape = inputShape[i] == null ? null : inputShape[i].slice(1);
            outputShape = this.computeElementwiseOpOutputShape(outputShape, shape);
        }
        let batchSizes = [];
        for (const shape of inputShape) {
            if (shape != null && shape[0] !== null) {
                batchSizes.push(shape[0]);
            }
        }
        batchSizes = generic_utils.unique(batchSizes);
        if (batchSizes.length === 1) {
            outputShape = batchSizes.concat(outputShape);
        }
        else {
            outputShape = [null].concat(outputShape);
        }
        return outputShape;
    }
    computeMask(inputs, mask) {
        return tfc.tidy(() => {
            if (mask == null) {
                return null;
            }
            if (!Array.isArray(mask)) {
                throw new ValueError('`mask` should be an Array');
            }
            if (!Array.isArray(inputs)) {
                throw new ValueError('`inputs` should be an Array');
            }
            if (mask.length !== inputs.length) {
                throw new ValueError(`The Array 'inputs' and 'mask' are expected to have the same ` +
                    `length, but have different lengths ` +
                    `(${inputs.length} vs ${mask.length})`);
            }
            if (mask.every(m => m == null)) {
                return null;
            }
            mask = mask.map(m => m == null ? m : tfc.expandDims(m, 0));
            let output = mask[0];
            for (let i = 1; i < mask.length - 1; ++i) {
                output = tfc.logicalAnd(output, mask[i]);
            }
            return output;
        });
    }
}
class Add extends Merge {
    constructor(args) {
        super(args);
    }
    mergeFunction(inputs) {
        return tidy(() => {
            let output = inputs[0].clone();
            for (let i = 1; i < inputs.length; ++i) {
                output = tfc.add(output, inputs[i]);
            }
            return output;
        });
    }
}
/** @nocollapse */
Add.className = 'Add';
export { Add };
serialization.registerClass(Add);
/**
 * Calculate the element-wise sum of inputs, which all have the same shape.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Add` layer, by using no input argument
 *    or a single configuration argument. The resultant `Add` layer can then
 *    be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const addLayer = tf.layers.add();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = addLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = tf.layers.add([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([1, 2, 3, 4], [2, 2]);
 * const input2 = tf.tensor2d([10, 20, 30, 40], [2, 2]);
 * tf.layers.add([input1, input2]).print();
 * // Gives [[11, 22], [33, 44]].
 *
 */
export function add(config) {
    if (Array.isArray(config)) {
        const layer = new Add({});
        return layer.apply(config);
    }
    else {
        return new Add(config);
    }
}
class Multiply extends Merge {
    constructor(args) {
        super(args);
    }
    mergeFunction(inputs) {
        return tidy(() => {
            let output = inputs[0].clone();
            for (let i = 1; i < inputs.length; ++i) {
                output = tfc.mul(output, inputs[i]);
            }
            return output;
        });
    }
}
/** @nocollapse */
Multiply.className = 'Multiply';
export { Multiply };
serialization.registerClass(Multiply);
/**
 * Calculate the element-wise product of inputs, which all have the same shape.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Multiply` layer, by using no input argument
 *    or a single configuration argument. The resultant `Multiply` layer can
 *    then be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const multiplyLayer = tf.layers.multiply();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = multiplyLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = tf.layers.multiply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([1, 2, 3, 4], [2, 2]);
 * const input2 = tf.tensor2d([10, 20, 30, 40], [2, 2]);
 * tf.layers.multiply([input1, input2]).print();
 * // Gives [[10, 40], [90, 160]].
 *
 */
export function multiply(config) {
    if (Array.isArray(config)) {
        const layer = new Multiply({});
        return layer.apply(config);
    }
    else {
        return new Multiply(config);
    }
}
class Average extends Merge {
    constructor(args) {
        super(args);
    }
    mergeFunction(inputs) {
        return tidy(() => {
            let output = inputs[0].clone();
            for (let i = 1; i < inputs.length; ++i) {
                output = tfc.add(output, inputs[i]);
            }
            return tfc.mul(1 / inputs.length, output);
        });
    }
}
/** @nocollapse */
Average.className = 'Average';
export { Average };
serialization.registerClass(Average);
/**
 * Calculate the element-wise arithmetic mean of inputs, which all have the same
 * shape.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Average` layer, by using no input argument
 *    or a single configuration argument. The resultant `Average` layer can then
 *    be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const averageLayer = tf.layers.average();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = averageLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = tf.layers.average([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([1, 2, 3, 4], [2, 2]);
 * const input2 = tf.tensor2d([10, 20, 30, 40], [2, 2]);
 * tf.layers.average([input1, input2]).print();
 * // Gives [[5.5, 11], [16.5, 22]].
 *
 */
export function average(config) {
    if (Array.isArray(config)) {
        const layer = new Average({});
        return layer.apply(config);
    }
    else {
        return new Average(config);
    }
}
class Maximum extends Merge {
    constructor(args) {
        super(args);
    }
    mergeFunction(inputs) {
        return tidy(() => {
            let output = inputs[0];
            for (let i = 1; i < inputs.length; ++i) {
                output = tfc.maximum(output, inputs[i]);
            }
            return output;
        });
    }
}
/** @nocollapse */
Maximum.className = 'Maximum';
export { Maximum };
serialization.registerClass(Maximum);
/**
 * Calculate the element-wise maximum of inputs, which all have the same shape.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Maximum` layer, by using no input argument
 *    or a single configuration argument. The resultant `Maximum` layer can then
 *    be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const maximumLayer = tf.layers.maximum();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = maximumLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = tf.layers.maximum([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([1, 20, 3, 40], [2, 2]);
 * const input2 = tf.tensor2d([10, 2, 30, 4], [2, 2]);
 * tf.layers.maximum([input1, input2]).print();
 * // Gives [[10, 20], [30, 40]].
 *
 */
export function maximum(config) {
    if (Array.isArray(config)) {
        const layer = new Maximum({});
        return layer.apply(config);
    }
    else {
        return new Maximum(config);
    }
}
class Minimum extends Merge {
    constructor(args) {
        super(args);
    }
    mergeFunction(inputs) {
        return tidy(() => {
            let output = inputs[0];
            for (let i = 1; i < inputs.length; ++i) {
                output = tfc.minimum(output, inputs[i]);
            }
            return output;
        });
    }
}
/** @nocollapse */
Minimum.className = 'Minimum';
export { Minimum };
serialization.registerClass(Minimum);
/**
 * Calculate the element-wise minimum of inputs, which all have the same shape.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Minimum` layer, by using no input argument
 *    or a single configuration argument. The resultant `Minimum` layer can then
 *    be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const minimumLayer = tf.layers.minimum();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = minimumLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 2]});
 * const input2 = tf.input({shape: [2, 2]});
 * const output = tf.layers.minimum([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([1, 20, 3, 40], [2, 2]);
 * const input2 = tf.tensor2d([10, 2, 30, 4], [2, 2]);
 * tf.layers.minimum([input1, input2]).print();
 * // Gives [[1, 2], [3, 4]].
 *
 */
export function minimum(config) {
    if (Array.isArray(config)) {
        const layer = new Minimum({});
        return layer.apply(config);
    }
    else {
        return new Minimum(config);
    }
}
class Concatenate extends Merge {
    constructor(args) {
        super(args);
        this.DEFAULT_AXIS = -1;
        if (args == null) {
            args = {};
        }
        this.axis = args.axis == null ? this.DEFAULT_AXIS : args.axis;
        this.supportsMasking = true;
        this.reshapeRequired = false;
    }
    build(inputShape) {
        // Used purely for shape validation.]
        if (!(Array.isArray(inputShape) && Array.isArray(inputShape[0])) ||
            inputShape.length === 1) {
            throw new ValueError('A `Concatenate` layer should be called on a list of at least 2 ' +
                'inputs');
        }
        inputShape = inputShape;
        let allNoneShape = true;
        for (const shape of inputShape) {
            if (shape != null) {
                allNoneShape = false;
                break;
            }
        }
        if (allNoneShape) {
            return;
        }
        const shapeSet = [];
        for (let i = 0; i < inputShape.length; ++i) {
            const shapeWithoutConcatAxis = inputShape[i].slice();
            shapeWithoutConcatAxis.splice(this.axis, 1);
            let exists = false;
            for (const shape of shapeSet) {
                if (util.arraysEqual(shape, shapeWithoutConcatAxis)) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                shapeSet.push(shapeWithoutConcatAxis);
            }
        }
        if (shapeSet.length > 1) {
            throw new ValueError('A `Concatenate` layer requires inputs with matching shapes ' +
                'except for the concat axis. Got input shapes: ' +
                JSON.stringify(inputShape));
        }
    }
    mergeFunction(inputs) {
        return tidy(() => {
            return K.concatenate(inputs, this.axis);
        });
    }
    computeOutputShape(inputShape) {
        if (!(Array.isArray(inputShape) && Array.isArray(inputShape[0]))) {
            throw new ValueError('A `Concatenate` layer should be called on a list of inputs.');
        }
        const inputShapes = inputShape;
        const outputShape = inputShapes[0].slice();
        const axis = this.axis < 0 ? outputShape.length + this.axis : this.axis;
        // Porting Note: the line above is because TypeScript doesn't support
        //   negative indices.
        for (const shape of inputShapes.slice(1)) {
            if (outputShape[axis] == null || shape[axis] == null) {
                outputShape[axis] = null;
                break;
            }
            outputShape[axis] += shape[axis];
        }
        return outputShape;
    }
    computeMask(inputs, mask) {
        if (mask == null) {
            return null;
        }
        if (!Array.isArray(mask)) {
            throw new ValueError('`mask` should be an array for Concatenate');
        }
        if (!Array.isArray(inputs)) {
            throw new ValueError('`inputs` should be an array for Concatenate');
        }
        if (mask.length !== inputs.length) {
            throw new ValueError(`Mismatch in the length of mask (${mask.length}) ` +
                `and the legnth of inputs (${inputs.length})`);
        }
        return tfc.tidy(() => {
            let allNullMasks = true;
            mask.forEach(m => {
                if (m != null) {
                    allNullMasks = false;
                    return;
                }
            });
            if (allNullMasks) {
                return null;
            }
            const outputMasks = [];
            for (let i = 0; i < inputs.length; ++i) {
                if (mask[i] == null) {
                    // Input is unmasked. Append all 1's to masks.
                    outputMasks.push(tfc.cast(tfc.onesLike(inputs[i]), 'bool'));
                }
                else if (mask[i].rank < inputs[i].rank) {
                    // Mask is smaller than the input, expand it.
                    outputMasks.push(tfc.expandDims(mask[i], -1));
                }
                else {
                    outputMasks.push(mask[i]);
                }
            }
            const concatenatedMasks = tfc.concat(outputMasks, this.axis);
            return tfc.all(concatenatedMasks, -1, false);
        });
    }
    getConfig() {
        const config = {
            'axis': this.axis,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Concatenate.className = 'Concatenate';
export { Concatenate };
serialization.registerClass(Concatenate);
/**
 * Concatenate an `Array` of inputs.
 *
 * This function can be invoked in three ways.
 *
 * 1. Construct an instance of `Concatenate` layer, by using no input argument
 *    or a single configuration argument. The resultant `Concatenate` layer can
 *    then be used on `tf.SymbolicTensor`s or `tf.Tensor`s. For example:
 *
 * ```js
 * const concatLayer = tf.layers.concatenate();
 *
 * // The layer can be applied to inputs.
 * const input1 = tf.input({shape: [2, 3]});
 * const input2 = tf.input({shape: [2, 4]});
 * const output = concatLayer.apply([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 7], with the first dimension as the undetermined batch
 * // dimension and the last dimension as the result of concatenating the
 * // last dimensions of the two inputs.
 * ```
 *
 * 2. Invoke directly on an `Array` of `tf.SymbolicTensor`s. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.SymbolicTensor`. For example:
 *
 * ```js
 * const input1 = tf.input({shape: [2, 3]});
 * const input2 = tf.input({shape: [2, 4]});
 * const output = tf.layers.concatenate([input1, input2]);
 * console.log(output.shape);
 * // You get [null, 2, 2], with the first dimension as the undetermined batch
 * // dimension and the last dimension as the result of concatenating the
 * // last dimensions of the two inputs.
 * ```
 *
 * 3. Invoke directly on `tf.Tensor`s, i.e., concrete values. This constructs
 *    an `Layer` object internally and calls its `apply` method on the inputs,
 *    generating a new `tf.Tensor` as the result of the computation. For
 * example:
 *
 * ```js
 * const input1 = tf.tensor2d([[1, 2], [3, 4]], [2, 2]);
 * const input2 = tf.tensor2d([[10, 20], [30, 40]], [2, 2]);
 * tf.layers.concatenate([input1, input2]).print();
 * // Gives [[1, 2, 10, 20], [3, 4, 30, 40]].
 *
 */
export function concatenate(config) {
    if (Array.isArray(config)) {
        const layer = new Concatenate({});
        return layer.apply(config);
    }
    else {
        return new Concatenate(config);
    }
}
/**
 * Interpretable potentially negative axis index.
 *
 * For example, given axis = -1, and dim = 3, this function will return 2.
 *
 * @param axis The axis index, may be a positive, zero or negative integer.
 * @param dim Total number of dimensions, a positive integer.
 * @returns A non-negative axis index equivalent to the input `axis`.
 */
function interpretAxis(axis, dim) {
    while (axis < 0) {
        axis += dim;
    }
    return axis;
}
function batchDot(x, y, axes) {
    if (x.shape.length > 3 || y.shape.length > 3) {
        throw new NotImplementedError('batchDot is not implemented for tensors of 4D or higher rank yet');
    }
    tfc.util.assert(x.shape.length >= 2, () => `batchDot requires the rank of x to be >= 2, ` +
        `but got ${x.shape.length}`);
    tfc.util.assert(x.shape.length >= 2, () => `batchDot requires the rank of y to be >= 2, ` +
        `but got ${y.shape.length}`);
    if (typeof axes === 'number') {
        axes = [axes, axes];
    }
    if (x.dtype === 'complex64' || y.dtype === 'complex64') {
        throw new NotImplementedError('batchDot is not implemented for complex64-type Tensors yet.');
    }
    const xNDim = x.shape.length;
    const yNDim = y.shape.length;
    if (axes == null) {
        // Behave like batchMatmul by default.
        axes = [xNDim - 1, yNDim - 2];
    }
    const axesArray = axes;
    return tfc.tidy(() => {
        let diff;
        if (xNDim > yNDim) {
            diff = xNDim - yNDim;
            const diffShape = [];
            for (let i = 0; i < diff; ++i) {
                diffShape.push(1);
            }
            y = tfc.reshape(y, y.shape.concat(diffShape));
        }
        else if (yNDim > xNDim) {
            diff = yNDim - xNDim;
            const diffShape = [];
            for (let i = 0; i < diff; ++i) {
                diffShape.push(1);
            }
            x = tfc.reshape(x, x.shape.concat(diffShape));
        }
        else {
            diff = 0;
        }
        let out;
        if (x.shape.length === 2 && y.shape.length === 2) {
            if (axesArray[0] === axesArray[1]) {
                out = tfc.sum(tfc.mul(x, y), axesArray[0]);
            }
            else {
                out = tfc.sum(tfc.mul(tfc.transpose(x, [1, 0]), y), axesArray[1]);
            }
        }
        else {
            const adjX = axesArray[0] !== x.shape.length - 1;
            const adjY = axesArray[1] === y.shape.length - 1;
            out = tfc.matMul(x, y, adjX, adjY);
        }
        if (diff > 0) {
            let idx;
            if (xNDim > yNDim) {
                idx = xNDim + yNDim - 3;
            }
            else {
                idx = xNDim - 1;
            }
            const squeezeAxes = [];
            for (let i = idx; i < idx + diff; ++i) {
                squeezeAxes.push(i);
            }
            out = tfc.squeeze(out, squeezeAxes);
        }
        if (out.shape.length === 1) {
            out = tfc.expandDims(out, 1);
        }
        return out;
    });
}
class Dot extends Merge {
    constructor(args) {
        super(args);
        this.axes = args.axes;
        this.normalize = args.normalize == null ? false : args.normalize;
        this.supportsMasking = true;
        this.reshapeRequired = false;
    }
    build(inputShape) {
        tfc.util.assert(Array.isArray(inputShape) && inputShape.length === 2 &&
            Array.isArray(inputShape[0]) && Array.isArray(inputShape[1]), () => 'A `Dot` layer should be called on a list of exactly 2 inputs.');
        const shape1 = inputShape[0];
        const shape2 = inputShape[1];
        if (shape1.length > 3 || shape2.length > 3) {
            throw new NotImplementedError('Dot layer does not support tensors of 4D or higher rank yet.');
        }
        const axes = this.interpretAxes(shape1, shape2);
        if (shape1[axes[0]] !== shape2[axes[1]]) {
            throw new ValueError(`Dimension incompatibility: ` +
                `${shape1[axes[0]]} !== ${shape2[axes[1]]}`);
        }
    }
    mergeFunction(inputs) {
        if (inputs.length !== 2) {
            throw new ValueError('A `Dot` layer must be called on exactly 2 inputs, ' +
                `but received ${inputs.length} input(s).`);
        }
        let x1 = inputs[0];
        let x2 = inputs[1];
        let axes;
        if (!Array.isArray(this.axes)) {
            axes = [
                interpretAxis(this.axes, x1.shape.length),
                interpretAxis(this.axes, x2.shape.length)
            ];
        }
        else {
            axes = this.axes.map((axis, i) => interpretAxis(axis, inputs[i].shape.length));
        }
        if (this.normalize) {
            x1 = l2Normalize(x1, axes[0]);
            x2 = l2Normalize(x2, axes[1]);
        }
        return batchDot(x1, x2, axes);
    }
    interpretAxes(shape1, shape2) {
        let axes;
        if (!Array.isArray(this.axes)) {
            // `this.axes` is a single integer.
            axes = [
                interpretAxis(this.axes, shape1.length),
                interpretAxis(this.axes, shape2.length)
            ];
        }
        else {
            // `this.axes` is an Array of integers.
            axes = this.axes;
        }
        return axes;
    }
    computeOutputShape(inputShape) {
        tfc.util.assert(Array.isArray(inputShape) && inputShape.length === 2 &&
            Array.isArray(inputShape[0]) && Array.isArray(inputShape[1]), () => 'A `Dot` layer should be called on a list of exactly 2 inputs.');
        const shape1 = inputShape[0].slice();
        const shape2 = inputShape[1].slice();
        if (shape1.length > 3 || shape2.length > 3) {
            throw new NotImplementedError('Dot layer does not support tensors of 4D or higher rank yet.');
        }
        const axes = this.interpretAxes(shape1, shape2);
        shape1.splice(axes[0], 1);
        shape2.splice(axes[1], 1);
        shape2.splice(0, 1);
        const outputShape = shape1.concat(shape2);
        if (outputShape.length === 1) {
            outputShape.push(1);
        }
        return outputShape;
    }
    computeMask(inputs, mask) {
        return null;
    }
    getConfig() {
        const config = {
            'axes': this.axes,
            'normalize': this.normalize
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
Dot.className = 'Dot';
export { Dot };
serialization.registerClass(Dot);
// TODO(cais): Add functional interfaces for the merge layers.
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi90ZmpzLWxheWVycy9zcmMvbGF5ZXJzL21lcmdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztHQVFHO0FBRUg7O0dBRUc7QUFFSCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBQyxhQUFhLEVBQVUsSUFBSSxFQUFFLElBQUksRUFBQyxNQUFNLHVCQUF1QixDQUFDO0FBQ3hFLE9BQU8sS0FBSyxDQUFDLE1BQU0seUJBQXlCLENBQUM7QUFDN0MsT0FBTyxFQUFDLEtBQUssRUFBNEIsTUFBTSxvQkFBb0IsQ0FBQztBQUNwRSxPQUFPLEVBQUMsbUJBQW1CLEVBQUUsVUFBVSxFQUFDLE1BQU0sV0FBVyxDQUFDO0FBRTFELE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSxXQUFXLENBQUM7QUFFdEMsT0FBTyxLQUFLLGFBQWEsTUFBTSx3QkFBd0IsQ0FBQztBQUN4RCxPQUFPLEtBQUssU0FBUyxNQUFNLHFCQUFxQixDQUFDO0FBQ2pELE9BQU8sRUFBQyxrQkFBa0IsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRXhEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQWdCLEtBQU0sU0FBUSxLQUFLO0lBR3ZDLFlBQVksSUFBZ0I7UUFDMUIsS0FBSyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNsQixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztJQUM5QixDQUFDO0lBRUQ7OztPQUdHO0lBQ08sYUFBYSxDQUFDLE1BQWdCO1FBQ3RDLE1BQU0sSUFBSSxtQkFBbUIsRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSywrQkFBK0IsQ0FBQyxNQUFhLEVBQUUsTUFBYTtRQUNsRSxJQUFJLE1BQU0sSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtZQUNwQyxPQUFPLElB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dGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgTExDXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlXG4gKiBsaWNlbnNlIHRoYXQgY2FuIGJlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgb3IgYXRcbiAqIGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlULlxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAqL1xuXG4vKipcbiAqIFRlbnNvckZsb3cuanMgTGF5ZXJzOiBNZXJnZSBMYXllcnMuXG4gKi9cblxuaW1wb3J0ICogYXMgdGZjIGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQge3NlcmlhbGl6YXRpb24sIFRlbnNvciwgdGlkeSwgdXRpbH0gZnJvbSAnQHRlbnNvcmZsb3cvdGZqcy1jb3JlJztcbmltcG9ydCAqIGFzIEsgZnJvbSAnLi4vYmFja2VuZC90ZmpzX2JhY2tlbmQnO1xuaW1wb3J0IHtMYXllciwgTGF5ZXJBcmdzLCBTeW1ib2xpY1RlbnNvcn0gZnJvbSAnLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7Tm90SW1wbGVtZW50ZWRFcnJvciwgVmFsdWVFcnJvcn0gZnJvbSAnLi4vZXJyb3JzJztcbmltcG9ydCB7U2hhcGV9IGZyb20gJy4uL2tlcmFzX2Zvcm1hdC9jb21tb24nO1xuaW1wb3J0IHtsMk5vcm1hbGl6ZX0gZnJvbSAnLi4vbG9zc2VzJztcbmltcG9ydCB7S3dhcmdzfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgKiBhcyBnZW5lcmljX3V0aWxzIGZyb20gJy4uL3V0aWxzL2dlbmVyaWNfdXRpbHMnO1xuaW1wb3J0ICogYXMgbWF0aFV0aWxzIGZyb20gJy4uL3V0aWxzL21hdGhfdXRpbHMnO1xuaW1wb3J0IHtnZXRFeGFjdGx5T25lU2hhcGV9IGZyb20gJy4uL3V0aWxzL3R5cGVzX3V0aWxzJztcblxuLyoqXG4gKiBHZW5lcmljIE1lcmdlIGxheWVyIGZvciBlbGVtZW50LXdpc2UgbWVyZ2UgZnVuY3Rpb25zLlxuICpcbiAqIFVzZWQgdG8gaW1wbGVtZW50IGBTdW1gLCBgQXZlcmFnZWAsIGBDb25jYXRlbmF0ZWAsIGV0Yy5cbiAqL1xuZXhwb3J0IGFic3RyYWN0IGNsYXNzIE1lcmdlIGV4dGVuZHMgTGF5ZXIge1xuICBwcm90ZWN0ZWQgcmVzaGFwZVJlcXVpcmVkOiBib29sZWFuO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzIHx8IHt9KTtcbiAgICB0aGlzLnN1cHBvcnRzTWFza2luZyA9IHRydWU7XG4gIH1cblxuICAvKipcbiAgICogTG9naWMgZm9yIG1lcmdpbmcgbXVsdGlwbGUgdGVuc29ycywgdG8gYmUgb3ZlcnJpZGRlbiBieSBzdWJjbGFzc2VzLlxuICAgKiBAcGFyYW0gaW5wdXRzXG4gICAqL1xuICBwcm90ZWN0ZWQgbWVyZ2VGdW5jdGlvbihpbnB1dHM6IFRlbnNvcltdKTogVGVuc29yIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIHRoZSBzaGFwZSBvZiB0aGUgcmVzdWx0IG9mIGFuIGVsZW1lbnR3aXNlIG9wZXJhdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHNoYXBlMTogU2hhcGUgb2YgdGhlIGZpcnN0IHRlbnNvci5cbiAgICogQHBhcmFtIHNoYXBlMjogU2hhcGUgb2YgdGhlIHNlY29uZCB0ZW5zb3IuXG4gICAqIEByZXR1cm5zIEV4cGVjdGVkIG91dHB1dCBzaGFwZSB3aGVuIGFuIGVsZW1lbnR3aXNlIG9wZXJhdGlvbiBpcyBjYXJyaWVkXG4gICAqICAgb3V0IG9uIDIgdGVuc29ycyB3aXRoIHNoYXBlcyBgc2hhcGUxYCBhbmQgYHNoYXBlMmAuXG4gICAqIEB0aHJvd3MgVmFsdWVFcnJvcjogSWYgYHNoYXBlMWAgYW5kIGBzaGFwZTJgIGFyZSBub3QgY29tcGF0aWJsZSBmb3JcbiAgICogICBlbGVtZW50LXdpc2Ugb3BlcmF0aW9ucy5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZUVsZW1lbnR3aXNlT3BPdXRwdXRTaGFwZShzaGFwZTE6IFNoYXBlLCBzaGFwZTI6IFNoYXBlKTogU2hhcGUge1xuICAgIGlmIChzaGFwZTEgPT0gbnVsbCB8fCBzaGFwZTIgPT0gbnVsbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChzaGFwZTEubGVuZ3RoIDwgc2hhcGUyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHRoaXMuY29tcHV0ZUVsZW1lbnR3aXNlT3BPdXRwdXRTaGFwZShzaGFwZTIsIHNoYXBlMSk7XG4gICAgfSBlbHNlIGlmIChzaGFwZTIubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gc2hhcGUxO1xuICAgIH1cbiAgICBjb25zdCBvdXRwdXRTaGFwZTogU2hhcGUgPSBzaGFwZTEuc2xpY2UoMCwgc2hhcGUxLmxlbmd0aCAtIHNoYXBlMi5sZW5ndGgpO1xuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgc2hhcGUyLmxlbmd0aDsgKytrKSB7XG4gICAgICBjb25zdCBpID0gc2hhcGUxW3NoYXBlMS5sZW5ndGggLSBzaGFwZTIubGVuZ3RoICsga107XG4gICAgICBjb25zdCBqID0gc2hhcGUyW2tdO1xuICAgICAgaWYgKGkgPT0gbnVsbCB8fCBqID09IG51bGwgfHwgaSA8IDAgfHwgaiA8IDApIHtcbiAgICAgICAgb3V0cHV0U2hhcGUucHVzaChudWxsKTtcbiAgICAgIH0gZWxzZSBpZiAoaSA9PT0gMSkge1xuICAgICAgICBvdXRwdXRTaGFwZS5wdXNoKGopO1xuICAgICAgfSBlbHNlIGlmIChqID09PSAxKSB7XG4gICAgICAgIG91dHB1dFNoYXBlLnB1c2goaSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoaSAhPT0gaikge1xuICAgICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICAgICAgICAnT3BlcmFuZHMgY291bGQgbm90IGJlIGJyb2FkY2FzdCB0b2dldGhlciB3aXRoIHNoYXBlcyAnICtcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2hhcGUxKSArICcgJyArIEpTT04uc3RyaW5naWZ5KHNoYXBlMikpO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dFNoYXBlLnB1c2goaSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXRTaGFwZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICAvLyBVc2VkIHB1cmVseSBmb3Igc2hhcGUgdmFsaWRhdGlvbi5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShpbnB1dFNoYXBlKSAmJiAhQXJyYXkuaXNBcnJheShpbnB1dFNoYXBlWzBdKSkge1xuICAgICAgLy8gTWFrZSBzdXJlIHRoYXQgaW5wdXRTaGFwZSBpcyBhbiBBcnJheSBvZiBzaGFwZS5cbiAgICAgIGlucHV0U2hhcGUgPSBbZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpXTtcbiAgICB9XG4gICAgaW5wdXRTaGFwZSA9IGlucHV0U2hhcGUgYXMgU2hhcGVbXTtcbiAgICBpZiAoaW5wdXRTaGFwZS5sZW5ndGggPCAyKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnQSBtZXJnZSBsYXllciBzaG91bGQgYmUgY2FsbGVkIG9uIGFuIEFycmF5IG9mIGF0IGxlYXN0IDIgaW5wdXRzLicgK1xuICAgICAgICAgIGAgR290ICR7aW5wdXRTaGFwZS5sZW5ndGh9IGlucHV0KHMpLmApO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0aGF0IHRoZXJlIGlzIGF0IG1vc3Qgb25lIHVuaXF1ZSBiYXRjaCBzaXplIGFtb25nIHRoZSBpbnB1dFxuICAgIC8vIHNoYXBlcy5cbiAgICBsZXQgYmF0Y2hTaXplczogbnVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNoYXBlIG9mIGlucHV0U2hhcGUpIHtcbiAgICAgIGlmIChzaGFwZSAhPSBudWxsICYmIHNoYXBlWzBdICE9PSBudWxsKSB7XG4gICAgICAgIGJhdGNoU2l6ZXMucHVzaChzaGFwZVswXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGJhdGNoU2l6ZXMgPSBnZW5lcmljX3V0aWxzLnVuaXF1ZShiYXRjaFNpemVzKTtcbiAgICBpZiAoYmF0Y2hTaXplcy5sZW5ndGggPiAxKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICBgQ2FuIG5vdCBtZXJnZSB0ZW5zb3JzIHdpdGggZGlmZmVyZW50IGJhdGNoIHNpemVzLiBgICtcbiAgICAgICAgICBgR290IHRlbnNvcnMgd2l0aCBzaGFwZXM6ICR7SlNPTi5zdHJpbmdpZnkoaW5wdXRTaGFwZSl9LmApO1xuICAgIH1cblxuICAgIGxldCBvdXRwdXRTaGFwZTogU2hhcGUgPVxuICAgICAgICBpbnB1dFNoYXBlWzBdID09IG51bGwgPyBudWxsIDogaW5wdXRTaGFwZVswXS5zbGljZSgxKTtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IGlucHV0U2hhcGUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHNoYXBlID0gaW5wdXRTaGFwZVtpXSA9PSBudWxsID8gbnVsbCA6IGlucHV0U2hhcGVbaV0uc2xpY2UoMSk7XG4gICAgICBvdXRwdXRTaGFwZSA9IHRoaXMuY29tcHV0ZUVsZW1lbnR3aXNlT3BPdXRwdXRTaGFwZShvdXRwdXRTaGFwZSwgc2hhcGUpO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgaW5wdXRzIGhhdmUgZGlmZmVyZW50IHJhbmtzLCB3ZSBoYXZlIHRvIHJlc2hhcGUgdGhlbSB0byBtYWtlIHRoZW1cbiAgICAvLyBicm9hZGNhc3RhYmxlLlxuICAgIGNvbnN0IGFsbFJhbmtzID0gaW5wdXRTaGFwZS5tYXAoc2hhcGUgPT4gc2hhcGUubGVuZ3RoKTtcbiAgICBpZiAoaW5wdXRTaGFwZS5pbmRleE9mKG51bGwpID09PSAtMSAmJlxuICAgICAgICBnZW5lcmljX3V0aWxzLnVuaXF1ZShhbGxSYW5rcykubGVuZ3RoID09PSAxKSB7XG4gICAgICB0aGlzLnJlc2hhcGVSZXF1aXJlZCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlc2hhcGVSZXF1aXJlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlucHV0cyA9IGlucHV0cyBhcyBUZW5zb3JbXTtcbiAgICAgIGlmICh0aGlzLnJlc2hhcGVSZXF1aXJlZCkge1xuICAgICAgICBjb25zdCByZXNoYXBlZElucHV0czogVGVuc29yW10gPSBbXTtcbiAgICAgICAgY29uc3QgaW5wdXREaW1zID0gaW5wdXRzLm1hcChpbnB1dCA9PiBpbnB1dC5yYW5rKTtcbiAgICAgICAgaWYgKGlucHV0RGltcy5pbmRleE9mKG51bGwpID09PSAtMSkge1xuICAgICAgICAgIC8vIElmIHJhbmtzIG9mIGFsbCBpbnB1dHMgYXJlIGF2YWlsYWJsZSwgd2Ugc2ltcGx5IGV4cGFuZCBlYWNoIG9mIHRoZW1cbiAgICAgICAgICAvLyBhdCBheGlzPTEgdW50aWwgYWxsIG9mIHRoZW0gaGF2ZSB0aGUgc2FtZSByYW5rLlxuICAgICAgICAgIGNvbnN0IG1heE5EaW0gPSBtYXRoVXRpbHMubWF4KGlucHV0RGltcyk7XG4gICAgICAgICAgZm9yIChsZXQgeCBvZiBpbnB1dHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHhORGltID0geC5yYW5rO1xuICAgICAgICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBtYXhORGltIC0geE5EaW07ICsraykge1xuICAgICAgICAgICAgICB4ID0gSy5leHBhbmREaW1zKHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzaGFwZWRJbnB1dHMucHVzaCh4KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMubWVyZ2VGdW5jdGlvbihyZXNoYXBlZElucHV0cyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVHJhbnNwb3NlIGFsbCBpbnB1dHMgc28gdGhhdCBiYXRjaCBzaXplIGlzIHRoZSBsYXN0IGRpbWVuc2lvbi5cbiAgICAgICAgICAvLyBbYmF0Y2hTaXplLCBkaW0xLCBkaW0yLCAuLi5dIC0+IFtkaW0xLCBkaW0yLCAuLi4sIGJhdGNoU2l6ZV1cbiAgICAgICAgICBsZXQgdHJhbnNwb3NlZCA9IGZhbHNlO1xuICAgICAgICAgIGZvciAoY29uc3QgeCBvZiBpbnB1dHMpIHtcbiAgICAgICAgICAgIGNvbnN0IHhORGltID0geC5yYW5rO1xuICAgICAgICAgICAgaWYgKHhORGltID09IG51bGwpIHtcbiAgICAgICAgICAgICAgY29uc3QgeFNoYXBlID0geC5zaGFwZTtcbiAgICAgICAgICAgICAgY29uc3QgYmF0Y2hTaXplID0geFNoYXBlWzBdO1xuICAgICAgICAgICAgICBjb25zdCBuZXdTaGFwZSA9IHhTaGFwZS5zbGljZSgxKS5jb25jYXQoW2JhdGNoU2l6ZV0pO1xuICAgICAgICAgICAgICBsZXQgeFRyYW5zcG9zZWQgPSB0ZmMucmVzaGFwZShcbiAgICAgICAgICAgICAgICAgIHgsIFtiYXRjaFNpemVdLmNvbmNhdChtYXRoVXRpbHMuYXJyYXlQcm9kKHhTaGFwZS5zbGljZSgxKSkpKTtcbiAgICAgICAgICAgICAgeFRyYW5zcG9zZWQgPSB0ZmMudHJhbnNwb3NlKHhUcmFuc3Bvc2VkLCBbMSwgMF0pO1xuICAgICAgICAgICAgICB4VHJhbnNwb3NlZCA9IHRmYy5yZXNoYXBlKHhUcmFuc3Bvc2VkLCBuZXdTaGFwZSk7XG4gICAgICAgICAgICAgIHJlc2hhcGVkSW5wdXRzLnB1c2goeFRyYW5zcG9zZWQpO1xuICAgICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoeE5EaW0gPiAxKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGRpbXMgPSBtYXRoVXRpbHMucmFuZ2UoMSwgeE5EaW0pLmNvbmNhdChbMF0pO1xuICAgICAgICAgICAgICByZXNoYXBlZElucHV0cy5wdXNoKHRmYy50cmFuc3Bvc2UoeCwgZGltcykpO1xuICAgICAgICAgICAgICB0cmFuc3Bvc2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFdlIGRvbid0IHRyYW5zcG9zZSBpbnB1dHMgaWYgdGhleSBhcmUgMUQgdmVjdG9ycyBvciBzY2FsYXJzLlxuICAgICAgICAgICAgICByZXNoYXBlZElucHV0cy5wdXNoKHgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBsZXQgeSA9IHRoaXMubWVyZ2VGdW5jdGlvbihyZXNoYXBlZElucHV0cyk7XG4gICAgICAgICAgY29uc3QgeU5EaW0gPSB5LnJhbms7XG4gICAgICAgICAgaWYgKHRyYW5zcG9zZWQpIHtcbiAgICAgICAgICAgIC8vIElmIGlucHV0cyBoYXZlIGJlZW4gdHJhbnNwb3NlZCwgd2UgaGF2ZSB0byB0cmFuc3Bvc2UgdGhlIG91dHB1dFxuICAgICAgICAgICAgLy8gdG9vLlxuICAgICAgICAgICAgaWYgKHlORGltID09IG51bGwpIHtcbiAgICAgICAgICAgICAgY29uc3QgeVNoYXBlID0geS5zaGFwZTtcbiAgICAgICAgICAgICAgY29uc3QgeU5EaW0gPSB5U2hhcGUubGVuZ3RoO1xuICAgICAgICAgICAgICBjb25zdCBiYXRjaFNpemUgPSB5U2hhcGVbeU5EaW0gLSAxXTtcbiAgICAgICAgICAgICAgY29uc3QgbmV3U2hhcGUgPVxuICAgICAgICAgICAgICAgICAgW2JhdGNoU2l6ZV0uY29uY2F0KHlTaGFwZS5zbGljZSgwLCB5U2hhcGUubGVuZ3RoIC0gMSkpO1xuICAgICAgICAgICAgICB5ID0gdGZjLnJlc2hhcGUoXG4gICAgICAgICAgICAgICAgICB0ZmMudHJhbnNwb3NlKHRmYy5yZXNoYXBlKHksIFstMSwgYmF0Y2hTaXplXSksIFsxLCAwXSksXG4gICAgICAgICAgICAgICAgICBuZXdTaGFwZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHlORGltID4gMSkge1xuICAgICAgICAgICAgICBjb25zdCBkaW1zID0gW3lORGltIC0gMV0uY29uY2F0KG1hdGhVdGlscy5yYW5nZSgwLCB5TkRpbSAtIDEpKTtcbiAgICAgICAgICAgICAgeSA9IHRmYy50cmFuc3Bvc2UoeSwgZGltcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB5O1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXJnZUZ1bmN0aW9uKGlucHV0cyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlT3V0cHV0U2hhcGUoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IFNoYXBlfFNoYXBlW10ge1xuICAgIGlucHV0U2hhcGUgPSBpbnB1dFNoYXBlIGFzIFNoYXBlW107XG4gICAgbGV0IG91dHB1dFNoYXBlOiBTaGFwZTtcbiAgICBpZiAoaW5wdXRTaGFwZVswXSA9PSBudWxsKSB7XG4gICAgICBvdXRwdXRTaGFwZSA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dFNoYXBlID0gaW5wdXRTaGFwZVswXS5zbGljZSgxKTtcbiAgICB9XG4gICAgZm9yIChsZXQgaSA9IDE7IGkgPCBpbnB1dFNoYXBlLmxlbmd0aDsgKytpKSB7XG4gICAgICBjb25zdCBzaGFwZSA9IGlucHV0U2hhcGVbaV0gPT0gbnVsbCA/IG51bGwgOiBpbnB1dFNoYXBlW2ldLnNsaWNlKDEpO1xuICAgICAgb3V0cHV0U2hhcGUgPSB0aGlzLmNvbXB1dGVFbGVtZW50d2lzZU9wT3V0cHV0U2hhcGUob3V0cHV0U2hhcGUsIHNoYXBlKTtcbiAgICB9XG5cbiAgICBsZXQgYmF0Y2hTaXplczogbnVtYmVyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNoYXBlIG9mIGlucHV0U2hhcGUpIHtcbiAgICAgIGlmIChzaGFwZSAhPSBudWxsICYmIHNoYXBlWzBdICE9PSBudWxsKSB7XG4gICAgICAgIGJhdGNoU2l6ZXMucHVzaChzaGFwZVswXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGJhdGNoU2l6ZXMgPSBnZW5lcmljX3V0aWxzLnVuaXF1ZShiYXRjaFNpemVzKTtcbiAgICBpZiAoYmF0Y2hTaXplcy5sZW5ndGggPT09IDEpIHtcbiAgICAgIG91dHB1dFNoYXBlID0gYmF0Y2hTaXplcy5jb25jYXQob3V0cHV0U2hhcGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXRTaGFwZSA9IFtudWxsXS5jb25jYXQob3V0cHV0U2hhcGUpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0U2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlTWFzayhpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwgbWFzaz86IFRlbnNvcnxUZW5zb3JbXSk6XG4gICAgICBUZW5zb3Ige1xuICAgIHJldHVybiB0ZmMudGlkeSgoKSA9PiB7XG4gICAgICBpZiAobWFzayA9PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1hc2spKSB7XG4gICAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKCdgbWFza2Agc2hvdWxkIGJlIGFuIEFycmF5Jyk7XG4gICAgICB9XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkoaW5wdXRzKSkge1xuICAgICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcignYGlucHV0c2Agc2hvdWxkIGJlIGFuIEFycmF5Jyk7XG4gICAgICB9XG4gICAgICBpZiAobWFzay5sZW5ndGggIT09IGlucHV0cy5sZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgICBgVGhlIEFycmF5ICdpbnB1dHMnIGFuZCAnbWFzaycgYXJlIGV4cGVjdGVkIHRvIGhhdmUgdGhlIHNhbWUgYCArXG4gICAgICAgICAgICBgbGVuZ3RoLCBidXQgaGF2ZSBkaWZmZXJlbnQgbGVuZ3RocyBgICtcbiAgICAgICAgICAgIGAoJHtpbnB1dHMubGVuZ3RofSB2cyAke21hc2subGVuZ3RofSlgKTtcbiAgICAgIH1cbiAgICAgIGlmIChtYXNrLmV2ZXJ5KG0gPT4gbSA9PSBudWxsKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIG1hc2sgPSBtYXNrLm1hcChtID0+IG0gPT0gbnVsbCA/IG0gOiB0ZmMuZXhwYW5kRGltcyhtLCAwKSk7XG4gICAgICBsZXQgb3V0cHV0ID0gbWFza1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgbWFzay5sZW5ndGggLSAxOyArK2kpIHtcbiAgICAgICAgb3V0cHV0ID0gdGZjLmxvZ2ljYWxBbmQob3V0cHV0LCBtYXNrW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFkZCBleHRlbmRzIE1lcmdlIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnQWRkJztcbiAgY29uc3RydWN0b3IoYXJncz86IExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIG1lcmdlRnVuY3Rpb24oaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgbGV0IG91dHB1dCA9IGlucHV0c1swXS5jbG9uZSgpO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBpbnB1dHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgb3V0cHV0ID0gdGZjLmFkZChvdXRwdXQsIGlucHV0c1tpXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoQWRkKTtcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGVsZW1lbnQtd2lzZSBzdW0gb2YgaW5wdXRzLCB3aGljaCBhbGwgaGF2ZSB0aGUgc2FtZSBzaGFwZS5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGluIHRocmVlIHdheXMuXG4gKlxuICogMS4gQ29uc3RydWN0IGFuIGluc3RhbmNlIG9mIGBBZGRgIGxheWVyLCBieSB1c2luZyBubyBpbnB1dCBhcmd1bWVudFxuICogICAgb3IgYSBzaW5nbGUgY29uZmlndXJhdGlvbiBhcmd1bWVudC4gVGhlIHJlc3VsdGFudCBgQWRkYCBsYXllciBjYW4gdGhlblxuICogICAgYmUgdXNlZCBvbiBgdGYuU3ltYm9saWNUZW5zb3JgcyBvciBgdGYuVGVuc29yYHMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBhZGRMYXllciA9IHRmLmxheWVycy5hZGQoKTtcbiAqXG4gKiAvLyBUaGUgbGF5ZXIgY2FuIGJlIGFwcGxpZWQgdG8gaW5wdXRzLlxuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSBhZGRMYXllci5hcHBseShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDIuIEludm9rZSBkaXJlY3RseSBvbiBhbiBgQXJyYXlgIG9mIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuU3ltYm9saWNUZW5zb3JgLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSB0Zi5sYXllcnMuYWRkKFtpbnB1dDEsIGlucHV0Ml0pO1xuICogY29uc29sZS5sb2cob3V0cHV0LnNoYXBlKTtcbiAqIC8vIFlvdSBnZXQgW251bGwsIDIsIDJdLCB3aXRoIHRoZSBmaXJzdCBkaW1lbnNpb24gYXMgdGhlIHVuZGV0ZXJtaW5lZCBiYXRjaFxuICogLy8gZGltZW5zaW9uLlxuICogYGBgXG4gKlxuICogMy4gSW52b2tlIGRpcmVjdGx5IG9uIGB0Zi5UZW5zb3JgcywgaS5lLiwgY29uY3JldGUgdmFsdWVzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuVGVuc29yYCBhcyB0aGUgcmVzdWx0IG9mIHRoZSBjb21wdXRhdGlvbi4gRm9yXG4gKiBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi50ZW5zb3IyZChbMSwgMiwgMywgNF0sIFsyLCAyXSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi50ZW5zb3IyZChbMTAsIDIwLCAzMCwgNDBdLCBbMiwgMl0pO1xuICogdGYubGF5ZXJzLmFkZChbaW5wdXQxLCBpbnB1dDJdKS5wcmludCgpO1xuICogLy8gR2l2ZXMgW1sxMSwgMjJdLCBbMzMsIDQ0XV0uXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWRkKGNvbmZpZz86IFN5bWJvbGljVGVuc29yW118VGVuc29yW118TGF5ZXJBcmdzKTogTGF5ZXJ8XG4gICAgU3ltYm9saWNUZW5zb3J8VGVuc29yIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnKSkge1xuICAgIGNvbnN0IGxheWVyID0gbmV3IEFkZCh7fSk7XG4gICAgcmV0dXJuIGxheWVyLmFwcGx5KGNvbmZpZykgYXMgU3ltYm9saWNUZW5zb3IgfCBUZW5zb3I7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBBZGQoY29uZmlnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgTXVsdGlwbHkgZXh0ZW5kcyBNZXJnZSB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ011bHRpcGx5JztcbiAgY29uc3RydWN0b3IoYXJncz86IExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIG1lcmdlRnVuY3Rpb24oaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgbGV0IG91dHB1dCA9IGlucHV0c1swXS5jbG9uZSgpO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBpbnB1dHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgb3V0cHV0ID0gdGZjLm11bChvdXRwdXQsIGlucHV0c1tpXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3V0cHV0O1xuICAgIH0pO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTXVsdGlwbHkpO1xuXG4vKipcbiAqIENhbGN1bGF0ZSB0aGUgZWxlbWVudC13aXNlIHByb2R1Y3Qgb2YgaW5wdXRzLCB3aGljaCBhbGwgaGF2ZSB0aGUgc2FtZSBzaGFwZS5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGluIHRocmVlIHdheXMuXG4gKlxuICogMS4gQ29uc3RydWN0IGFuIGluc3RhbmNlIG9mIGBNdWx0aXBseWAgbGF5ZXIsIGJ5IHVzaW5nIG5vIGlucHV0IGFyZ3VtZW50XG4gKiAgICBvciBhIHNpbmdsZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50LiBUaGUgcmVzdWx0YW50IGBNdWx0aXBseWAgbGF5ZXIgY2FuXG4gKiAgICB0aGVuIGJlIHVzZWQgb24gYHRmLlN5bWJvbGljVGVuc29yYHMgb3IgYHRmLlRlbnNvcmBzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbXVsdGlwbHlMYXllciA9IHRmLmxheWVycy5tdWx0aXBseSgpO1xuICpcbiAqIC8vIFRoZSBsYXllciBjYW4gYmUgYXBwbGllZCB0byBpbnB1dHMuXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICogY29uc3QgaW5wdXQyID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IG91dHB1dCA9IG11bHRpcGx5TGF5ZXIuYXBwbHkoW2lucHV0MSwgaW5wdXQyXSk7XG4gKiBjb25zb2xlLmxvZyhvdXRwdXQuc2hhcGUpO1xuICogLy8gWW91IGdldCBbbnVsbCwgMiwgMl0sIHdpdGggdGhlIGZpcnN0IGRpbWVuc2lvbiBhcyB0aGUgdW5kZXRlcm1pbmVkIGJhdGNoXG4gKiAvLyBkaW1lbnNpb24uXG4gKiBgYGBcbiAqXG4gKiAyLiBJbnZva2UgZGlyZWN0bHkgb24gYW4gYEFycmF5YCBvZiBgdGYuU3ltYm9saWNUZW5zb3Jgcy4gVGhpcyBjb25zdHJ1Y3RzXG4gKiAgICBhbiBgTGF5ZXJgIG9iamVjdCBpbnRlcm5hbGx5IGFuZCBjYWxscyBpdHMgYGFwcGx5YCBtZXRob2Qgb24gdGhlIGlucHV0cyxcbiAqICAgIGdlbmVyYXRpbmcgYSBuZXcgYHRmLlN5bWJvbGljVGVuc29yYC4gRm9yIGV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IGlucHV0MSA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICogY29uc3Qgb3V0cHV0ID0gdGYubGF5ZXJzLm11bHRpcGx5KFtpbnB1dDEsIGlucHV0Ml0pO1xuICogY29uc29sZS5sb2cob3V0cHV0LnNoYXBlKTtcbiAqIC8vIFlvdSBnZXQgW251bGwsIDIsIDJdLCB3aXRoIHRoZSBmaXJzdCBkaW1lbnNpb24gYXMgdGhlIHVuZGV0ZXJtaW5lZCBiYXRjaFxuICogLy8gZGltZW5zaW9uLlxuICogYGBgXG4gKlxuICogMy4gSW52b2tlIGRpcmVjdGx5IG9uIGB0Zi5UZW5zb3JgcywgaS5lLiwgY29uY3JldGUgdmFsdWVzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuVGVuc29yYCBhcyB0aGUgcmVzdWx0IG9mIHRoZSBjb21wdXRhdGlvbi4gRm9yXG4gKiBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi50ZW5zb3IyZChbMSwgMiwgMywgNF0sIFsyLCAyXSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi50ZW5zb3IyZChbMTAsIDIwLCAzMCwgNDBdLCBbMiwgMl0pO1xuICogdGYubGF5ZXJzLm11bHRpcGx5KFtpbnB1dDEsIGlucHV0Ml0pLnByaW50KCk7XG4gKiAvLyBHaXZlcyBbWzEwLCA0MF0sIFs5MCwgMTYwXV0uXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gbXVsdGlwbHkoY29uZmlnPzogU3ltYm9saWNUZW5zb3JbXXxUZW5zb3JbXXxMYXllckFyZ3MpOiBMYXllcnxcbiAgICBTeW1ib2xpY1RlbnNvcnxUZW5zb3Ige1xuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcpKSB7XG4gICAgY29uc3QgbGF5ZXIgPSBuZXcgTXVsdGlwbHkoe30pO1xuICAgIHJldHVybiBsYXllci5hcHBseShjb25maWcpIGFzIFN5bWJvbGljVGVuc29yIHwgVGVuc29yO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgTXVsdGlwbHkoY29uZmlnKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgQXZlcmFnZSBleHRlbmRzIE1lcmdlIHtcbiAgLyoqIEBub2NvbGxhcHNlICovXG4gIHN0YXRpYyBjbGFzc05hbWUgPSAnQXZlcmFnZSc7XG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBMYXllckFyZ3MpIHtcbiAgICBzdXBlcihhcmdzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBvdmVycmlkZSBtZXJnZUZ1bmN0aW9uKGlucHV0czogVGVuc29yW10pOiBUZW5zb3Ige1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGxldCBvdXRwdXQgPSBpbnB1dHNbMF0uY2xvbmUoKTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgaW5wdXRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIG91dHB1dCA9IHRmYy5hZGQob3V0cHV0LCBpbnB1dHNbaV0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRmYy5tdWwoMSAvIGlucHV0cy5sZW5ndGgsIG91dHB1dCk7XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhBdmVyYWdlKTtcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGVsZW1lbnQtd2lzZSBhcml0aG1ldGljIG1lYW4gb2YgaW5wdXRzLCB3aGljaCBhbGwgaGF2ZSB0aGUgc2FtZVxuICogc2hhcGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBpbiB0aHJlZSB3YXlzLlxuICpcbiAqIDEuIENvbnN0cnVjdCBhbiBpbnN0YW5jZSBvZiBgQXZlcmFnZWAgbGF5ZXIsIGJ5IHVzaW5nIG5vIGlucHV0IGFyZ3VtZW50XG4gKiAgICBvciBhIHNpbmdsZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50LiBUaGUgcmVzdWx0YW50IGBBdmVyYWdlYCBsYXllciBjYW4gdGhlblxuICogICAgYmUgdXNlZCBvbiBgdGYuU3ltYm9saWNUZW5zb3JgcyBvciBgdGYuVGVuc29yYHMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBhdmVyYWdlTGF5ZXIgPSB0Zi5sYXllcnMuYXZlcmFnZSgpO1xuICpcbiAqIC8vIFRoZSBsYXllciBjYW4gYmUgYXBwbGllZCB0byBpbnB1dHMuXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICogY29uc3QgaW5wdXQyID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IG91dHB1dCA9IGF2ZXJhZ2VMYXllci5hcHBseShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDIuIEludm9rZSBkaXJlY3RseSBvbiBhbiBgQXJyYXlgIG9mIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuU3ltYm9saWNUZW5zb3JgLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSB0Zi5sYXllcnMuYXZlcmFnZShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDMuIEludm9rZSBkaXJlY3RseSBvbiBgdGYuVGVuc29yYHMsIGkuZS4sIGNvbmNyZXRlIHZhbHVlcy4gVGhpcyBjb25zdHJ1Y3RzXG4gKiAgICBhbiBgTGF5ZXJgIG9iamVjdCBpbnRlcm5hbGx5IGFuZCBjYWxscyBpdHMgYGFwcGx5YCBtZXRob2Qgb24gdGhlIGlucHV0cyxcbiAqICAgIGdlbmVyYXRpbmcgYSBuZXcgYHRmLlRlbnNvcmAgYXMgdGhlIHJlc3VsdCBvZiB0aGUgY29tcHV0YXRpb24uIEZvclxuICogZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYudGVuc29yMmQoWzEsIDIsIDMsIDRdLCBbMiwgMl0pO1xuICogY29uc3QgaW5wdXQyID0gdGYudGVuc29yMmQoWzEwLCAyMCwgMzAsIDQwXSwgWzIsIDJdKTtcbiAqIHRmLmxheWVycy5hdmVyYWdlKFtpbnB1dDEsIGlucHV0Ml0pLnByaW50KCk7XG4gKiAvLyBHaXZlcyBbWzUuNSwgMTFdLCBbMTYuNSwgMjJdXS5cbiAqXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhdmVyYWdlKGNvbmZpZz86IFN5bWJvbGljVGVuc29yW118VGVuc29yW118TGF5ZXJBcmdzKTogTGF5ZXJ8XG4gICAgU3ltYm9saWNUZW5zb3J8VGVuc29yIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnKSkge1xuICAgIGNvbnN0IGxheWVyID0gbmV3IEF2ZXJhZ2Uoe30pO1xuICAgIHJldHVybiBsYXllci5hcHBseShjb25maWcpIGFzIFN5bWJvbGljVGVuc29yIHwgVGVuc29yO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgQXZlcmFnZShjb25maWcpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNYXhpbXVtIGV4dGVuZHMgTWVyZ2Uge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdNYXhpbXVtJztcbiAgY29uc3RydWN0b3IoYXJncz86IExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIG1lcmdlRnVuY3Rpb24oaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgbGV0IG91dHB1dCA9IGlucHV0c1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgaW5wdXRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIG91dHB1dCA9IHRmYy5tYXhpbXVtKG91dHB1dCwgaW5wdXRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhNYXhpbXVtKTtcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGVsZW1lbnQtd2lzZSBtYXhpbXVtIG9mIGlucHV0cywgd2hpY2ggYWxsIGhhdmUgdGhlIHNhbWUgc2hhcGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBpbiB0aHJlZSB3YXlzLlxuICpcbiAqIDEuIENvbnN0cnVjdCBhbiBpbnN0YW5jZSBvZiBgTWF4aW11bWAgbGF5ZXIsIGJ5IHVzaW5nIG5vIGlucHV0IGFyZ3VtZW50XG4gKiAgICBvciBhIHNpbmdsZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50LiBUaGUgcmVzdWx0YW50IGBNYXhpbXVtYCBsYXllciBjYW4gdGhlblxuICogICAgYmUgdXNlZCBvbiBgdGYuU3ltYm9saWNUZW5zb3JgcyBvciBgdGYuVGVuc29yYHMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBtYXhpbXVtTGF5ZXIgPSB0Zi5sYXllcnMubWF4aW11bSgpO1xuICpcbiAqIC8vIFRoZSBsYXllciBjYW4gYmUgYXBwbGllZCB0byBpbnB1dHMuXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICogY29uc3QgaW5wdXQyID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IG91dHB1dCA9IG1heGltdW1MYXllci5hcHBseShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDIuIEludm9rZSBkaXJlY3RseSBvbiBhbiBgQXJyYXlgIG9mIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuU3ltYm9saWNUZW5zb3JgLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSB0Zi5sYXllcnMubWF4aW11bShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDMuIEludm9rZSBkaXJlY3RseSBvbiBgdGYuVGVuc29yYHMsIGkuZS4sIGNvbmNyZXRlIHZhbHVlcy4gVGhpcyBjb25zdHJ1Y3RzXG4gKiAgICBhbiBgTGF5ZXJgIG9iamVjdCBpbnRlcm5hbGx5IGFuZCBjYWxscyBpdHMgYGFwcGx5YCBtZXRob2Qgb24gdGhlIGlucHV0cyxcbiAqICAgIGdlbmVyYXRpbmcgYSBuZXcgYHRmLlRlbnNvcmAgYXMgdGhlIHJlc3VsdCBvZiB0aGUgY29tcHV0YXRpb24uIEZvclxuICogZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYudGVuc29yMmQoWzEsIDIwLCAzLCA0MF0sIFsyLCAyXSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi50ZW5zb3IyZChbMTAsIDIsIDMwLCA0XSwgWzIsIDJdKTtcbiAqIHRmLmxheWVycy5tYXhpbXVtKFtpbnB1dDEsIGlucHV0Ml0pLnByaW50KCk7XG4gKiAvLyBHaXZlcyBbWzEwLCAyMF0sIFszMCwgNDBdXS5cbiAqXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXhpbXVtKGNvbmZpZz86IFN5bWJvbGljVGVuc29yW118VGVuc29yW118TGF5ZXJBcmdzKTogTGF5ZXJ8XG4gICAgU3ltYm9saWNUZW5zb3J8VGVuc29yIHtcbiAgaWYgKEFycmF5LmlzQXJyYXkoY29uZmlnKSkge1xuICAgIGNvbnN0IGxheWVyID0gbmV3IE1heGltdW0oe30pO1xuICAgIHJldHVybiBsYXllci5hcHBseShjb25maWcpIGFzIFN5bWJvbGljVGVuc29yIHwgVGVuc29yO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgTWF4aW11bShjb25maWcpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNaW5pbXVtIGV4dGVuZHMgTWVyZ2Uge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdNaW5pbXVtJztcbiAgY29uc3RydWN0b3IoYXJncz86IExheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIG1lcmdlRnVuY3Rpb24oaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgbGV0IG91dHB1dCA9IGlucHV0c1swXTtcbiAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgaW5wdXRzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIG91dHB1dCA9IHRmYy5taW5pbXVtKG91dHB1dCwgaW5wdXRzW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvdXRwdXQ7XG4gICAgfSk7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhNaW5pbXVtKTtcblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGVsZW1lbnQtd2lzZSBtaW5pbXVtIG9mIGlucHV0cywgd2hpY2ggYWxsIGhhdmUgdGhlIHNhbWUgc2hhcGUuXG4gKlxuICogVGhpcyBmdW5jdGlvbiBjYW4gYmUgaW52b2tlZCBpbiB0aHJlZSB3YXlzLlxuICpcbiAqIDEuIENvbnN0cnVjdCBhbiBpbnN0YW5jZSBvZiBgTWluaW11bWAgbGF5ZXIsIGJ5IHVzaW5nIG5vIGlucHV0IGFyZ3VtZW50XG4gKiAgICBvciBhIHNpbmdsZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50LiBUaGUgcmVzdWx0YW50IGBNaW5pbXVtYCBsYXllciBjYW4gdGhlblxuICogICAgYmUgdXNlZCBvbiBgdGYuU3ltYm9saWNUZW5zb3JgcyBvciBgdGYuVGVuc29yYHMuIEZvciBleGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiBjb25zdCBtaW5pbXVtTGF5ZXIgPSB0Zi5sYXllcnMubWluaW11bSgpO1xuICpcbiAqIC8vIFRoZSBsYXllciBjYW4gYmUgYXBwbGllZCB0byBpbnB1dHMuXG4gKiBjb25zdCBpbnB1dDEgPSB0Zi5pbnB1dCh7c2hhcGU6IFsyLCAyXX0pO1xuICogY29uc3QgaW5wdXQyID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IG91dHB1dCA9IG1pbmltdW1MYXllci5hcHBseShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDIuIEludm9rZSBkaXJlY3RseSBvbiBhbiBgQXJyYXlgIG9mIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuU3ltYm9saWNUZW5zb3JgLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgMl19KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDJdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSB0Zi5sYXllcnMubWluaW11bShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCAyXSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbi5cbiAqIGBgYFxuICpcbiAqIDMuIEludm9rZSBkaXJlY3RseSBvbiBgdGYuVGVuc29yYHMsIGkuZS4sIGNvbmNyZXRlIHZhbHVlcy4gVGhpcyBjb25zdHJ1Y3RzXG4gKiAgICBhbiBgTGF5ZXJgIG9iamVjdCBpbnRlcm5hbGx5IGFuZCBjYWxscyBpdHMgYGFwcGx5YCBtZXRob2Qgb24gdGhlIGlucHV0cyxcbiAqICAgIGdlbmVyYXRpbmcgYSBuZXcgYHRmLlRlbnNvcmAgYXMgdGhlIHJlc3VsdCBvZiB0aGUgY29tcHV0YXRpb24uIEZvclxuICogZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYudGVuc29yMmQoWzEsIDIwLCAzLCA0MF0sIFsyLCAyXSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi50ZW5zb3IyZChbMTAsIDIsIDMwLCA0XSwgWzIsIDJdKTtcbiAqIHRmLmxheWVycy5taW5pbXVtKFtpbnB1dDEsIGlucHV0Ml0pLnByaW50KCk7XG4gKiAvLyBHaXZlcyBbWzEsIDJdLCBbMywgNF1dLlxuICpcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1pbmltdW0oY29uZmlnPzogU3ltYm9saWNUZW5zb3JbXXxUZW5zb3JbXXxMYXllckFyZ3MpOiBMYXllcnxcbiAgICBTeW1ib2xpY1RlbnNvcnxUZW5zb3Ige1xuICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcpKSB7XG4gICAgY29uc3QgbGF5ZXIgPSBuZXcgTWluaW11bSh7fSk7XG4gICAgcmV0dXJuIGxheWVyLmFwcGx5KGNvbmZpZykgYXMgU3ltYm9saWNUZW5zb3IgfCBUZW5zb3I7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBNaW5pbXVtKGNvbmZpZyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIENvbmNhdGVuYXRlTGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIEF4aXMgYWxvbmcgd2hpY2ggdG8gY29uY2F0ZW5hdGUuXG4gICAqL1xuICBheGlzPzogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgQ29uY2F0ZW5hdGUgZXh0ZW5kcyBNZXJnZSB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0NvbmNhdGVuYXRlJztcbiAgcmVhZG9ubHkgREVGQVVMVF9BWElTID0gLTE7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBDb25jYXRlbmF0ZUxheWVyQXJncykge1xuICAgIHN1cGVyKGFyZ3MpO1xuICAgIGlmIChhcmdzID09IG51bGwpIHtcbiAgICAgIGFyZ3MgPSB7fTtcbiAgICB9XG4gICAgdGhpcy5heGlzID0gYXJncy5heGlzID09IG51bGwgPyB0aGlzLkRFRkFVTFRfQVhJUyA6IGFyZ3MuYXhpcztcbiAgICB0aGlzLnN1cHBvcnRzTWFza2luZyA9IHRydWU7XG4gICAgdGhpcy5yZXNoYXBlUmVxdWlyZWQgPSBmYWxzZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICAvLyBVc2VkIHB1cmVseSBmb3Igc2hhcGUgdmFsaWRhdGlvbi5dXG4gICAgaWYgKCEoQXJyYXkuaXNBcnJheShpbnB1dFNoYXBlKSAmJiBBcnJheS5pc0FycmF5KGlucHV0U2hhcGVbMF0pKSB8fFxuICAgICAgICBpbnB1dFNoYXBlLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ0EgYENvbmNhdGVuYXRlYCBsYXllciBzaG91bGQgYmUgY2FsbGVkIG9uIGEgbGlzdCBvZiBhdCBsZWFzdCAyICcgK1xuICAgICAgICAgICdpbnB1dHMnKTtcbiAgICB9XG4gICAgaW5wdXRTaGFwZSA9IGlucHV0U2hhcGUgYXMgU2hhcGVbXTtcblxuICAgIGxldCBhbGxOb25lU2hhcGUgPSB0cnVlO1xuICAgIGZvciAoY29uc3Qgc2hhcGUgb2YgaW5wdXRTaGFwZSkge1xuICAgICAgaWYgKHNoYXBlICE9IG51bGwpIHtcbiAgICAgICAgYWxsTm9uZVNoYXBlID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoYWxsTm9uZVNoYXBlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3Qgc2hhcGVTZXQ6IFNoYXBlW10gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0U2hhcGUubGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IHNoYXBlV2l0aG91dENvbmNhdEF4aXMgPSBpbnB1dFNoYXBlW2ldLnNsaWNlKCk7XG4gICAgICBzaGFwZVdpdGhvdXRDb25jYXRBeGlzLnNwbGljZSh0aGlzLmF4aXMsIDEpO1xuICAgICAgbGV0IGV4aXN0cyA9IGZhbHNlO1xuICAgICAgZm9yIChjb25zdCBzaGFwZSBvZiBzaGFwZVNldCkge1xuICAgICAgICBpZiAodXRpbC5hcnJheXNFcXVhbChzaGFwZSwgc2hhcGVXaXRob3V0Q29uY2F0QXhpcykpIHtcbiAgICAgICAgICBleGlzdHMgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoIWV4aXN0cykge1xuICAgICAgICBzaGFwZVNldC5wdXNoKHNoYXBlV2l0aG91dENvbmNhdEF4aXMpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc2hhcGVTZXQubGVuZ3RoID4gMSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgJ0EgYENvbmNhdGVuYXRlYCBsYXllciByZXF1aXJlcyBpbnB1dHMgd2l0aCBtYXRjaGluZyBzaGFwZXMgJyArXG4gICAgICAgICAgJ2V4Y2VwdCBmb3IgdGhlIGNvbmNhdCBheGlzLiBHb3QgaW5wdXQgc2hhcGVzOiAnICtcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbnB1dFNoYXBlKSk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIG92ZXJyaWRlIG1lcmdlRnVuY3Rpb24oaW5wdXRzOiBUZW5zb3JbXSk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgcmV0dXJuIEsuY29uY2F0ZW5hdGUoaW5wdXRzLCB0aGlzLmF4aXMpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICBpZiAoIShBcnJheS5pc0FycmF5KGlucHV0U2hhcGUpICYmIEFycmF5LmlzQXJyYXkoaW5wdXRTaGFwZVswXSkpKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnQSBgQ29uY2F0ZW5hdGVgIGxheWVyIHNob3VsZCBiZSBjYWxsZWQgb24gYSBsaXN0IG9mIGlucHV0cy4nKTtcbiAgICB9XG4gICAgY29uc3QgaW5wdXRTaGFwZXMgPSBpbnB1dFNoYXBlIGFzIFNoYXBlW107XG4gICAgY29uc3Qgb3V0cHV0U2hhcGUgPSBpbnB1dFNoYXBlc1swXS5zbGljZSgpO1xuICAgIGNvbnN0IGF4aXMgPSB0aGlzLmF4aXMgPCAwID8gb3V0cHV0U2hhcGUubGVuZ3RoICsgdGhpcy5heGlzIDogdGhpcy5heGlzO1xuICAgIC8vIFBvcnRpbmcgTm90ZTogdGhlIGxpbmUgYWJvdmUgaXMgYmVjYXVzZSBUeXBlU2NyaXB0IGRvZXNuJ3Qgc3VwcG9ydFxuICAgIC8vICAgbmVnYXRpdmUgaW5kaWNlcy5cbiAgICBmb3IgKGNvbnN0IHNoYXBlIG9mIGlucHV0U2hhcGVzLnNsaWNlKDEpKSB7XG4gICAgICBpZiAob3V0cHV0U2hhcGVbYXhpc10gPT0gbnVsbCB8fCBzaGFwZVtheGlzXSA9PSBudWxsKSB7XG4gICAgICAgIG91dHB1dFNoYXBlW2F4aXNdID0gbnVsbDtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBvdXRwdXRTaGFwZVtheGlzXSArPSBzaGFwZVtheGlzXTtcbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dFNoYXBlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU1hc2soaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIG1hc2s/OiBUZW5zb3J8VGVuc29yW10pOlxuICAgICAgVGVuc29yIHtcbiAgICBpZiAobWFzayA9PSBudWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KG1hc2spKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcignYG1hc2tgIHNob3VsZCBiZSBhbiBhcnJheSBmb3IgQ29uY2F0ZW5hdGUnKTtcbiAgICB9XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGlucHV0cykpIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKCdgaW5wdXRzYCBzaG91bGQgYmUgYW4gYXJyYXkgZm9yIENvbmNhdGVuYXRlJyk7XG4gICAgfVxuICAgIGlmIChtYXNrLmxlbmd0aCAhPT0gaW5wdXRzLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYE1pc21hdGNoIGluIHRoZSBsZW5ndGggb2YgbWFzayAoJHttYXNrLmxlbmd0aH0pIGAgK1xuICAgICAgICAgIGBhbmQgdGhlIGxlZ250aCBvZiBpbnB1dHMgKCR7aW5wdXRzLmxlbmd0aH0pYCk7XG4gICAgfVxuICAgIHJldHVybiB0ZmMudGlkeSgoKSA9PiB7XG4gICAgICBsZXQgYWxsTnVsbE1hc2tzID0gdHJ1ZTtcbiAgICAgIG1hc2suZm9yRWFjaChtID0+IHtcbiAgICAgICAgaWYgKG0gIT0gbnVsbCkge1xuICAgICAgICAgIGFsbE51bGxNYXNrcyA9IGZhbHNlO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBpZiAoYWxsTnVsbE1hc2tzKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgY29uc3Qgb3V0cHV0TWFza3M6IFRlbnNvcltdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGlucHV0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICBpZiAobWFza1tpXSA9PSBudWxsKSB7XG4gICAgICAgICAgLy8gSW5wdXQgaXMgdW5tYXNrZWQuIEFwcGVuZCBhbGwgMSdzIHRvIG1hc2tzLlxuICAgICAgICAgIG91dHB1dE1hc2tzLnB1c2godGZjLmNhc3QodGZjLm9uZXNMaWtlKGlucHV0c1tpXSksICdib29sJykpO1xuICAgICAgICB9IGVsc2UgaWYgKG1hc2tbaV0ucmFuayA8IGlucHV0c1tpXS5yYW5rKSB7XG4gICAgICAgICAgLy8gTWFzayBpcyBzbWFsbGVyIHRoYW4gdGhlIGlucHV0LCBleHBhbmQgaXQuXG4gICAgICAgICAgb3V0cHV0TWFza3MucHVzaCh0ZmMuZXhwYW5kRGltcyhtYXNrW2ldLCAtMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG91dHB1dE1hc2tzLnB1c2gobWFza1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvbmNhdGVuYXRlZE1hc2tzID0gdGZjLmNvbmNhdChvdXRwdXRNYXNrcywgdGhpcy5heGlzKTtcbiAgICAgIHJldHVybiB0ZmMuYWxsKGNvbmNhdGVuYXRlZE1hc2tzLCAtMSwgZmFsc2UpO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICAnYXhpcyc6IHRoaXMuYXhpcyxcbiAgICB9O1xuICAgIGNvbnN0IGJhc2VDb25maWcgPSBzdXBlci5nZXRDb25maWcoKTtcbiAgICBPYmplY3QuYXNzaWduKGNvbmZpZywgYmFzZUNvbmZpZyk7XG4gICAgcmV0dXJuIGNvbmZpZztcbiAgfVxufVxuc2VyaWFsaXphdGlvbi5yZWdpc3RlckNsYXNzKENvbmNhdGVuYXRlKTtcblxuLyoqXG4gKiBDb25jYXRlbmF0ZSBhbiBgQXJyYXlgIG9mIGlucHV0cy5cbiAqXG4gKiBUaGlzIGZ1bmN0aW9uIGNhbiBiZSBpbnZva2VkIGluIHRocmVlIHdheXMuXG4gKlxuICogMS4gQ29uc3RydWN0IGFuIGluc3RhbmNlIG9mIGBDb25jYXRlbmF0ZWAgbGF5ZXIsIGJ5IHVzaW5nIG5vIGlucHV0IGFyZ3VtZW50XG4gKiAgICBvciBhIHNpbmdsZSBjb25maWd1cmF0aW9uIGFyZ3VtZW50LiBUaGUgcmVzdWx0YW50IGBDb25jYXRlbmF0ZWAgbGF5ZXIgY2FuXG4gKiAgICB0aGVuIGJlIHVzZWQgb24gYHRmLlN5bWJvbGljVGVuc29yYHMgb3IgYHRmLlRlbnNvcmBzLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgY29uY2F0TGF5ZXIgPSB0Zi5sYXllcnMuY29uY2F0ZW5hdGUoKTtcbiAqXG4gKiAvLyBUaGUgbGF5ZXIgY2FuIGJlIGFwcGxpZWQgdG8gaW5wdXRzLlxuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgM119KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDRdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSBjb25jYXRMYXllci5hcHBseShbaW5wdXQxLCBpbnB1dDJdKTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dC5zaGFwZSk7XG4gKiAvLyBZb3UgZ2V0IFtudWxsLCAyLCA3XSwgd2l0aCB0aGUgZmlyc3QgZGltZW5zaW9uIGFzIHRoZSB1bmRldGVybWluZWQgYmF0Y2hcbiAqIC8vIGRpbWVuc2lvbiBhbmQgdGhlIGxhc3QgZGltZW5zaW9uIGFzIHRoZSByZXN1bHQgb2YgY29uY2F0ZW5hdGluZyB0aGVcbiAqIC8vIGxhc3QgZGltZW5zaW9ucyBvZiB0aGUgdHdvIGlucHV0cy5cbiAqIGBgYFxuICpcbiAqIDIuIEludm9rZSBkaXJlY3RseSBvbiBhbiBgQXJyYXlgIG9mIGB0Zi5TeW1ib2xpY1RlbnNvcmBzLiBUaGlzIGNvbnN0cnVjdHNcbiAqICAgIGFuIGBMYXllcmAgb2JqZWN0IGludGVybmFsbHkgYW5kIGNhbGxzIGl0cyBgYXBwbHlgIG1ldGhvZCBvbiB0aGUgaW5wdXRzLFxuICogICAgZ2VuZXJhdGluZyBhIG5ldyBgdGYuU3ltYm9saWNUZW5zb3JgLiBGb3IgZXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogY29uc3QgaW5wdXQxID0gdGYuaW5wdXQoe3NoYXBlOiBbMiwgM119KTtcbiAqIGNvbnN0IGlucHV0MiA9IHRmLmlucHV0KHtzaGFwZTogWzIsIDRdfSk7XG4gKiBjb25zdCBvdXRwdXQgPSB0Zi5sYXllcnMuY29uY2F0ZW5hdGUoW2lucHV0MSwgaW5wdXQyXSk7XG4gKiBjb25zb2xlLmxvZyhvdXRwdXQuc2hhcGUpO1xuICogLy8gWW91IGdldCBbbnVsbCwgMiwgMl0sIHdpdGggdGhlIGZpcnN0IGRpbWVuc2lvbiBhcyB0aGUgdW5kZXRlcm1pbmVkIGJhdGNoXG4gKiAvLyBkaW1lbnNpb24gYW5kIHRoZSBsYXN0IGRpbWVuc2lvbiBhcyB0aGUgcmVzdWx0IG9mIGNvbmNhdGVuYXRpbmcgdGhlXG4gKiAvLyBsYXN0IGRpbWVuc2lvbnMgb2YgdGhlIHR3byBpbnB1dHMuXG4gKiBgYGBcbiAqXG4gKiAzLiBJbnZva2UgZGlyZWN0bHkgb24gYHRmLlRlbnNvcmBzLCBpLmUuLCBjb25jcmV0ZSB2YWx1ZXMuIFRoaXMgY29uc3RydWN0c1xuICogICAgYW4gYExheWVyYCBvYmplY3QgaW50ZXJuYWxseSBhbmQgY2FsbHMgaXRzIGBhcHBseWAgbWV0aG9kIG9uIHRoZSBpbnB1dHMsXG4gKiAgICBnZW5lcmF0aW5nIGEgbmV3IGB0Zi5UZW5zb3JgIGFzIHRoZSByZXN1bHQgb2YgdGhlIGNvbXB1dGF0aW9uLiBGb3JcbiAqIGV4YW1wbGU6XG4gKlxuICogYGBganNcbiAqIGNvbnN0IGlucHV0MSA9IHRmLnRlbnNvcjJkKFtbMSwgMl0sIFszLCA0XV0sIFsyLCAyXSk7XG4gKiBjb25zdCBpbnB1dDIgPSB0Zi50ZW5zb3IyZChbWzEwLCAyMF0sIFszMCwgNDBdXSwgWzIsIDJdKTtcbiAqIHRmLmxheWVycy5jb25jYXRlbmF0ZShbaW5wdXQxLCBpbnB1dDJdKS5wcmludCgpO1xuICogLy8gR2l2ZXMgW1sxLCAyLCAxMCwgMjBdLCBbMywgNCwgMzAsIDQwXV0uXG4gKlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29uY2F0ZW5hdGUoY29uZmlnPzogU3ltYm9saWNUZW5zb3JbXXxUZW5zb3JbXXxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBDb25jYXRlbmF0ZUxheWVyQXJncyk6IExheWVyfFN5bWJvbGljVGVuc29yfFRlbnNvciB7XG4gIGlmIChBcnJheS5pc0FycmF5KGNvbmZpZykpIHtcbiAgICBjb25zdCBsYXllciA9IG5ldyBDb25jYXRlbmF0ZSh7fSk7XG4gICAgcmV0dXJuIGxheWVyLmFwcGx5KGNvbmZpZykgYXMgU3ltYm9saWNUZW5zb3IgfCBUZW5zb3I7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBDb25jYXRlbmF0ZShjb25maWcpO1xuICB9XG59XG5cbmV4cG9ydCBkZWNsYXJlIGludGVyZmFjZSBEb3RMYXllckFyZ3MgZXh0ZW5kcyBMYXllckFyZ3Mge1xuICAvKipcbiAgICogQXhpcyBvciBheGVzIGFsb25nIHdoaWNoIHRoZSBkb3QgcHJvZHVjdCB3aWxsIGJlIHRha2VuLlxuICAgKlxuICAgKiBJbnRlZ2VyIG9yIGFuIEFycmF5IG9mIGludGVnZXJzLlxuICAgKi9cbiAgYXhlczogbnVtYmVyfFtudW1iZXIsIG51bWJlcl07XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gTDItbm9ybWFsaXplIHNhbXBsZXMgYWxvbmcgdGhlIGRvdCBwcm9kdWN0IGF4aXNcbiAgICogYmVmb3JlIHRha2luZyB0aGUgZG90IHByb2R1Y3QuXG4gICAqXG4gICAqIElmIHNldCB0byBgdHJ1ZWAsIHRoZSBvdXRwdXQgb2YgdGhlIGRvdCBwcm9kdWN0IGlzIHRoZSBjb3NpbmVcbiAgICogcHJveGltaXR5IGJldHdlZW4gdGhlIHR3byBzYW1wbGVzLlxuICAgKi9cbiAgbm9ybWFsaXplPzogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBJbnRlcnByZXRhYmxlIHBvdGVudGlhbGx5IG5lZ2F0aXZlIGF4aXMgaW5kZXguXG4gKlxuICogRm9yIGV4YW1wbGUsIGdpdmVuIGF4aXMgPSAtMSwgYW5kIGRpbSA9IDMsIHRoaXMgZnVuY3Rpb24gd2lsbCByZXR1cm4gMi5cbiAqXG4gKiBAcGFyYW0gYXhpcyBUaGUgYXhpcyBpbmRleCwgbWF5IGJlIGEgcG9zaXRpdmUsIHplcm8gb3IgbmVnYXRpdmUgaW50ZWdlci5cbiAqIEBwYXJhbSBkaW0gVG90YWwgbnVtYmVyIG9mIGRpbWVuc2lvbnMsIGEgcG9zaXRpdmUgaW50ZWdlci5cbiAqIEByZXR1cm5zIEEgbm9uLW5lZ2F0aXZlIGF4aXMgaW5kZXggZXF1aXZhbGVudCB0byB0aGUgaW5wdXQgYGF4aXNgLlxuICovXG5mdW5jdGlvbiBpbnRlcnByZXRBeGlzKGF4aXM6IG51bWJlciwgZGltOiBudW1iZXIpOiBudW1iZXIge1xuICB3aGlsZSAoYXhpcyA8IDApIHtcbiAgICBheGlzICs9IGRpbTtcbiAgfVxuICByZXR1cm4gYXhpcztcbn1cblxuZnVuY3Rpb24gYmF0Y2hEb3QoeDogVGVuc29yLCB5OiBUZW5zb3IsIGF4ZXM6IG51bWJlcnxbbnVtYmVyLCBudW1iZXJdKTogVGVuc29yIHtcbiAgaWYgKHguc2hhcGUubGVuZ3RoID4gMyB8fCB5LnNoYXBlLmxlbmd0aCA+IDMpIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgJ2JhdGNoRG90IGlzIG5vdCBpbXBsZW1lbnRlZCBmb3IgdGVuc29ycyBvZiA0RCBvciBoaWdoZXIgcmFuayB5ZXQnKTtcbiAgfVxuICB0ZmMudXRpbC5hc3NlcnQoXG4gICAgICB4LnNoYXBlLmxlbmd0aCA+PSAyLFxuICAgICAgKCkgPT4gYGJhdGNoRG90IHJlcXVpcmVzIHRoZSByYW5rIG9mIHggdG8gYmUgPj0gMiwgYCArXG4gICAgICAgICAgYGJ1dCBnb3QgJHt4LnNoYXBlLmxlbmd0aH1gKTtcbiAgdGZjLnV0aWwuYXNzZXJ0KFxuICAgICAgeC5zaGFwZS5sZW5ndGggPj0gMixcbiAgICAgICgpID0+IGBiYXRjaERvdCByZXF1aXJlcyB0aGUgcmFuayBvZiB5IHRvIGJlID49IDIsIGAgK1xuICAgICAgICAgIGBidXQgZ290ICR7eS5zaGFwZS5sZW5ndGh9YCk7XG5cbiAgaWYgKHR5cGVvZiBheGVzID09PSAnbnVtYmVyJykge1xuICAgIGF4ZXMgPSBbYXhlcywgYXhlc107XG4gIH1cblxuICBpZiAoeC5kdHlwZSA9PT0gJ2NvbXBsZXg2NCcgfHwgeS5kdHlwZSA9PT0gJ2NvbXBsZXg2NCcpIHtcbiAgICB0aHJvdyBuZXcgTm90SW1wbGVtZW50ZWRFcnJvcihcbiAgICAgICAgJ2JhdGNoRG90IGlzIG5vdCBpbXBsZW1lbnRlZCBmb3IgY29tcGxleDY0LXR5cGUgVGVuc29ycyB5ZXQuJyk7XG4gIH1cblxuICBjb25zdCB4TkRpbSA9IHguc2hhcGUubGVuZ3RoO1xuICBjb25zdCB5TkRpbSA9IHkuc2hhcGUubGVuZ3RoO1xuICBpZiAoYXhlcyA9PSBudWxsKSB7XG4gICAgLy8gQmVoYXZlIGxpa2UgYmF0Y2hNYXRtdWwgYnkgZGVmYXVsdC5cbiAgICBheGVzID0gW3hORGltIC0gMSwgeU5EaW0gLSAyXTtcbiAgfVxuICBjb25zdCBheGVzQXJyYXkgPSBheGVzIGFzIFtudW1iZXIsIG51bWJlcl07XG5cbiAgcmV0dXJuIHRmYy50aWR5KCgpID0+IHtcbiAgICBsZXQgZGlmZjogbnVtYmVyO1xuICAgIGlmICh4TkRpbSA+IHlORGltKSB7XG4gICAgICBkaWZmID0geE5EaW0gLSB5TkRpbTtcbiAgICAgIGNvbnN0IGRpZmZTaGFwZTogU2hhcGUgPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGlmZjsgKytpKSB7XG4gICAgICAgIGRpZmZTaGFwZS5wdXNoKDEpO1xuICAgICAgfVxuICAgICAgeSA9IHRmYy5yZXNoYXBlKHksIHkuc2hhcGUuY29uY2F0KGRpZmZTaGFwZSkpO1xuICAgIH0gZWxzZSBpZiAoeU5EaW0gPiB4TkRpbSkge1xuICAgICAgZGlmZiA9IHlORGltIC0geE5EaW07XG4gICAgICBjb25zdCBkaWZmU2hhcGU6IFNoYXBlID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpZmY7ICsraSkge1xuICAgICAgICBkaWZmU2hhcGUucHVzaCgxKTtcbiAgICAgIH1cbiAgICAgIHggPSB0ZmMucmVzaGFwZSh4LCB4LnNoYXBlLmNvbmNhdChkaWZmU2hhcGUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlmZiA9IDA7XG4gICAgfVxuXG4gICAgbGV0IG91dDogVGVuc29yO1xuICAgIGlmICh4LnNoYXBlLmxlbmd0aCA9PT0gMiAmJiB5LnNoYXBlLmxlbmd0aCA9PT0gMikge1xuICAgICAgaWYgKGF4ZXNBcnJheVswXSA9PT0gYXhlc0FycmF5WzFdKSB7XG4gICAgICAgIG91dCA9IHRmYy5zdW0odGZjLm11bCh4LCB5KSwgYXhlc0FycmF5WzBdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dCA9IHRmYy5zdW0odGZjLm11bCh0ZmMudHJhbnNwb3NlKHgsIFsxLCAwXSksIHkpLCBheGVzQXJyYXlbMV0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBhZGpYID0gYXhlc0FycmF5WzBdICE9PSB4LnNoYXBlLmxlbmd0aCAtIDE7XG4gICAgICBjb25zdCBhZGpZID0gYXhlc0FycmF5WzFdID09PSB5LnNoYXBlLmxlbmd0aCAtIDE7XG4gICAgICBvdXQgPSB0ZmMubWF0TXVsKHgsIHksIGFkalgsIGFkalkpO1xuICAgIH1cblxuICAgIGlmIChkaWZmID4gMCkge1xuICAgICAgbGV0IGlkeDogbnVtYmVyO1xuICAgICAgaWYgKHhORGltID4geU5EaW0pIHtcbiAgICAgICAgaWR4ID0geE5EaW0gKyB5TkRpbSAtIDM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZHggPSB4TkRpbSAtIDE7XG4gICAgICB9XG4gICAgICBjb25zdCBzcXVlZXplQXhlczogbnVtYmVyW10gPSBbXTtcbiAgICAgIGZvciAobGV0IGkgPSBpZHg7IGkgPCBpZHggKyBkaWZmOyArK2kpIHtcbiAgICAgICAgc3F1ZWV6ZUF4ZXMucHVzaChpKTtcbiAgICAgIH1cbiAgICAgIG91dCA9IHRmYy5zcXVlZXplKG91dCwgc3F1ZWV6ZUF4ZXMpO1xuICAgIH1cbiAgICBpZiAob3V0LnNoYXBlLmxlbmd0aCA9PT0gMSkge1xuICAgICAgb3V0ID0gdGZjLmV4cGFuZERpbXMob3V0LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbiAgfSk7XG59XG5cbmV4cG9ydCBjbGFzcyBEb3QgZXh0ZW5kcyBNZXJnZSB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0RvdCc7XG5cbiAgcHJpdmF0ZSBheGVzOiBudW1iZXJ8W251bWJlciwgbnVtYmVyXTtcbiAgcHJpdmF0ZSBub3JtYWxpemU6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3IoYXJnczogRG90TGF5ZXJBcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5heGVzID0gYXJncy5heGVzO1xuICAgIHRoaXMubm9ybWFsaXplID0gYXJncy5ub3JtYWxpemUgPT0gbnVsbCA/IGZhbHNlIDogYXJncy5ub3JtYWxpemU7XG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICAgIHRoaXMucmVzaGFwZVJlcXVpcmVkID0gZmFsc2U7XG4gIH1cblxuICBvdmVycmlkZSBidWlsZChpbnB1dFNoYXBlOiBTaGFwZXxTaGFwZVtdKTogdm9pZCB7XG4gICAgdGZjLnV0aWwuYXNzZXJ0KFxuICAgICAgICBBcnJheS5pc0FycmF5KGlucHV0U2hhcGUpICYmIGlucHV0U2hhcGUubGVuZ3RoID09PSAyICYmXG4gICAgICAgICAgICBBcnJheS5pc0FycmF5KGlucHV0U2hhcGVbMF0pICYmIEFycmF5LmlzQXJyYXkoaW5wdXRTaGFwZVsxXSksXG4gICAgICAgICgpID0+ICdBIGBEb3RgIGxheWVyIHNob3VsZCBiZSBjYWxsZWQgb24gYSBsaXN0IG9mIGV4YWN0bHkgMiBpbnB1dHMuJyk7XG4gICAgY29uc3Qgc2hhcGUxID0gaW5wdXRTaGFwZVswXSBhcyBTaGFwZTtcbiAgICBjb25zdCBzaGFwZTIgPSBpbnB1dFNoYXBlWzFdIGFzIFNoYXBlO1xuICAgIGlmIChzaGFwZTEubGVuZ3RoID4gMyB8fCBzaGFwZTIubGVuZ3RoID4gMykge1xuICAgICAgdGhyb3cgbmV3IE5vdEltcGxlbWVudGVkRXJyb3IoXG4gICAgICAgICAgJ0RvdCBsYXllciBkb2VzIG5vdCBzdXBwb3J0IHRlbnNvcnMgb2YgNEQgb3IgaGlnaGVyIHJhbmsgeWV0LicpO1xuICAgIH1cblxuICAgIGNvbnN0IGF4ZXMgPSB0aGlzLmludGVycHJldEF4ZXMoc2hhcGUxLCBzaGFwZTIpO1xuICAgIGlmIChzaGFwZTFbYXhlc1swXV0gIT09IHNoYXBlMltheGVzWzFdXSkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYERpbWVuc2lvbiBpbmNvbXBhdGliaWxpdHk6IGAgK1xuICAgICAgICAgIGAke3NoYXBlMVtheGVzWzBdXX0gIT09ICR7c2hhcGUyW2F4ZXNbMV1dfWApO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBvdmVycmlkZSBtZXJnZUZ1bmN0aW9uKGlucHV0czogVGVuc29yW10pOiBUZW5zb3Ige1xuICAgIGlmIChpbnB1dHMubGVuZ3RoICE9PSAyKSB7XG4gICAgICB0aHJvdyBuZXcgVmFsdWVFcnJvcihcbiAgICAgICAgICAnQSBgRG90YCBsYXllciBtdXN0IGJlIGNhbGxlZCBvbiBleGFjdGx5IDIgaW5wdXRzLCAnICtcbiAgICAgICAgICBgYnV0IHJlY2VpdmVkICR7aW5wdXRzLmxlbmd0aH0gaW5wdXQocykuYCk7XG4gICAgfVxuXG4gICAgbGV0IHgxID0gaW5wdXRzWzBdO1xuICAgIGxldCB4MiA9IGlucHV0c1sxXTtcbiAgICBsZXQgYXhlczogW251bWJlciwgbnVtYmVyXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodGhpcy5heGVzKSkge1xuICAgICAgYXhlcyA9IFtcbiAgICAgICAgaW50ZXJwcmV0QXhpcyh0aGlzLmF4ZXMsIHgxLnNoYXBlLmxlbmd0aCksXG4gICAgICAgIGludGVycHJldEF4aXModGhpcy5heGVzLCB4Mi5zaGFwZS5sZW5ndGgpXG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICBheGVzID0gdGhpcy5heGVzLm1hcChcbiAgICAgICAgICAgICAgICAgKGF4aXMsIGkpID0+IGludGVycHJldEF4aXMoXG4gICAgICAgICAgICAgICAgICAgICBheGlzLCBpbnB1dHNbaV0uc2hhcGUubGVuZ3RoKSkgYXMgW251bWJlciwgbnVtYmVyXTtcbiAgICB9XG4gICAgaWYgKHRoaXMubm9ybWFsaXplKSB7XG4gICAgICB4MSA9IGwyTm9ybWFsaXplKHgxLCBheGVzWzBdKTtcbiAgICAgIHgyID0gbDJOb3JtYWxpemUoeDIsIGF4ZXNbMV0pO1xuICAgIH1cbiAgICByZXR1cm4gYmF0Y2hEb3QoeDEsIHgyLCBheGVzKTtcbiAgfVxuXG4gIHByaXZhdGUgaW50ZXJwcmV0QXhlcyhzaGFwZTE6IFNoYXBlLCBzaGFwZTI6IFNoYXBlKTogbnVtYmVyW10ge1xuICAgIGxldCBheGVzOiBudW1iZXJbXTtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodGhpcy5heGVzKSkge1xuICAgICAgLy8gYHRoaXMuYXhlc2AgaXMgYSBzaW5nbGUgaW50ZWdlci5cbiAgICAgIGF4ZXMgPSBbXG4gICAgICAgIGludGVycHJldEF4aXModGhpcy5heGVzLCBzaGFwZTEubGVuZ3RoKSxcbiAgICAgICAgaW50ZXJwcmV0QXhpcyh0aGlzLmF4ZXMsIHNoYXBlMi5sZW5ndGgpXG4gICAgICBdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBgdGhpcy5heGVzYCBpcyBhbiBBcnJheSBvZiBpbnRlZ2Vycy5cbiAgICAgIGF4ZXMgPSB0aGlzLmF4ZXM7XG4gICAgfVxuICAgIHJldHVybiBheGVzO1xuICB9XG5cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiBTaGFwZXxTaGFwZVtdIHtcbiAgICB0ZmMudXRpbC5hc3NlcnQoXG4gICAgICAgIEFycmF5LmlzQXJyYXkoaW5wdXRTaGFwZSkgJiYgaW5wdXRTaGFwZS5sZW5ndGggPT09IDIgJiZcbiAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoaW5wdXRTaGFwZVswXSkgJiYgQXJyYXkuaXNBcnJheShpbnB1dFNoYXBlWzFdKSxcbiAgICAgICAgKCkgPT4gJ0EgYERvdGAgbGF5ZXIgc2hvdWxkIGJlIGNhbGxlZCBvbiBhIGxpc3Qgb2YgZXhhY3RseSAyIGlucHV0cy4nKTtcbiAgICBjb25zdCBzaGFwZTEgPSAoaW5wdXRTaGFwZVswXSBhcyBTaGFwZSkuc2xpY2UoKTtcbiAgICBjb25zdCBzaGFwZTIgPSAoaW5wdXRTaGFwZVsxXSBhcyBTaGFwZSkuc2xpY2UoKTtcbiAgICBpZiAoc2hhcGUxLmxlbmd0aCA+IDMgfHwgc2hhcGUyLmxlbmd0aCA+IDMpIHtcbiAgICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICAgICdEb3QgbGF5ZXIgZG9lcyBub3Qgc3VwcG9ydCB0ZW5zb3JzIG9mIDREIG9yIGhpZ2hlciByYW5rIHlldC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCBheGVzID0gdGhpcy5pbnRlcnByZXRBeGVzKHNoYXBlMSwgc2hhcGUyKTtcbiAgICBzaGFwZTEuc3BsaWNlKGF4ZXNbMF0sIDEpO1xuICAgIHNoYXBlMi5zcGxpY2UoYXhlc1sxXSwgMSk7XG4gICAgc2hhcGUyLnNwbGljZSgwLCAxKTtcbiAgICBjb25zdCBvdXRwdXRTaGFwZSA9IHNoYXBlMS5jb25jYXQoc2hhcGUyKTtcbiAgICBpZiAob3V0cHV0U2hhcGUubGVuZ3RoID09PSAxKSB7XG4gICAgICBvdXRwdXRTaGFwZS5wdXNoKDEpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0U2hhcGU7XG4gIH1cblxuICBvdmVycmlkZSBjb21wdXRlTWFzayhpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwgbWFzaz86IFRlbnNvcnxUZW5zb3JbXSk6XG4gICAgICBUZW5zb3Ige1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICAnYXhlcyc6IHRoaXMuYXhlcyxcbiAgICAgICdub3JtYWxpemUnOiB0aGlzLm5vcm1hbGl6ZVxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoRG90KTtcblxuLy8gVE9ETyhjYWlzKTogQWRkIGZ1bmN0aW9uYWwgaW50ZXJmYWNlcyBmb3IgdGhlIG1lcmdlIGxheWVycy5cbiJdfQ==