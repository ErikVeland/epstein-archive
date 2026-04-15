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
 * Normalization layers.
 */
import * as tfc from '@tensorflow/tfjs-core';
import { moments, reshape, serialization, tidy, util } from '@tensorflow/tfjs-core';
import { getConstraint, serializeConstraint } from '../constraints';
import { InputSpec, Layer } from '../engine/topology';
import { NotImplementedError, ValueError } from '../errors';
import { getInitializer, serializeInitializer } from '../initializers';
import { getRegularizer, serializeRegularizer } from '../regularizers';
import * as generic_utils from '../utils/generic_utils';
import * as math_utils from '../utils/math_utils';
import { getExactlyOneShape, getExactlyOneTensor } from '../utils/types_utils';
/**
 * Applies batch normalization on x given mean, var, beta and gamma.
 *
 * I.e. returns:
 *   `output = (x - mean) / (sqrt(var) + epsilon) * gamma + beta`
 *
 * @param x Input tensor.
 * @param mean Mean of batch.
 * @param variance Variance of batch.
 * @param beta Tensor with which to center the input.
 * @param gamma Tensor by which to scale the input.
 * @param epsilon Fuzz factor.
 * @returns The result of the batch normalization.
 */
export function batchNormalization(x, mean, variance, beta, gamma, epsilon = 1e-3) {
    let out;
    if (x.rank === 2) {
        out = tfc.batchNorm2d(x, mean, variance, beta, gamma, epsilon);
    }
    else if (x.rank === 3) {
        // TODO(cais): Check rank; give proper error message.
        out = tfc.batchNorm3d(x, mean, variance, beta, gamma, epsilon);
    }
    else if (x.rank === 4) {
        out = tfc.batchNorm4d(x, mean, variance, beta, gamma, epsilon);
    }
    else {
        throw new NotImplementedError(`batchNormalization is not implemented for array of rank ${x.rank} ` +
            `yet`);
    }
    return out;
}
/**
 * Non-broadcasting batch normalization for use in training (not inference).
 *
 * The input is normalized to zero mean and unit variance along the
 * `reductionAxes`, followed by scaling with `gamma` and shifted by `beta`.
 * The result of that is returned as the first element
 * of the returned `Array`. The other two elements are the mean and variance,
 * respectively.
 *
 * @param x Input tensor to be normalized.
 * @param gamma Tensor by which to scale the input.
 * @param beta Tensor by which to center the input.
 * @param reductionAxes Axes over which to normalize.
 * @param epsilon Fuzz factor.
 * @returns An `Array` of three `Tensors`:
 *   [normalized tensor, mean of input, variance of input].
 */
function regularNormalizeBatchInTraining(x, gamma, beta, reductionAxes, epsilon = 1e-3) {
    return tidy(() => {
        const meanAndVariance = tfc.moments(x, reductionAxes);
        const mean = meanAndVariance.mean;
        const variance = meanAndVariance.variance;
        const normed = batchNormalization(x, mean, variance, beta, gamma, epsilon);
        return [normed, mean, variance];
    });
}
/**
 * Broadcasting batch normalization for use in training (not inference).
 *
 * The input is normalized to zero mean and unit variance along the
 * `reductionAxes`, followed by scaling with `gamma` and shifted by `beta`.
 * The result of that is returned as the first element
 * of the returned `Array`. The other two elements are the mean and variance,
 * respectively.
 *
 * @param x Input tensor to be normalized.
 * @param gamma Tensor by which to scale the input.
 * @param beta Tensor by which to center the input.
 * @param reductionAxes Axes over which to normalize.
 * @param epsilon Fuzz factor.
 * @returns An `Array` of three `Tensors`:
 *   [normalized tensor, mean of input, variance of input].
 */
function broadcastNormalizeBatchInTraining(x, gamma, beta, reductionAxes, epsilon = 1e-3) {
    return tidy(() => {
        const meanAndVariance = tfc.moments(x, reductionAxes);
        const mean = meanAndVariance.mean;
        const variance = meanAndVariance.variance;
        const targetShape = [];
        for (const axis of math_utils.range(0, x.rank)) {
            if (reductionAxes.indexOf(axis) !== -1) {
                targetShape.push(1);
            }
            else {
                targetShape.push(x.shape[axis]);
            }
        }
        const broadcastMean = reshape(mean, targetShape);
        const broadcastVariance = reshape(variance, targetShape);
        const broadcastGamma = gamma == null ? null : reshape(gamma, targetShape);
        const broadcastBeta = beta == null ? null : reshape(beta, targetShape);
        const normed = batchNormalization(x, broadcastMean, broadcastVariance, broadcastBeta, broadcastGamma, epsilon);
        return [normed, mean, variance];
    });
}
/**
 * Batch normalization for use in training (not inference).
 *
 * @param x Input tensor to be normalized.
 * @param gamma Tensor by which to scale the input.
 * @param beta Tensor by which to center the input.
 * @param reductionAxes Axes over which to normalize.
 * @param epsilon Fuzz factor.
 * @returns An `Array` of three `Tensors`:
 *   [normalized tensor, mean of input, variance of input].
 */
export function normalizeBatchInTraining(x, gamma, beta, reductionAxes, epsilon = 1e-3) {
    if (util.arraysEqual(reductionAxes.slice().sort(), math_utils.range(0, x.rank - 1))) {
        return regularNormalizeBatchInTraining(x, gamma, beta, reductionAxes, epsilon);
    }
    else {
        return broadcastNormalizeBatchInTraining(x, gamma, beta, reductionAxes, epsilon);
    }
}
class BatchNormalization extends Layer {
    constructor(args) {
        if (args == null) {
            args = {};
        }
        super(args);
        this.supportsMasking = true;
        this.axis = args.axis == null ? -1 : args.axis;
        this.momentum = args.momentum == null ? 0.99 : args.momentum;
        this.epsilon = args.epsilon == null ? 1e-3 : args.epsilon;
        this.center = args.center == null ? true : args.center;
        this.scale = args.scale == null ? true : args.scale;
        this.betaInitializer = getInitializer(args.betaInitializer || 'zeros');
        this.gammaInitializer = getInitializer(args.gammaInitializer || 'ones');
        this.movingMeanInitializer =
            getInitializer(args.movingMeanInitializer || 'zeros');
        this.movingVarianceInitializer =
            getInitializer(args.movingVarianceInitializer || 'ones');
        this.betaConstraint = getConstraint(args.betaConstraint);
        this.gammaConstraint = getConstraint(args.gammaConstraint);
        this.betaRegularizer = getRegularizer(args.betaRegularizer);
        this.gammaRegularizer = getRegularizer(args.gammaRegularizer);
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const axis = this.axis >= 0 ? this.axis : (this.axis + inputShape.length);
        const dim = inputShape[axis];
        if (dim == null) {
            throw new ValueError(`Axis ${axis} of input tensor should have a defined dimension but ` +
                `the layer received an input with shape ` +
                `${JSON.stringify(inputShape)}.`);
        }
        this.inputSpec =
            [new InputSpec({ ndim: inputShape.length, axes: { [axis]: dim } })];
        const shape = [dim];
        if (this.scale) {
            this.gamma = this.addWeight('gamma', shape, null, this.gammaInitializer, this.gammaRegularizer, true, this.gammaConstraint);
        }
        if (this.center) {
            this.beta = this.addWeight('beta', shape, null, this.betaInitializer, this.betaRegularizer, true, this.betaConstraint);
        }
        this.movingMean = this.addWeight('moving_mean', shape, null, this.movingMeanInitializer, null, false);
        this.movingVariance = this.addWeight('moving_variance', shape, null, this.movingVarianceInitializer, null, false);
        this.built = true;
    }
    call(inputs, kwargs) {
        return tidy(() => {
            const training = kwargs['training'] == null ? false : kwargs['training'];
            const input = getExactlyOneTensor(inputs);
            const inputShape = input.shape;
            const ndim = inputShape.length;
            const reductionAxes = math_utils.range(0, ndim);
            const axis = this.axis >= 0 ? this.axis : (this.axis + ndim);
            reductionAxes.splice(axis, 1);
            const broadcastShape = generic_utils.pyListRepeat(1, ndim);
            broadcastShape[axis] = inputShape[axis];
            const sortedReductionAxes = reductionAxes.slice();
            sortedReductionAxes.sort();
            const needsBroadcasting = !util.arraysEqual(sortedReductionAxes, math_utils.range(0, ndim).slice(0, ndim - 1));
            const normalizeInference = () => {
                if (needsBroadcasting) {
                    const broadcastMovingMean = reshape(this.movingMean.read(), broadcastShape);
                    const broadcastMovingVariance = reshape(this.movingVariance.read(), broadcastShape);
                    const broadcastBeta = this.center ? reshape(this.beta.read(), broadcastShape) : null;
                    const broadcastGamma = this.scale ? reshape(this.gamma.read(), broadcastShape) : null;
                    return batchNormalization(input, broadcastMovingMean, broadcastMovingVariance, broadcastBeta, broadcastGamma, this.epsilon);
                }
                else {
                    return batchNormalization(input, this.movingMean.read(), this.movingVariance.read(), this.beta == null ? null : this.beta.read(), this.gamma == null ? null : this.gamma.read(), this.epsilon);
                }
            };
            if (!training) {
                return normalizeInference();
            }
            const [normedTraining, mean, variance] = normalizeBatchInTraining(input, this.gamma.read(), this.beta.read(), reductionAxes, this.epsilon);
            const doMovingAverage = (variable, value, momentum) => {
                tfc.tidy(() => {
                    const decay = 1 - momentum;
                    const origValue = variable.read();
                    const updateDelta = tfc.mul(tfc.sub(origValue, value), decay);
                    variable.write(tfc.sub(origValue, updateDelta));
                });
            };
            // Perform updates to moving mean and moving variance for training.
            // Porting Note: In PyKeras, these updates to `movingMean` and
            //   `movingAverage` are done as a deferred Graph, added to the `Layer`'s
            //   `update`s using the `add_update()` method. Here we do it imperatively
            //   and encapsulate the updates in a function that is invoked
            //   immediately.
            const updateMovingMeanAndVariance = () => {
                doMovingAverage(this.movingMean, mean, this.momentum);
                doMovingAverage(this.movingVariance, variance, this.momentum);
            };
            updateMovingMeanAndVariance();
            return normedTraining;
        });
    }
    getConfig() {
        const config = {
            axis: this.axis,
            momentum: this.momentum,
            epsilon: this.epsilon,
            center: this.center,
            scale: this.scale,
            betaInitializer: serializeInitializer(this.betaInitializer),
            gammaInitializer: serializeInitializer(this.gammaInitializer),
            movingMeanInitializer: serializeInitializer(this.movingMeanInitializer),
            movingVarianceInitializer: serializeInitializer(this.movingVarianceInitializer),
            betaRegularizer: serializeRegularizer(this.betaRegularizer),
            gammaRegularizer: serializeRegularizer(this.gammaRegularizer),
            betaConstraint: serializeConstraint(this.betaConstraint),
            gammaConstraint: serializeConstraint(this.gammaConstraint)
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
BatchNormalization.className = 'BatchNormalization';
export { BatchNormalization };
serialization.registerClass(BatchNormalization);
class LayerNormalization extends Layer {
    constructor(args) {
        if (args == null) {
            args = {};
        }
        super(args);
        this.axis = args.axis == null ? -1 : args.axis;
        if (typeof this.axis === 'number') {
            if (!Number.isInteger(this.axis)) {
                throw new Error(`Expected axis to be an integer, but received ${this.axis}`);
            }
        }
        else if (Array.isArray(this.axis)) {
            for (const axis of this.axis) {
                if (!Number.isInteger(axis)) {
                    throw new Error(`Expected axis to be an array of integers, ` +
                        `but received ${JSON.stringify(this.axis)}`);
                }
            }
        }
        else {
            throw new Error(`Expected axis to be an integer or an array of integers, ` +
                `but received ${JSON.stringify(this.axis)}`);
        }
        this.epsilon = args.epsilon == null ? 1e-3 : args.epsilon;
        this.center = args.center == null ? true : args.center;
        this.scale = args.scale == null ? true : args.scale;
        this.betaInitializer = getInitializer(args.betaInitializer || 'zeros');
        this.gammaInitializer = getInitializer(args.gammaInitializer || 'ones');
        this.betaRegularizer = getRegularizer(args.betaRegularizer);
        this.gammaRegularizer = getRegularizer(args.gammaRegularizer);
        this.supportsMasking = true;
    }
    build(inputShape) {
        inputShape = getExactlyOneShape(inputShape);
        const nDims = inputShape.length;
        // Convert axis to array and resolve negatives.
        if (typeof this.axis === 'number') {
            this.axis = [this.axis];
        }
        for (let i = 0; i < this.axis.length; ++i) {
            if (this.axis[i] < 0) {
                this.axis[i] += nDims;
            }
        }
        // Further validate axes.
        for (const axis of this.axis) {
            if (axis < 0 || axis >= nDims) {
                throw new Error(`Invalid axis: ${axis}`);
            }
        }
        if (this.axis.length !== generic_utils.unique(this.axis).length) {
            throw new Error(`Found duplicate axes in: ${this.axis}`);
        }
        const paramShape = this.axis.map(axis => inputShape[axis]);
        const trainable = true;
        if (this.scale) {
            this.gamma = this.addWeight('gamma', paramShape, 'float32', this.gammaInitializer, this.gammaRegularizer, trainable);
        }
        else {
            this.gamma = null;
        }
        if (this.center) {
            this.beta = this.addWeight('beta', paramShape, 'float32', this.betaInitializer, this.betaRegularizer, trainable);
        }
        else {
            this.beta = null;
        }
        this.built = true;
    }
    call(inputs, kwargs) {
        const input = getExactlyOneTensor(inputs);
        const inputShape = input.shape;
        const nDims = inputShape.length;
        return tidy(() => {
            const keepDims = true;
            let { mean, variance } = moments(input, this.axis, keepDims);
            const broadcastShape = generic_utils.pyListRepeat(1, nDims);
            for (const dim of this.axis) {
                broadcastShape[dim] = inputShape[dim];
            }
            const broadcast = (v) => {
                if (v != null && v.shape.length !== nDims) {
                    return tfc.reshape(v, broadcastShape);
                }
                else {
                    return v;
                }
            };
            let scale = this.scale ? broadcast(this.gamma.read()) : null;
            let offset = this.center ? broadcast(this.beta.read()) : null;
            // TODO(https://github.com/tensorflow/tfjs/issues/2120): The tiling below
            // is a workaround for the limitation of core's batchNormalization?d don't
            // support broadcasting in their gradients. In addition, the tiling is
            // necessary to ensure correctness on the browser CPU backend regardless
            // of forward or backward computation. Remove this workaround once the
            // limitation is addressed. See .
            const momentsTiling = [];
            const scaleOffsetTiling = [];
            for (let i = 0; i < nDims; ++i) {
                if (this.axis.indexOf(i) !== -1) {
                    momentsTiling.push(inputShape[i]);
                    scaleOffsetTiling.push(1);
                }
                else {
                    momentsTiling.push(1);
                    scaleOffsetTiling.push(inputShape[i]);
                }
            }
            mean = tfc.tile(mean, momentsTiling);
            variance = tfc.tile(variance, momentsTiling);
            if (scale != null) {
                scale = tfc.tile(scale, scaleOffsetTiling);
            }
            if (offset != null) {
                offset = tfc.tile(offset, scaleOffsetTiling);
            }
            return batchNormalization(input, mean, variance, offset, scale, this.epsilon);
        });
    }
    getConfig() {
        const config = {
            axis: this.axis,
            epsilon: this.epsilon,
            center: this.center,
            scale: this.scale,
            betaInitializer: serializeInitializer(this.betaInitializer),
            gammaInitializer: serializeInitializer(this.gammaInitializer),
            betaRegularizer: serializeRegularizer(this.betaRegularizer),
            gammaRegularizer: serializeRegularizer(this.gammaRegularizer)
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
}
/** @nocollapse */
LayerNormalization.className = 'LayerNormalization';
export { LayerNormalization };
serialization.registerClass(LayerNormalization);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbm9ybWFsaXphdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVIOztHQUVHO0FBRUgsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQztBQUM3QyxPQUFPLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQWtELElBQUksRUFBRSxJQUFJLEVBQUMsTUFBTSx1QkFBdUIsQ0FBQztBQUVsSSxPQUFPLEVBQW1DLGFBQWEsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3BHLE9BQU8sRUFBQyxTQUFTLEVBQUUsS0FBSyxFQUFZLE1BQU0sb0JBQW9CLENBQUM7QUFDL0QsT0FBTyxFQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBQyxNQUFNLFdBQVcsQ0FBQztBQUMxRCxPQUFPLEVBQUMsY0FBYyxFQUFzQyxvQkFBb0IsRUFBQyxNQUFNLGlCQUFpQixDQUFDO0FBRXpHLE9BQU8sRUFBQyxjQUFjLEVBQXNDLG9CQUFvQixFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFekcsT0FBTyxLQUFLLGFBQWEsTUFBTSx3QkFBd0IsQ0FBQztBQUN4RCxPQUFPLEtBQUssVUFBVSxNQUFNLHFCQUFxQixDQUFDO0FBQ2xELE9BQU8sRUFBQyxrQkFBa0IsRUFBRSxtQkFBbUIsRUFBQyxNQUFNLHNCQUFzQixDQUFDO0FBRzdFOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQzlCLENBQVMsRUFBRSxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxJQUFhLEVBQUUsS0FBYyxFQUN4RSxPQUFPLEdBQUcsSUFBSTtJQUNoQixJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFO1FBQ2hCLEdBQUcsR0FB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QUFTO1FBQ2hCLE1BQU0sTUFBTSxHQUE2QjtZQUN2QyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixlQUFlLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztZQUMzRCxnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7WUFDN0QsZUFBZSxFQUFFLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7WUFDM0QsZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDO1NBQzlELENBQUM7UUFDRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDbEMsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQzs7QUF0S0Qsa0JBQWtCO0FBQ1gsNEJBQVMsR0FBRyxvQkFBb0IsQ0FBQztTQUY3QixrQkFBa0I7QUF5Sy9CLGFBQWEsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDE4IEdvb2dsZSBMTENcbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGVcbiAqIGxpY2Vuc2UgdGhhdCBjYW4gYmUgZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBvciBhdFxuICogaHR0cHM6Ly9vcGVuc291cmNlLm9yZy9saWNlbnNlcy9NSVQuXG4gKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICovXG5cbi8qKlxuICogTm9ybWFsaXphdGlvbiBsYXllcnMuXG4gKi9cblxuaW1wb3J0ICogYXMgdGZjIGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5pbXBvcnQge21vbWVudHMsIHJlc2hhcGUsIHNlcmlhbGl6YXRpb24sIFRlbnNvciwgVGVuc29yMUQsIFRlbnNvcjJELCBUZW5zb3IzRCwgVGVuc29yNEQsIHRpZHksIHV0aWx9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7Q29uc3RyYWludCwgQ29uc3RyYWludElkZW50aWZpZXIsIGdldENvbnN0cmFpbnQsIHNlcmlhbGl6ZUNvbnN0cmFpbnR9IGZyb20gJy4uL2NvbnN0cmFpbnRzJztcbmltcG9ydCB7SW5wdXRTcGVjLCBMYXllciwgTGF5ZXJBcmdzfSBmcm9tICcuLi9lbmdpbmUvdG9wb2xvZ3knO1xuaW1wb3J0IHtOb3RJbXBsZW1lbnRlZEVycm9yLCBWYWx1ZUVycm9yfSBmcm9tICcuLi9lcnJvcnMnO1xuaW1wb3J0IHtnZXRJbml0aWFsaXplciwgSW5pdGlhbGl6ZXIsIEluaXRpYWxpemVySWRlbnRpZmllciwgc2VyaWFsaXplSW5pdGlhbGl6ZXJ9IGZyb20gJy4uL2luaXRpYWxpemVycyc7XG5pbXBvcnQge1NoYXBlfSBmcm9tICcuLi9rZXJhc19mb3JtYXQvY29tbW9uJztcbmltcG9ydCB7Z2V0UmVndWxhcml6ZXIsIFJlZ3VsYXJpemVyLCBSZWd1bGFyaXplcklkZW50aWZpZXIsIHNlcmlhbGl6ZVJlZ3VsYXJpemVyfSBmcm9tICcuLi9yZWd1bGFyaXplcnMnO1xuaW1wb3J0IHtLd2FyZ3N9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCAqIGFzIGdlbmVyaWNfdXRpbHMgZnJvbSAnLi4vdXRpbHMvZ2VuZXJpY191dGlscyc7XG5pbXBvcnQgKiBhcyBtYXRoX3V0aWxzIGZyb20gJy4uL3V0aWxzL21hdGhfdXRpbHMnO1xuaW1wb3J0IHtnZXRFeGFjdGx5T25lU2hhcGUsIGdldEV4YWN0bHlPbmVUZW5zb3J9IGZyb20gJy4uL3V0aWxzL3R5cGVzX3V0aWxzJztcbmltcG9ydCB7TGF5ZXJWYXJpYWJsZX0gZnJvbSAnLi4vdmFyaWFibGVzJztcblxuLyoqXG4gKiBBcHBsaWVzIGJhdGNoIG5vcm1hbGl6YXRpb24gb24geCBnaXZlbiBtZWFuLCB2YXIsIGJldGEgYW5kIGdhbW1hLlxuICpcbiAqIEkuZS4gcmV0dXJuczpcbiAqICAgYG91dHB1dCA9ICh4IC0gbWVhbikgLyAoc3FydCh2YXIpICsgZXBzaWxvbikgKiBnYW1tYSArIGJldGFgXG4gKlxuICogQHBhcmFtIHggSW5wdXQgdGVuc29yLlxuICogQHBhcmFtIG1lYW4gTWVhbiBvZiBiYXRjaC5cbiAqIEBwYXJhbSB2YXJpYW5jZSBWYXJpYW5jZSBvZiBiYXRjaC5cbiAqIEBwYXJhbSBiZXRhIFRlbnNvciB3aXRoIHdoaWNoIHRvIGNlbnRlciB0aGUgaW5wdXQuXG4gKiBAcGFyYW0gZ2FtbWEgVGVuc29yIGJ5IHdoaWNoIHRvIHNjYWxlIHRoZSBpbnB1dC5cbiAqIEBwYXJhbSBlcHNpbG9uIEZ1enogZmFjdG9yLlxuICogQHJldHVybnMgVGhlIHJlc3VsdCBvZiB0aGUgYmF0Y2ggbm9ybWFsaXphdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJhdGNoTm9ybWFsaXphdGlvbihcbiAgICB4OiBUZW5zb3IsIG1lYW46IFRlbnNvciwgdmFyaWFuY2U6IFRlbnNvciwgYmV0YT86IFRlbnNvciwgZ2FtbWE/OiBUZW5zb3IsXG4gICAgZXBzaWxvbiA9IDFlLTMpOiBUZW5zb3Ige1xuICBsZXQgb3V0OiBUZW5zb3I7XG4gIGlmICh4LnJhbmsgPT09IDIpIHtcbiAgICBvdXQgPSB0ZmMuYmF0Y2hOb3JtMmQoXG4gICAgICAgIHggYXMgVGVuc29yMkQsIG1lYW4gYXMgVGVuc29yMkQgfCBUZW5zb3IxRCxcbiAgICAgICAgdmFyaWFuY2UgYXMgVGVuc29yMkQgfCBUZW5zb3IxRCwgYmV0YSBhcyBUZW5zb3IyRCB8IFRlbnNvcjFELFxuICAgICAgICBnYW1tYSBhcyBUZW5zb3IyRCB8IFRlbnNvcjFELCBlcHNpbG9uKTtcbiAgfSBlbHNlIGlmICh4LnJhbmsgPT09IDMpIHtcbiAgICAvLyBUT0RPKGNhaXMpOiBDaGVjayByYW5rOyBnaXZlIHByb3BlciBlcnJvciBtZXNzYWdlLlxuICAgIG91dCA9IHRmYy5iYXRjaE5vcm0zZChcbiAgICAgICAgeCBhcyBUZW5zb3IzRCwgbWVhbiBhcyBUZW5zb3IzRCB8IFRlbnNvcjFELFxuICAgICAgICB2YXJpYW5jZSBhcyBUZW5zb3IzRCB8IFRlbnNvcjFELCBiZXRhIGFzIFRlbnNvcjNEIHwgVGVuc29yMUQsXG4gICAgICAgIGdhbW1hIGFzIFRlbnNvcjNEIHwgVGVuc29yMUQsIGVwc2lsb24pO1xuICB9IGVsc2UgaWYgKHgucmFuayA9PT0gNCkge1xuICAgIG91dCA9IHRmYy5iYXRjaE5vcm00ZChcbiAgICAgICAgeCBhcyBUZW5zb3I0RCwgbWVhbiBhcyBUZW5zb3I0RCB8IFRlbnNvcjFELFxuICAgICAgICB2YXJpYW5jZSBhcyBUZW5zb3I0RCB8IFRlbnNvcjFELCBiZXRhIGFzIFRlbnNvcjREIHwgVGVuc29yMUQsXG4gICAgICAgIGdhbW1hIGFzIFRlbnNvcjREIHwgVGVuc29yMUQsIGVwc2lsb24pO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBOb3RJbXBsZW1lbnRlZEVycm9yKFxuICAgICAgICBgYmF0Y2hOb3JtYWxpemF0aW9uIGlzIG5vdCBpbXBsZW1lbnRlZCBmb3IgYXJyYXkgb2YgcmFuayAke3gucmFua30gYCArXG4gICAgICAgIGB5ZXRgKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIE5vbi1icm9hZGNhc3RpbmcgYmF0Y2ggbm9ybWFsaXphdGlvbiBmb3IgdXNlIGluIHRyYWluaW5nIChub3QgaW5mZXJlbmNlKS5cbiAqXG4gKiBUaGUgaW5wdXQgaXMgbm9ybWFsaXplZCB0byB6ZXJvIG1lYW4gYW5kIHVuaXQgdmFyaWFuY2UgYWxvbmcgdGhlXG4gKiBgcmVkdWN0aW9uQXhlc2AsIGZvbGxvd2VkIGJ5IHNjYWxpbmcgd2l0aCBgZ2FtbWFgIGFuZCBzaGlmdGVkIGJ5IGBiZXRhYC5cbiAqIFRoZSByZXN1bHQgb2YgdGhhdCBpcyByZXR1cm5lZCBhcyB0aGUgZmlyc3QgZWxlbWVudFxuICogb2YgdGhlIHJldHVybmVkIGBBcnJheWAuIFRoZSBvdGhlciB0d28gZWxlbWVudHMgYXJlIHRoZSBtZWFuIGFuZCB2YXJpYW5jZSxcbiAqIHJlc3BlY3RpdmVseS5cbiAqXG4gKiBAcGFyYW0geCBJbnB1dCB0ZW5zb3IgdG8gYmUgbm9ybWFsaXplZC5cbiAqIEBwYXJhbSBnYW1tYSBUZW5zb3IgYnkgd2hpY2ggdG8gc2NhbGUgdGhlIGlucHV0LlxuICogQHBhcmFtIGJldGEgVGVuc29yIGJ5IHdoaWNoIHRvIGNlbnRlciB0aGUgaW5wdXQuXG4gKiBAcGFyYW0gcmVkdWN0aW9uQXhlcyBBeGVzIG92ZXIgd2hpY2ggdG8gbm9ybWFsaXplLlxuICogQHBhcmFtIGVwc2lsb24gRnV6eiBmYWN0b3IuXG4gKiBAcmV0dXJucyBBbiBgQXJyYXlgIG9mIHRocmVlIGBUZW5zb3JzYDpcbiAqICAgW25vcm1hbGl6ZWQgdGVuc29yLCBtZWFuIG9mIGlucHV0LCB2YXJpYW5jZSBvZiBpbnB1dF0uXG4gKi9cbmZ1bmN0aW9uIHJlZ3VsYXJOb3JtYWxpemVCYXRjaEluVHJhaW5pbmcoXG4gICAgeDogVGVuc29yLCBnYW1tYTogVGVuc29yLCBiZXRhOiBUZW5zb3IsIHJlZHVjdGlvbkF4ZXM6IG51bWJlcltdLFxuICAgIGVwc2lsb24gPSAxZS0zKTogW1RlbnNvciwgVGVuc29yLCBUZW5zb3JdIHtcbiAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgICAgICBjb25zdCBtZWFuQW5kVmFyaWFuY2UgPSB0ZmMubW9tZW50cyh4LCByZWR1Y3Rpb25BeGVzKTtcbiAgICAgICAgICAgY29uc3QgbWVhbiA9IG1lYW5BbmRWYXJpYW5jZS5tZWFuO1xuICAgICAgICAgICBjb25zdCB2YXJpYW5jZSA9IG1lYW5BbmRWYXJpYW5jZS52YXJpYW5jZTtcbiAgICAgICAgICAgY29uc3Qgbm9ybWVkID1cbiAgICAgICAgICAgICAgIGJhdGNoTm9ybWFsaXphdGlvbih4LCBtZWFuLCB2YXJpYW5jZSwgYmV0YSwgZ2FtbWEsIGVwc2lsb24pO1xuICAgICAgICAgICByZXR1cm4gW25vcm1lZCwgbWVhbiwgdmFyaWFuY2VdO1xuICAgICAgICAgfSkgYXMgW1RlbnNvciwgVGVuc29yLCBUZW5zb3JdO1xufVxuXG4vKipcbiAqIEJyb2FkY2FzdGluZyBiYXRjaCBub3JtYWxpemF0aW9uIGZvciB1c2UgaW4gdHJhaW5pbmcgKG5vdCBpbmZlcmVuY2UpLlxuICpcbiAqIFRoZSBpbnB1dCBpcyBub3JtYWxpemVkIHRvIHplcm8gbWVhbiBhbmQgdW5pdCB2YXJpYW5jZSBhbG9uZyB0aGVcbiAqIGByZWR1Y3Rpb25BeGVzYCwgZm9sbG93ZWQgYnkgc2NhbGluZyB3aXRoIGBnYW1tYWAgYW5kIHNoaWZ0ZWQgYnkgYGJldGFgLlxuICogVGhlIHJlc3VsdCBvZiB0aGF0IGlzIHJldHVybmVkIGFzIHRoZSBmaXJzdCBlbGVtZW50XG4gKiBvZiB0aGUgcmV0dXJuZWQgYEFycmF5YC4gVGhlIG90aGVyIHR3byBlbGVtZW50cyBhcmUgdGhlIG1lYW4gYW5kIHZhcmlhbmNlLFxuICogcmVzcGVjdGl2ZWx5LlxuICpcbiAqIEBwYXJhbSB4IElucHV0IHRlbnNvciB0byBiZSBub3JtYWxpemVkLlxuICogQHBhcmFtIGdhbW1hIFRlbnNvciBieSB3aGljaCB0byBzY2FsZSB0aGUgaW5wdXQuXG4gKiBAcGFyYW0gYmV0YSBUZW5zb3IgYnkgd2hpY2ggdG8gY2VudGVyIHRoZSBpbnB1dC5cbiAqIEBwYXJhbSByZWR1Y3Rpb25BeGVzIEF4ZXMgb3ZlciB3aGljaCB0byBub3JtYWxpemUuXG4gKiBAcGFyYW0gZXBzaWxvbiBGdXp6IGZhY3Rvci5cbiAqIEByZXR1cm5zIEFuIGBBcnJheWAgb2YgdGhyZWUgYFRlbnNvcnNgOlxuICogICBbbm9ybWFsaXplZCB0ZW5zb3IsIG1lYW4gb2YgaW5wdXQsIHZhcmlhbmNlIG9mIGlucHV0XS5cbiAqL1xuZnVuY3Rpb24gYnJvYWRjYXN0Tm9ybWFsaXplQmF0Y2hJblRyYWluaW5nKFxuICAgIHg6IFRlbnNvciwgZ2FtbWE6IFRlbnNvciwgYmV0YTogVGVuc29yLCByZWR1Y3Rpb25BeGVzOiBudW1iZXJbXSxcbiAgICBlcHNpbG9uID0gMWUtMyk6IFtUZW5zb3IsIFRlbnNvciwgVGVuc29yXSB7XG4gIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgICAgICAgY29uc3QgbWVhbkFuZFZhcmlhbmNlID0gdGZjLm1vbWVudHMoeCwgcmVkdWN0aW9uQXhlcyk7XG4gICAgICAgICAgIGNvbnN0IG1lYW4gPSBtZWFuQW5kVmFyaWFuY2UubWVhbjtcbiAgICAgICAgICAgY29uc3QgdmFyaWFuY2UgPSBtZWFuQW5kVmFyaWFuY2UudmFyaWFuY2U7XG4gICAgICAgICAgIGNvbnN0IHRhcmdldFNoYXBlOiBudW1iZXJbXSA9IFtdO1xuICAgICAgICAgICBmb3IgKGNvbnN0IGF4aXMgb2YgbWF0aF91dGlscy5yYW5nZSgwLCB4LnJhbmspKSB7XG4gICAgICAgICAgICAgaWYgKHJlZHVjdGlvbkF4ZXMuaW5kZXhPZihheGlzKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgIHRhcmdldFNoYXBlLnB1c2goMSk7XG4gICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIHRhcmdldFNoYXBlLnB1c2goeC5zaGFwZVtheGlzXSk7XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICB9XG4gICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdE1lYW4gPSByZXNoYXBlKG1lYW4sIHRhcmdldFNoYXBlKTtcbiAgICAgICAgICAgY29uc3QgYnJvYWRjYXN0VmFyaWFuY2UgPSByZXNoYXBlKHZhcmlhbmNlLCB0YXJnZXRTaGFwZSk7XG4gICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdEdhbW1hID1cbiAgICAgICAgICAgICAgIGdhbW1hID09IG51bGwgPyBudWxsIDogcmVzaGFwZShnYW1tYSwgdGFyZ2V0U2hhcGUpO1xuICAgICAgICAgICBjb25zdCBicm9hZGNhc3RCZXRhID1cbiAgICAgICAgICAgICAgIGJldGEgPT0gbnVsbCA/IG51bGwgOiByZXNoYXBlKGJldGEsIHRhcmdldFNoYXBlKTtcbiAgICAgICAgICAgY29uc3Qgbm9ybWVkID0gYmF0Y2hOb3JtYWxpemF0aW9uKFxuICAgICAgICAgICAgICAgeCwgYnJvYWRjYXN0TWVhbiwgYnJvYWRjYXN0VmFyaWFuY2UsIGJyb2FkY2FzdEJldGEsXG4gICAgICAgICAgICAgICBicm9hZGNhc3RHYW1tYSwgZXBzaWxvbik7XG4gICAgICAgICAgIHJldHVybiBbbm9ybWVkLCBtZWFuLCB2YXJpYW5jZV07XG4gICAgICAgICB9KSBhcyBbVGVuc29yLCBUZW5zb3IsIFRlbnNvcl07XG59XG5cbi8qKlxuICogQmF0Y2ggbm9ybWFsaXphdGlvbiBmb3IgdXNlIGluIHRyYWluaW5nIChub3QgaW5mZXJlbmNlKS5cbiAqXG4gKiBAcGFyYW0geCBJbnB1dCB0ZW5zb3IgdG8gYmUgbm9ybWFsaXplZC5cbiAqIEBwYXJhbSBnYW1tYSBUZW5zb3IgYnkgd2hpY2ggdG8gc2NhbGUgdGhlIGlucHV0LlxuICogQHBhcmFtIGJldGEgVGVuc29yIGJ5IHdoaWNoIHRvIGNlbnRlciB0aGUgaW5wdXQuXG4gKiBAcGFyYW0gcmVkdWN0aW9uQXhlcyBBeGVzIG92ZXIgd2hpY2ggdG8gbm9ybWFsaXplLlxuICogQHBhcmFtIGVwc2lsb24gRnV6eiBmYWN0b3IuXG4gKiBAcmV0dXJucyBBbiBgQXJyYXlgIG9mIHRocmVlIGBUZW5zb3JzYDpcbiAqICAgW25vcm1hbGl6ZWQgdGVuc29yLCBtZWFuIG9mIGlucHV0LCB2YXJpYW5jZSBvZiBpbnB1dF0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVCYXRjaEluVHJhaW5pbmcoXG4gICAgeDogVGVuc29yLCBnYW1tYTogVGVuc29yLCBiZXRhOiBUZW5zb3IsIHJlZHVjdGlvbkF4ZXM6IG51bWJlcltdLFxuICAgIGVwc2lsb24gPSAxZS0zKTogW1RlbnNvciwgVGVuc29yLCBUZW5zb3JdIHtcbiAgaWYgKHV0aWwuYXJyYXlzRXF1YWwoXG4gICAgICAgICAgcmVkdWN0aW9uQXhlcy5zbGljZSgpLnNvcnQoKSwgbWF0aF91dGlscy5yYW5nZSgwLCB4LnJhbmsgLSAxKSkpIHtcbiAgICByZXR1cm4gcmVndWxhck5vcm1hbGl6ZUJhdGNoSW5UcmFpbmluZyhcbiAgICAgICAgeCwgZ2FtbWEsIGJldGEsIHJlZHVjdGlvbkF4ZXMsIGVwc2lsb24pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBicm9hZGNhc3ROb3JtYWxpemVCYXRjaEluVHJhaW5pbmcoXG4gICAgICAgIHgsIGdhbW1hLCBiZXRhLCByZWR1Y3Rpb25BeGVzLCBlcHNpbG9uKTtcbiAgfVxufVxuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgQmF0Y2hOb3JtYWxpemF0aW9uTGF5ZXJBcmdzIGV4dGVuZHMgTGF5ZXJBcmdzIHtcbiAgLyoqXG4gICAqIFRoZSBpbnRlZ2VyIGF4aXMgdGhhdCBzaG91bGQgYmUgbm9ybWFsaXplZCAodHlwaWNhbGx5IHRoZSBmZWF0dXJlcyBheGlzKS5cbiAgICogRGVmYXVsdHMgdG8gLTEuXG4gICAqXG4gICAqIEZvciBpbnN0YW5jZSwgYWZ0ZXIgYSBgQ29udjJEYCBsYXllciB3aXRoIGBkYXRhX2Zvcm1hdD1cImNoYW5uZWxzX2ZpcnN0XCJgLFxuICAgKiBzZXQgYGF4aXM9MWAgaW4gYGJhdGNoTm9ybWFsaXphdGlvbmAuXG4gICAqL1xuICBheGlzPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBNb21lbnR1bSBvZiB0aGUgbW92aW5nIGF2ZXJhZ2UuIERlZmF1bHRzIHRvIDAuOTkuXG4gICAqL1xuICBtb21lbnR1bT86IG51bWJlcjtcblxuICAvKipcbiAgICogU21hbGwgZmxvYXQgYWRkZWQgdG8gdGhlIHZhcmlhbmNlIHRvIGF2b2lkIGRpdmlkaW5nIGJ5IHplcm8uIERlZmF1bHRzIHRvXG4gICAqIDFlLTMuXG4gICAqL1xuICBlcHNpbG9uPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIGFkZCBvZmZzZXQgb2YgYGJldGFgIHRvIG5vcm1hbGl6ZWQgdGVuc29yLlxuICAgKiBJZiBgZmFsc2VgLCBgYmV0YWAgaXMgaWdub3JlZC5cbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgY2VudGVyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgYHRydWVgLCBtdWx0aXBseSBieSBgZ2FtbWFgLlxuICAgKiBJZiBgZmFsc2VgLCBgZ2FtbWFgIGlzIG5vdCB1c2VkLlxuICAgKiBXaGVuIHRoZSBuZXh0IGxheWVyIGlzIGxpbmVhciAoYWxzbyBlLmcuIGBubi5yZWx1YCksXG4gICAqIHRoaXMgY2FuIGJlIGRpc2FibGVkIHNpbmNlIHRoZSBzY2FsaW5nIHdpbGwgYmUgZG9uZSBieSB0aGUgbmV4dCBsYXllci5cbiAgICogRGVmYXVsdHMgdG8gYHRydWVgLlxuICAgKi9cbiAgc2NhbGU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGJldGEgd2VpZ2h0LlxuICAgKiAgRGVmYXVsdHMgdG8gJ3plcm9zJy5cbiAgICovXG4gIGJldGFJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBnYW1tYSB3ZWlnaHQuXG4gICAqICBEZWZhdWx0cyB0byBgb25lc2AuXG4gICAqL1xuICBnYW1tYUluaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIG1vdmluZyBtZWFuLlxuICAgKiBEZWZhdWx0cyB0byBgemVyb3NgXG4gICAqL1xuICBtb3ZpbmdNZWFuSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcklkZW50aWZpZXJ8SW5pdGlhbGl6ZXI7XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVyIGZvciB0aGUgbW92aW5nIHZhcmlhbmNlLlxuICAgKiAgRGVmYXVsdHMgdG8gJ09uZXMnLlxuICAgKi9cbiAgbW92aW5nVmFyaWFuY2VJbml0aWFsaXplcj86IEluaXRpYWxpemVySWRlbnRpZmllcnxJbml0aWFsaXplcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmb3IgdGhlIGJldGEgd2VpZ2h0LlxuICAgKi9cbiAgYmV0YUNvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBDb25zdHJhaW50IGZvciBnYW1tYSB3ZWlnaHQuXG4gICAqL1xuICBnYW1tYUNvbnN0cmFpbnQ/OiBDb25zdHJhaW50SWRlbnRpZmllcnxDb25zdHJhaW50O1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmb3IgdGhlIGJldGEgd2VpZ2h0LlxuICAgKi9cbiAgYmV0YVJlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xuXG4gIC8qKlxuICAgKiBSZWd1bGFyaXplciBmb3IgdGhlIGdhbW1hIHdlaWdodC5cbiAgICovXG4gIGdhbW1hUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBCYXRjaE5vcm1hbGl6YXRpb24gZXh0ZW5kcyBMYXllciB7XG4gIC8qKiBAbm9jb2xsYXBzZSAqL1xuICBzdGF0aWMgY2xhc3NOYW1lID0gJ0JhdGNoTm9ybWFsaXphdGlvbic7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXhpczogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG1vbWVudHVtOiBudW1iZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXBzaWxvbjogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGNlbnRlcjogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWFkb25seSBzY2FsZTogYm9vbGVhbjtcbiAgcHJpdmF0ZSByZWFkb25seSBiZXRhSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGdhbW1hSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcml2YXRlIHJlYWRvbmx5IG1vdmluZ01lYW5Jbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgbW92aW5nVmFyaWFuY2VJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgYmV0YUNvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2FtbWFDb25zdHJhaW50OiBDb25zdHJhaW50O1xuICBwcml2YXRlIHJlYWRvbmx5IGJldGFSZWd1bGFyaXplcjogUmVndWxhcml6ZXI7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2FtbWFSZWd1bGFyaXplcjogUmVndWxhcml6ZXI7XG4gIHByaXZhdGUgZ2FtbWE6IExheWVyVmFyaWFibGU7XG4gIHByaXZhdGUgYmV0YTogTGF5ZXJWYXJpYWJsZTtcbiAgcHJpdmF0ZSBtb3ZpbmdNZWFuOiBMYXllclZhcmlhYmxlO1xuICBwcml2YXRlIG1vdmluZ1ZhcmlhbmNlOiBMYXllclZhcmlhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKGFyZ3M/OiBCYXRjaE5vcm1hbGl6YXRpb25MYXllckFyZ3MpIHtcbiAgICBpZiAoYXJncyA9PSBudWxsKSB7XG4gICAgICBhcmdzID0ge307XG4gICAgfVxuICAgIHN1cGVyKGFyZ3MpO1xuXG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICAgIHRoaXMuYXhpcyA9IGFyZ3MuYXhpcyA9PSBudWxsID8gLTEgOiBhcmdzLmF4aXM7XG4gICAgdGhpcy5tb21lbnR1bSA9IGFyZ3MubW9tZW50dW0gPT0gbnVsbCA/IDAuOTkgOiBhcmdzLm1vbWVudHVtO1xuICAgIHRoaXMuZXBzaWxvbiA9IGFyZ3MuZXBzaWxvbiA9PSBudWxsID8gMWUtMyA6IGFyZ3MuZXBzaWxvbjtcbiAgICB0aGlzLmNlbnRlciA9IGFyZ3MuY2VudGVyID09IG51bGwgPyB0cnVlIDogYXJncy5jZW50ZXI7XG4gICAgdGhpcy5zY2FsZSA9IGFyZ3Muc2NhbGUgPT0gbnVsbCA/IHRydWUgOiBhcmdzLnNjYWxlO1xuICAgIHRoaXMuYmV0YUluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoYXJncy5iZXRhSW5pdGlhbGl6ZXIgfHwgJ3plcm9zJyk7XG4gICAgdGhpcy5nYW1tYUluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoYXJncy5nYW1tYUluaXRpYWxpemVyIHx8ICdvbmVzJyk7XG4gICAgdGhpcy5tb3ZpbmdNZWFuSW5pdGlhbGl6ZXIgPVxuICAgICAgICBnZXRJbml0aWFsaXplcihhcmdzLm1vdmluZ01lYW5Jbml0aWFsaXplciB8fCAnemVyb3MnKTtcbiAgICB0aGlzLm1vdmluZ1ZhcmlhbmNlSW5pdGlhbGl6ZXIgPVxuICAgICAgICBnZXRJbml0aWFsaXplcihhcmdzLm1vdmluZ1ZhcmlhbmNlSW5pdGlhbGl6ZXIgfHwgJ29uZXMnKTtcbiAgICB0aGlzLmJldGFDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmJldGFDb25zdHJhaW50KTtcbiAgICB0aGlzLmdhbW1hQ29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoYXJncy5nYW1tYUNvbnN0cmFpbnQpO1xuICAgIHRoaXMuYmV0YVJlZ3VsYXJpemVyID0gZ2V0UmVndWxhcml6ZXIoYXJncy5iZXRhUmVndWxhcml6ZXIpO1xuICAgIHRoaXMuZ2FtbWFSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MuZ2FtbWFSZWd1bGFyaXplcik7XG4gIH1cblxuICBwdWJsaWMgb3ZlcnJpZGUgYnVpbGQoaW5wdXRTaGFwZTogU2hhcGV8U2hhcGVbXSk6IHZvaWQge1xuICAgIGlucHV0U2hhcGUgPSBnZXRFeGFjdGx5T25lU2hhcGUoaW5wdXRTaGFwZSk7XG4gICAgY29uc3QgYXhpcyA9IHRoaXMuYXhpcyA+PSAwID8gdGhpcy5heGlzIDogKHRoaXMuYXhpcyArIGlucHV0U2hhcGUubGVuZ3RoKTtcbiAgICBjb25zdCBkaW0gPSBpbnB1dFNoYXBlW2F4aXNdO1xuICAgIGlmIChkaW0gPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFZhbHVlRXJyb3IoXG4gICAgICAgICAgYEF4aXMgJHtheGlzfSBvZiBpbnB1dCB0ZW5zb3Igc2hvdWxkIGhhdmUgYSBkZWZpbmVkIGRpbWVuc2lvbiBidXQgYCArXG4gICAgICAgICAgYHRoZSBsYXllciByZWNlaXZlZCBhbiBpbnB1dCB3aXRoIHNoYXBlIGAgK1xuICAgICAgICAgIGAke0pTT04uc3RyaW5naWZ5KGlucHV0U2hhcGUpfS5gKTtcbiAgICB9XG4gICAgdGhpcy5pbnB1dFNwZWMgPVxuICAgICAgICBbbmV3IElucHV0U3BlYyh7bmRpbTogaW5wdXRTaGFwZS5sZW5ndGgsIGF4ZXM6IHtbYXhpc106IGRpbX19KV07XG4gICAgY29uc3Qgc2hhcGUgPSBbZGltXTtcbiAgICBpZiAodGhpcy5zY2FsZSkge1xuICAgICAgdGhpcy5nYW1tYSA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAgICdnYW1tYScsIHNoYXBlLCBudWxsLCB0aGlzLmdhbW1hSW5pdGlhbGl6ZXIsIHRoaXMuZ2FtbWFSZWd1bGFyaXplcixcbiAgICAgICAgICB0cnVlLCB0aGlzLmdhbW1hQ29uc3RyYWludCk7XG4gICAgfVxuICAgIGlmICh0aGlzLmNlbnRlcikge1xuICAgICAgdGhpcy5iZXRhID0gdGhpcy5hZGRXZWlnaHQoXG4gICAgICAgICAgJ2JldGEnLCBzaGFwZSwgbnVsbCwgdGhpcy5iZXRhSW5pdGlhbGl6ZXIsIHRoaXMuYmV0YVJlZ3VsYXJpemVyLCB0cnVlLFxuICAgICAgICAgIHRoaXMuYmV0YUNvbnN0cmFpbnQpO1xuICAgIH1cbiAgICB0aGlzLm1vdmluZ01lYW4gPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgJ21vdmluZ19tZWFuJywgc2hhcGUsIG51bGwsIHRoaXMubW92aW5nTWVhbkluaXRpYWxpemVyLCBudWxsLCBmYWxzZSk7XG4gICAgdGhpcy5tb3ZpbmdWYXJpYW5jZSA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAnbW92aW5nX3ZhcmlhbmNlJywgc2hhcGUsIG51bGwsIHRoaXMubW92aW5nVmFyaWFuY2VJbml0aWFsaXplciwgbnVsbCxcbiAgICAgICAgZmFsc2UpO1xuICAgIHRoaXMuYnVpbHQgPSB0cnVlO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChpbnB1dHM6IFRlbnNvcnxUZW5zb3JbXSwga3dhcmdzOiBLd2FyZ3MpOiBUZW5zb3J8VGVuc29yW10ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IHRyYWluaW5nID0ga3dhcmdzWyd0cmFpbmluZyddID09IG51bGwgPyBmYWxzZSA6IGt3YXJnc1sndHJhaW5pbmcnXTtcbiAgICAgIGNvbnN0IGlucHV0ID0gZ2V0RXhhY3RseU9uZVRlbnNvcihpbnB1dHMpO1xuICAgICAgY29uc3QgaW5wdXRTaGFwZSA9IGlucHV0LnNoYXBlO1xuICAgICAgY29uc3QgbmRpbSA9IGlucHV0U2hhcGUubGVuZ3RoO1xuICAgICAgY29uc3QgcmVkdWN0aW9uQXhlcyA9IG1hdGhfdXRpbHMucmFuZ2UoMCwgbmRpbSk7XG4gICAgICBjb25zdCBheGlzID0gdGhpcy5heGlzID49IDAgPyB0aGlzLmF4aXMgOiAodGhpcy5heGlzICsgbmRpbSk7XG4gICAgICByZWR1Y3Rpb25BeGVzLnNwbGljZShheGlzLCAxKTtcbiAgICAgIGNvbnN0IGJyb2FkY2FzdFNoYXBlID0gZ2VuZXJpY191dGlscy5weUxpc3RSZXBlYXQoMSwgbmRpbSk7XG4gICAgICBicm9hZGNhc3RTaGFwZVtheGlzXSA9IGlucHV0U2hhcGVbYXhpc107XG5cbiAgICAgIGNvbnN0IHNvcnRlZFJlZHVjdGlvbkF4ZXMgPSByZWR1Y3Rpb25BeGVzLnNsaWNlKCk7XG4gICAgICBzb3J0ZWRSZWR1Y3Rpb25BeGVzLnNvcnQoKTtcbiAgICAgIGNvbnN0IG5lZWRzQnJvYWRjYXN0aW5nID0gIXV0aWwuYXJyYXlzRXF1YWwoXG4gICAgICAgICAgc29ydGVkUmVkdWN0aW9uQXhlcywgbWF0aF91dGlscy5yYW5nZSgwLCBuZGltKS5zbGljZSgwLCBuZGltIC0gMSkpO1xuXG4gICAgICBjb25zdCBub3JtYWxpemVJbmZlcmVuY2U6ICgpID0+IFRlbnNvciA9ICgpID0+IHtcbiAgICAgICAgaWYgKG5lZWRzQnJvYWRjYXN0aW5nKSB7XG4gICAgICAgICAgY29uc3QgYnJvYWRjYXN0TW92aW5nTWVhbiA9XG4gICAgICAgICAgICAgIHJlc2hhcGUodGhpcy5tb3ZpbmdNZWFuLnJlYWQoKSwgYnJvYWRjYXN0U2hhcGUpO1xuICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdE1vdmluZ1ZhcmlhbmNlID1cbiAgICAgICAgICAgICAgcmVzaGFwZSh0aGlzLm1vdmluZ1ZhcmlhbmNlLnJlYWQoKSwgYnJvYWRjYXN0U2hhcGUpO1xuICAgICAgICAgIGNvbnN0IGJyb2FkY2FzdEJldGEgPVxuICAgICAgICAgICAgICB0aGlzLmNlbnRlciA/IHJlc2hhcGUodGhpcy5iZXRhLnJlYWQoKSwgYnJvYWRjYXN0U2hhcGUpIDogbnVsbDtcbiAgICAgICAgICBjb25zdCBicm9hZGNhc3RHYW1tYSA9XG4gICAgICAgICAgICAgIHRoaXMuc2NhbGUgPyByZXNoYXBlKHRoaXMuZ2FtbWEucmVhZCgpLCBicm9hZGNhc3RTaGFwZSkgOiBudWxsO1xuICAgICAgICAgIHJldHVybiBiYXRjaE5vcm1hbGl6YXRpb24oXG4gICAgICAgICAgICAgIGlucHV0LCBicm9hZGNhc3RNb3ZpbmdNZWFuLCBicm9hZGNhc3RNb3ZpbmdWYXJpYW5jZSxcbiAgICAgICAgICAgICAgYnJvYWRjYXN0QmV0YSwgYnJvYWRjYXN0R2FtbWEsIHRoaXMuZXBzaWxvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGJhdGNoTm9ybWFsaXphdGlvbihcbiAgICAgICAgICAgICAgaW5wdXQsIHRoaXMubW92aW5nTWVhbi5yZWFkKCksIHRoaXMubW92aW5nVmFyaWFuY2UucmVhZCgpLFxuICAgICAgICAgICAgICB0aGlzLmJldGEgPT0gbnVsbCA/IG51bGwgOiB0aGlzLmJldGEucmVhZCgpLFxuICAgICAgICAgICAgICB0aGlzLmdhbW1hID09IG51bGwgPyBudWxsIDogdGhpcy5nYW1tYS5yZWFkKCksIHRoaXMuZXBzaWxvbik7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIGlmICghdHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZUluZmVyZW5jZSgpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBbbm9ybWVkVHJhaW5pbmcsIG1lYW4sIHZhcmlhbmNlXSA9IG5vcm1hbGl6ZUJhdGNoSW5UcmFpbmluZyhcbiAgICAgICAgICBpbnB1dCwgdGhpcy5nYW1tYS5yZWFkKCksIHRoaXMuYmV0YS5yZWFkKCksIHJlZHVjdGlvbkF4ZXMsXG4gICAgICAgICAgdGhpcy5lcHNpbG9uKTtcblxuICAgICAgY29uc3QgZG9Nb3ZpbmdBdmVyYWdlID1cbiAgICAgICAgICAodmFyaWFibGU6IExheWVyVmFyaWFibGUsIHZhbHVlOiBUZW5zb3IsIG1vbWVudHVtOiBudW1iZXIpOiB2b2lkID0+IHtcbiAgICAgICAgICAgIHRmYy50aWR5KCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgZGVjYXkgPSAxIC0gbW9tZW50dW07XG4gICAgICAgICAgICAgIGNvbnN0IG9yaWdWYWx1ZSA9IHZhcmlhYmxlLnJlYWQoKTtcbiAgICAgICAgICAgICAgY29uc3QgdXBkYXRlRGVsdGEgPSB0ZmMubXVsKHRmYy5zdWIob3JpZ1ZhbHVlLCB2YWx1ZSksIGRlY2F5KTtcbiAgICAgICAgICAgICAgdmFyaWFibGUud3JpdGUodGZjLnN1YihvcmlnVmFsdWUsIHVwZGF0ZURlbHRhKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9O1xuXG4gICAgICAvLyBQZXJmb3JtIHVwZGF0ZXMgdG8gbW92aW5nIG1lYW4gYW5kIG1vdmluZyB2YXJpYW5jZSBmb3IgdHJhaW5pbmcuXG4gICAgICAvLyBQb3J0aW5nIE5vdGU6IEluIFB5S2VyYXMsIHRoZXNlIHVwZGF0ZXMgdG8gYG1vdmluZ01lYW5gIGFuZFxuICAgICAgLy8gICBgbW92aW5nQXZlcmFnZWAgYXJlIGRvbmUgYXMgYSBkZWZlcnJlZCBHcmFwaCwgYWRkZWQgdG8gdGhlIGBMYXllcmAnc1xuICAgICAgLy8gICBgdXBkYXRlYHMgdXNpbmcgdGhlIGBhZGRfdXBkYXRlKClgIG1ldGhvZC4gSGVyZSB3ZSBkbyBpdCBpbXBlcmF0aXZlbHlcbiAgICAgIC8vICAgYW5kIGVuY2Fwc3VsYXRlIHRoZSB1cGRhdGVzIGluIGEgZnVuY3Rpb24gdGhhdCBpcyBpbnZva2VkXG4gICAgICAvLyAgIGltbWVkaWF0ZWx5LlxuICAgICAgY29uc3QgdXBkYXRlTW92aW5nTWVhbkFuZFZhcmlhbmNlID0gKCkgPT4ge1xuICAgICAgICBkb01vdmluZ0F2ZXJhZ2UodGhpcy5tb3ZpbmdNZWFuLCBtZWFuLCB0aGlzLm1vbWVudHVtKTtcbiAgICAgICAgZG9Nb3ZpbmdBdmVyYWdlKHRoaXMubW92aW5nVmFyaWFuY2UsIHZhcmlhbmNlLCB0aGlzLm1vbWVudHVtKTtcbiAgICAgIH07XG4gICAgICB1cGRhdGVNb3ZpbmdNZWFuQW5kVmFyaWFuY2UoKTtcblxuICAgICAgcmV0dXJuIG5vcm1lZFRyYWluaW5nO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgZ2V0Q29uZmlnKCk6IHNlcmlhbGl6YXRpb24uQ29uZmlnRGljdCB7XG4gICAgY29uc3QgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3QgPSB7XG4gICAgICBheGlzOiB0aGlzLmF4aXMsXG4gICAgICBtb21lbnR1bTogdGhpcy5tb21lbnR1bSxcbiAgICAgIGVwc2lsb246IHRoaXMuZXBzaWxvbixcbiAgICAgIGNlbnRlcjogdGhpcy5jZW50ZXIsXG4gICAgICBzY2FsZTogdGhpcy5zY2FsZSxcbiAgICAgIGJldGFJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5iZXRhSW5pdGlhbGl6ZXIpLFxuICAgICAgZ2FtbWFJbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5nYW1tYUluaXRpYWxpemVyKSxcbiAgICAgIG1vdmluZ01lYW5Jbml0aWFsaXplcjogc2VyaWFsaXplSW5pdGlhbGl6ZXIodGhpcy5tb3ZpbmdNZWFuSW5pdGlhbGl6ZXIpLFxuICAgICAgbW92aW5nVmFyaWFuY2VJbml0aWFsaXplcjpcbiAgICAgICAgICBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLm1vdmluZ1ZhcmlhbmNlSW5pdGlhbGl6ZXIpLFxuICAgICAgYmV0YVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJldGFSZWd1bGFyaXplciksXG4gICAgICBnYW1tYVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmdhbW1hUmVndWxhcml6ZXIpLFxuICAgICAgYmV0YUNvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5iZXRhQ29uc3RyYWludCksXG4gICAgICBnYW1tYUNvbnN0cmFpbnQ6IHNlcmlhbGl6ZUNvbnN0cmFpbnQodGhpcy5nYW1tYUNvbnN0cmFpbnQpXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhCYXRjaE5vcm1hbGl6YXRpb24pO1xuXG5leHBvcnQgaW50ZXJmYWNlIExheWVyTm9ybWFsaXphdGlvbkxheWVyQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBUaGUgYXhpcyBvciBheGVzIHRoYXQgc2hvdWxkIGJlIG5vcm1hbGl6ZWQgKHR5cGljYWxseSwgdGhlIGZlYXR1cmUgYXhpcykuXG4gICAqIERlZmF1bHRzIHRvIC0xICh0aGUgbGFzdCBheGlzKS5cbiAgICovXG4gIGF4aXM/OiBudW1iZXJ8bnVtYmVyW107XG5cbiAgLyoqXG4gICAqIEEgc21hbGwgcG9zaXRpdmUgZmxvYXQgYWRkZWQgdG8gdmFyaWFuY2UgdG8gYXZvaWQgZGl2aXNpb24gYnkgemVyby5cbiAgICogRGVmYXVsdHMgdG8gMWUtMy5cbiAgICovXG4gIGVwc2lsb24/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIElmIGB0cnVlYCwgYWRkIG9mZnNldCBvZiBgYmV0YWAgdG8gbm9ybWFsaXplZCB0ZW5zb3IuXG4gICAqIElmIGBmYWxzZWAsIGBiZXRhYCBpcyBpZ25vcmVkLlxuICAgKiBEZWZhdWx0OiBgdHJ1ZWAuXG4gICAqL1xuICBjZW50ZXI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiBgdHJ1ZWAsIG11bHRpcGx5IG91dHB1dCBieSBgZ2FtbWFgLlxuICAgKiBJZiBgZmFsc2VgLCBgZ2FtbWFgIGlzIG5vdCB1c2VkLlxuICAgKiBXaGVuIHRoZSBuZXh0IGxheWVyIGlzIGxpbmVhciwgdGhpcyBjYW4gYmUgZGlzYWJsZWQgc2luY2Ugc2NhbGluZyB3aWxsXG4gICAqIGJlIGRvbmUgYnkgdGhlIG5leHQgbGF5ZXIuXG4gICAqIERlZmF1bHQ6IGB0cnVlYC5cbiAgICovXG4gIHNjYWxlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIHRoZSBiZXRhIHdlaWdodC5cbiAgICogRGVmYXVsdDogYCd6ZXJvcydgLlxuICAgKi9cbiAgYmV0YUluaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplciBmb3IgdGhlIGdhbW1hIHdlaWdodC5cbiAgICogRGVmYXVsdDogYCdvbmVzJ2AuXG4gICAqL1xuICBnYW1tYUluaXRpYWxpemVyPzogSW5pdGlhbGl6ZXJJZGVudGlmaWVyfEluaXRpYWxpemVyO1xuXG4gIC8qKiBSZWd1bGFyaXplciBmb3IgdGhlIGJldGEgd2VpZ2h0LiAqL1xuICBiZXRhUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcklkZW50aWZpZXJ8UmVndWxhcml6ZXI7XG5cbiAgLyoqIFJlZ3VsYXJpemVyIGZvciB0aGUgZ2FtbWEgd2VpZ2h0LiAqL1xuICBnYW1tYVJlZ3VsYXJpemVyPzogUmVndWxhcml6ZXJJZGVudGlmaWVyfFJlZ3VsYXJpemVyO1xufVxuXG5leHBvcnQgY2xhc3MgTGF5ZXJOb3JtYWxpemF0aW9uIGV4dGVuZHMgTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIGNsYXNzTmFtZSA9ICdMYXllck5vcm1hbGl6YXRpb24nO1xuXG4gIHByaXZhdGUgYXhpczogbnVtYmVyfG51bWJlcltdO1xuICByZWFkb25seSBlcHNpbG9uOiBudW1iZXI7XG4gIHJlYWRvbmx5IGNlbnRlcjogYm9vbGVhbjtcbiAgcmVhZG9ubHkgc2NhbGU6IGJvb2xlYW47XG4gIHJlYWRvbmx5IGJldGFJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHJlYWRvbmx5IGdhbW1hSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICByZWFkb25seSBiZXRhUmVndWxhcml6ZXI6IFJlZ3VsYXJpemVyO1xuICByZWFkb25seSBnYW1tYVJlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcblxuICBwcml2YXRlIGdhbW1hOiBMYXllclZhcmlhYmxlO1xuICBwcml2YXRlIGJldGE6IExheWVyVmFyaWFibGU7XG5cbiAgY29uc3RydWN0b3IoYXJncz86IExheWVyTm9ybWFsaXphdGlvbkxheWVyQXJncykge1xuICAgIGlmIChhcmdzID09IG51bGwpIHtcbiAgICAgIGFyZ3MgPSB7fTtcbiAgICB9XG4gICAgc3VwZXIoYXJncyk7XG5cbiAgICB0aGlzLmF4aXMgPSBhcmdzLmF4aXMgPT0gbnVsbCA/IC0xIDogYXJncy5heGlzO1xuICAgIGlmICh0eXBlb2YgdGhpcy5heGlzID09PSAnbnVtYmVyJykge1xuICAgICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKHRoaXMuYXhpcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYEV4cGVjdGVkIGF4aXMgdG8gYmUgYW4gaW50ZWdlciwgYnV0IHJlY2VpdmVkICR7dGhpcy5heGlzfWApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0aGlzLmF4aXMpKSB7XG4gICAgICBmb3IgKGNvbnN0IGF4aXMgb2YgdGhpcy5heGlzKSB7XG4gICAgICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihheGlzKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgYEV4cGVjdGVkIGF4aXMgdG8gYmUgYW4gYXJyYXkgb2YgaW50ZWdlcnMsIGAgK1xuICAgICAgICAgICAgICBgYnV0IHJlY2VpdmVkICR7SlNPTi5zdHJpbmdpZnkodGhpcy5heGlzKX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgYEV4cGVjdGVkIGF4aXMgdG8gYmUgYW4gaW50ZWdlciBvciBhbiBhcnJheSBvZiBpbnRlZ2VycywgYCArXG4gICAgICAgICAgYGJ1dCByZWNlaXZlZCAke0pTT04uc3RyaW5naWZ5KHRoaXMuYXhpcyl9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5lcHNpbG9uID0gYXJncy5lcHNpbG9uID09IG51bGwgPyAxZS0zIDogYXJncy5lcHNpbG9uO1xuICAgIHRoaXMuY2VudGVyID0gYXJncy5jZW50ZXIgPT0gbnVsbCA/IHRydWUgOiBhcmdzLmNlbnRlcjtcbiAgICB0aGlzLnNjYWxlID0gYXJncy5zY2FsZSA9PSBudWxsID8gdHJ1ZSA6IGFyZ3Muc2NhbGU7XG4gICAgdGhpcy5iZXRhSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihhcmdzLmJldGFJbml0aWFsaXplciB8fCAnemVyb3MnKTtcbiAgICB0aGlzLmdhbW1hSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihhcmdzLmdhbW1hSW5pdGlhbGl6ZXIgfHwgJ29uZXMnKTtcbiAgICB0aGlzLmJldGFSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MuYmV0YVJlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmdhbW1hUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmdhbW1hUmVndWxhcml6ZXIpO1xuXG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICB9XG5cbiAgcHVibGljIG92ZXJyaWRlIGJ1aWxkKGlucHV0U2hhcGU6IFNoYXBlfFNoYXBlW10pOiB2b2lkIHtcbiAgICBpbnB1dFNoYXBlID0gZ2V0RXhhY3RseU9uZVNoYXBlKGlucHV0U2hhcGUpO1xuICAgIGNvbnN0IG5EaW1zID0gaW5wdXRTaGFwZS5sZW5ndGg7XG5cbiAgICAvLyBDb252ZXJ0IGF4aXMgdG8gYXJyYXkgYW5kIHJlc29sdmUgbmVnYXRpdmVzLlxuICAgIGlmICh0eXBlb2YgdGhpcy5heGlzID09PSAnbnVtYmVyJykge1xuICAgICAgdGhpcy5heGlzID0gW3RoaXMuYXhpc107XG4gICAgfVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5heGlzLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAodGhpcy5heGlzW2ldIDwgMCkge1xuICAgICAgICB0aGlzLmF4aXNbaV0gKz0gbkRpbXM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRnVydGhlciB2YWxpZGF0ZSBheGVzLlxuICAgIGZvciAoY29uc3QgYXhpcyBvZiB0aGlzLmF4aXMpIHtcbiAgICAgIGlmIChheGlzIDwgMCB8fCBheGlzID49IG5EaW1zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBheGlzOiAke2F4aXN9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0aGlzLmF4aXMubGVuZ3RoICE9PSBnZW5lcmljX3V0aWxzLnVuaXF1ZSh0aGlzLmF4aXMpLmxlbmd0aCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGb3VuZCBkdXBsaWNhdGUgYXhlcyBpbjogJHt0aGlzLmF4aXN9YCk7XG4gICAgfVxuXG4gICAgY29uc3QgcGFyYW1TaGFwZSA9IHRoaXMuYXhpcy5tYXAoYXhpcyA9PiBpbnB1dFNoYXBlW2F4aXNdKSBhcyBudW1iZXJbXTtcblxuICAgIGNvbnN0IHRyYWluYWJsZSA9IHRydWU7XG4gICAgaWYgKHRoaXMuc2NhbGUpIHtcbiAgICAgIHRoaXMuZ2FtbWEgPSB0aGlzLmFkZFdlaWdodChcbiAgICAgICAgICAnZ2FtbWEnLCBwYXJhbVNoYXBlLCAnZmxvYXQzMicsIHRoaXMuZ2FtbWFJbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLmdhbW1hUmVndWxhcml6ZXIsIHRyYWluYWJsZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZ2FtbWEgPSBudWxsO1xuICAgIH1cbiAgICBpZiAodGhpcy5jZW50ZXIpIHtcbiAgICAgIHRoaXMuYmV0YSA9IHRoaXMuYWRkV2VpZ2h0KFxuICAgICAgICAgICdiZXRhJywgcGFyYW1TaGFwZSwgJ2Zsb2F0MzInLCB0aGlzLmJldGFJbml0aWFsaXplcixcbiAgICAgICAgICB0aGlzLmJldGFSZWd1bGFyaXplciwgdHJhaW5hYmxlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5iZXRhID0gbnVsbDtcbiAgICB9XG5cbiAgICB0aGlzLmJ1aWx0ID0gdHJ1ZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGNhbGwoaW5wdXRzOiBUZW5zb3J8VGVuc29yW10sIGt3YXJnczogS3dhcmdzKTogVGVuc29yfFRlbnNvcltdIHtcbiAgICBjb25zdCBpbnB1dCA9IGdldEV4YWN0bHlPbmVUZW5zb3IoaW5wdXRzKTtcbiAgICBjb25zdCBpbnB1dFNoYXBlID0gaW5wdXQuc2hhcGU7XG4gICAgY29uc3QgbkRpbXMgPSBpbnB1dFNoYXBlLmxlbmd0aDtcblxuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IGtlZXBEaW1zID0gdHJ1ZTtcbiAgICAgIGxldCB7bWVhbiwgdmFyaWFuY2V9ID0gbW9tZW50cyhpbnB1dCwgdGhpcy5heGlzLCBrZWVwRGltcyk7XG4gICAgICBjb25zdCBicm9hZGNhc3RTaGFwZSA9IGdlbmVyaWNfdXRpbHMucHlMaXN0UmVwZWF0KDEsIG5EaW1zKTtcbiAgICAgIGZvciAoY29uc3QgZGltIG9mIHRoaXMuYXhpcyBhcyBudW1iZXJbXSkge1xuICAgICAgICBicm9hZGNhc3RTaGFwZVtkaW1dID0gaW5wdXRTaGFwZVtkaW1dO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBicm9hZGNhc3QgPSAodjogVGVuc29yKSA9PiB7XG4gICAgICAgIGlmICh2ICE9IG51bGwgJiYgdi5zaGFwZS5sZW5ndGggIT09IG5EaW1zKSB7XG4gICAgICAgICAgcmV0dXJuIHRmYy5yZXNoYXBlKHYsIGJyb2FkY2FzdFNoYXBlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gdjtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbGV0IHNjYWxlID0gdGhpcy5zY2FsZSA/IGJyb2FkY2FzdCh0aGlzLmdhbW1hLnJlYWQoKSkgOiBudWxsO1xuICAgICAgbGV0IG9mZnNldCA9IHRoaXMuY2VudGVyID8gYnJvYWRjYXN0KHRoaXMuYmV0YS5yZWFkKCkpIDogbnVsbDtcblxuICAgICAgLy8gVE9ETyhodHRwczovL2dpdGh1Yi5jb20vdGVuc29yZmxvdy90ZmpzL2lzc3Vlcy8yMTIwKTogVGhlIHRpbGluZyBiZWxvd1xuICAgICAgLy8gaXMgYSB3b3JrYXJvdW5kIGZvciB0aGUgbGltaXRhdGlvbiBvZiBjb3JlJ3MgYmF0Y2hOb3JtYWxpemF0aW9uP2QgZG9uJ3RcbiAgICAgIC8vIHN1cHBvcnQgYnJvYWRjYXN0aW5nIGluIHRoZWlyIGdyYWRpZW50cy4gSW4gYWRkaXRpb24sIHRoZSB0aWxpbmcgaXNcbiAgICAgIC8vIG5lY2Vzc2FyeSB0byBlbnN1cmUgY29ycmVjdG5lc3Mgb24gdGhlIGJyb3dzZXIgQ1BVIGJhY2tlbmQgcmVnYXJkbGVzc1xuICAgICAgLy8gb2YgZm9yd2FyZCBvciBiYWNrd2FyZCBjb21wdXRhdGlvbi4gUmVtb3ZlIHRoaXMgd29ya2Fyb3VuZCBvbmNlIHRoZVxuICAgICAgLy8gbGltaXRhdGlvbiBpcyBhZGRyZXNzZWQuIFNlZSAuXG4gICAgICBjb25zdCBtb21lbnRzVGlsaW5nOiBudW1iZXJbXSA9IFtdO1xuICAgICAgY29uc3Qgc2NhbGVPZmZzZXRUaWxpbmc6IG51bWJlcltdID0gW107XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5EaW1zOyArK2kpIHtcbiAgICAgICAgaWYgKCh0aGlzLmF4aXMgYXMgbnVtYmVyW10pLmluZGV4T2YoaSkgIT09IC0xKSB7XG4gICAgICAgICAgbW9tZW50c1RpbGluZy5wdXNoKGlucHV0U2hhcGVbaV0pO1xuICAgICAgICAgIHNjYWxlT2Zmc2V0VGlsaW5nLnB1c2goMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbW9tZW50c1RpbGluZy5wdXNoKDEpO1xuICAgICAgICAgIHNjYWxlT2Zmc2V0VGlsaW5nLnB1c2goaW5wdXRTaGFwZVtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG1lYW4gPSB0ZmMudGlsZShtZWFuLCBtb21lbnRzVGlsaW5nKTtcbiAgICAgIHZhcmlhbmNlID0gdGZjLnRpbGUodmFyaWFuY2UsIG1vbWVudHNUaWxpbmcpO1xuICAgICAgaWYgKHNjYWxlICE9IG51bGwpIHtcbiAgICAgICAgc2NhbGUgPSB0ZmMudGlsZShzY2FsZSwgc2NhbGVPZmZzZXRUaWxpbmcpO1xuICAgICAgfVxuICAgICAgaWYgKG9mZnNldCAhPSBudWxsKSB7XG4gICAgICAgIG9mZnNldCA9IHRmYy50aWxlKG9mZnNldCwgc2NhbGVPZmZzZXRUaWxpbmcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYmF0Y2hOb3JtYWxpemF0aW9uKFxuICAgICAgICAgIGlucHV0LCBtZWFuLCB2YXJpYW5jZSwgb2Zmc2V0LCBzY2FsZSwgdGhpcy5lcHNpbG9uKTtcbiAgICB9KTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZzogc2VyaWFsaXphdGlvbi5Db25maWdEaWN0ID0ge1xuICAgICAgYXhpczogdGhpcy5heGlzLFxuICAgICAgZXBzaWxvbjogdGhpcy5lcHNpbG9uLFxuICAgICAgY2VudGVyOiB0aGlzLmNlbnRlcixcbiAgICAgIHNjYWxlOiB0aGlzLnNjYWxlLFxuICAgICAgYmV0YUluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmJldGFJbml0aWFsaXplciksXG4gICAgICBnYW1tYUluaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmdhbW1hSW5pdGlhbGl6ZXIpLFxuICAgICAgYmV0YVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmJldGFSZWd1bGFyaXplciksXG4gICAgICBnYW1tYVJlZ3VsYXJpemVyOiBzZXJpYWxpemVSZWd1bGFyaXplcih0aGlzLmdhbW1hUmVndWxhcml6ZXIpXG4gICAgfTtcbiAgICBjb25zdCBiYXNlQ29uZmlnID0gc3VwZXIuZ2V0Q29uZmlnKCk7XG4gICAgT2JqZWN0LmFzc2lnbihjb25maWcsIGJhc2VDb25maWcpO1xuICAgIHJldHVybiBjb25maWc7XG4gIH1cbn1cbnNlcmlhbGl6YXRpb24ucmVnaXN0ZXJDbGFzcyhMYXllck5vcm1hbGl6YXRpb24pO1xuIl19