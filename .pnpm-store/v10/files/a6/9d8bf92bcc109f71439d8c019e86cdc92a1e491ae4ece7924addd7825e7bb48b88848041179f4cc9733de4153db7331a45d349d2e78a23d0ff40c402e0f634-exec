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
/**
 *  TFJS-based multi-head attention layer.
 */
/* Original source: keras/layers/attention/multi_head_attention.py */
import { einsum, linalg, logicalAnd, mul, ones, serialization, tidy, util } from '@tensorflow/tfjs-core';
import { cast, expandDims } from '../../backend/tfjs_backend';
import { getConstraint, serializeConstraint } from '../../constraints';
import { Layer } from '../../engine/topology';
import { ValueError } from '../../errors';
import { getInitializer, serializeInitializer } from '../../initializers';
import { getRegularizer, serializeRegularizer } from '../../regularizers';
import { Softmax } from '../advanced_activations';
import { Dropout } from '../core';
import { EinsumDense } from './einsum_dense';
const _CHR_IDX = 'abcdefghijklmnopqrstuvwxyz'.split('');
/**
 * Builds einsum equations for the attention computation.
 *
 * Query, key, value inputs after projection are expected to have the shape as:
 * `(bs, <non-attention dims>, <attention dims>, numHeads, channels)`.
 * `bs` and `<non-attention dims>` are treated as `<batch dims>`.
 *
 * The attention operations can be generalized:
 * (1) Query-key dot product:
 * `(<batch dims>, <query attention dims>, numHeads, channels), (<batch dims>,
 * <key attention dims>, numHeads, channels) -> (<batch dims>,
 * numHeads, <query attention dims>, <key attention dims>)`
 * (2) Combination:
 * `(<batch dims>, numHeads, <query attention dims>, <key attention dims>),
 * (<batch dims>, <value attention dims>, numHeads, channels) -> (<batch
 * dims>, <query attention dims>, numHeads, channels)`
 *
 * @param rank Rank of query, key, value tensors.
 * @param attnAxes Array of axes, `[-1, rank)`,
 *    that attention will be applied to.
 * @returns Einsum equations.
 */
function buildAttentionEquation(rank, attnAxes) {
    const targetNotationArr = _CHR_IDX.slice(0, rank);
    // `batchDims` includes the head dim.
    const excludeIndices = [...attnAxes, rank - 1];
    const batchDims = [];
    for (const e of Array(rank).keys()) {
        if (!excludeIndices.includes(e)) {
            batchDims.push(e);
        }
    }
    let letterOffset = rank;
    let sourceNotation = '';
    for (let i = 0; i < rank; i++) {
        if (batchDims.includes(i) || i === rank - 1) {
            sourceNotation += targetNotationArr[i];
        }
        else {
            sourceNotation += _CHR_IDX[letterOffset];
            letterOffset++;
        }
    }
    const productNotation = batchDims.map(i => targetNotationArr[i]).concat(attnAxes.map(i => targetNotationArr[i]), attnAxes.map(i => sourceNotation[i])).join('');
    const targetNotation = targetNotationArr.join('');
    const dotProductEquation = `${sourceNotation},${targetNotation}->${productNotation}`;
    const attnScoresRank = productNotation.length;
    const combineEquation = `${productNotation},${sourceNotation}->${targetNotation}`;
    return [dotProductEquation, combineEquation, attnScoresRank];
}
/**
 * Builds an einsum equation for projections inside multi-head attention.
 */
function buildProjectionEquation(freeDims, boundDims, outputDims) {
    let inputStr = '';
    let kernelStr = '';
    let outputStr = '';
    let biasAxes = '';
    let letterOffset = 0;
    for (let i = 0; i < freeDims; i++) {
        const char = _CHR_IDX[i + letterOffset];
        inputStr += char;
        outputStr += char;
    }
    letterOffset += freeDims;
    for (let i = 0; i < boundDims; i++) {
        const char = _CHR_IDX[i + letterOffset];
        inputStr += char;
        kernelStr += char;
    }
    letterOffset += boundDims;
    for (let i = 0; i < outputDims; i++) {
        const char = _CHR_IDX[i + letterOffset];
        kernelStr += char;
        outputStr += char;
        biasAxes += char;
    }
    const equation = `${inputStr},${kernelStr}->${outputStr}`;
    return [equation, biasAxes, outputStr.length];
}
function getOutputShape(outputRank, knownLastDims) {
    const outputShape = Array(outputRank - knownLastDims.length).fill(null).concat(knownLastDims);
    return outputShape;
}
/**
 * MultiHeadAttention layer.
 *
 * This is an implementation of multi-headed attention as described in the
 * paper "Attention is all you Need" (Vaswani et al., 2017).
 * If `query`, `key,` `value` are the same, then
 * this is self-attention. Each timestep in `query` attends to the
 * corresponding sequence in `key`, and returns a fixed-width vector.
 *
 * This layer first projects `query`, `key` and `value`. These are
 * (effectively) a list of tensors of length `numAttentionHeads`, where the
 * corresponding shapes are `(batchSize, <query dimensions>, keyDim)`,
 * `(batchSize, <key/value dimensions>, keyDim)`,
 * `(batchSize, <key/value dimensions>, valueDim)`.
 *
 * Then, the query and key tensors are dot-producted and scaled. These are
 * softmaxed to obtain attention probabilities. The value tensors are then
 * interpolated by these probabilities, then concatenated back to a single
 * tensor.
 *
 * Finally, the result tensor with the last dimension as valueDim can take an
 * linear projection and return.
 *
 * When using `MultiHeadAttention` inside a custom layer, the custom layer must
 * implement its own `build()` method and call `MultiHeadAttention`'s
 * `buildFromSignature()` there.
 * This enables weights to be restored correctly when the model is loaded.
 *
 * Examples:
 *
 * Performs 1D cross-attention over two sequence inputs with an attention mask.
 * Returns the additional attention weights over heads.
 *
 * ```js
 * const layer = new MultiHeadAttention({numHeads: 2, keyDim: 2});
 * const target = tf.input({shape: [8, 16]});
 * const source = tf.input({shape: [4, 16]});
 * const outputTensor, weights = layer.callAndReturnAttentionScores(
 *     target, {value: source});
 * console.log(outputTensor.shape);  // [null, 8, 16]
 * console.log(weights.shape);  // [null, 2, 8, 4]
 * ```
 *
 * Performs 2D self-attention over a 5D input tensor on axes 2 and 3.
 *
 * ```js
 * const layer = new MultiHeadAttention({
 *    numHeads: 2, keyDim: 2, attentionAxes: [2, 3]});
 * const inputTensor = tf.input({shape: [5, 3, 4, 16]});
 * const outputTensor = layer.call(inputTensor, {value: inputTensor});
 * console.log(outputTensor.shape);  // [null, 5, 3, 4, 16]
 * ```
 *
 * Returns:
 *    attentionOutput: The result of the computation, of shape `(B, T, E)`,
 *        where `T` is for target sequence shapes and `E` is the query input
 *        last dimension if `outputShape` is `None`. Otherwise, the
 *        multi-head outputs are projected to the shape specified by
 *        `outputShape`.
 *    attentionScores: multi-head attention coefficients over attention axes.
 */
class MultiHeadAttention extends Layer {
    constructor(args) {
        var _a, _b, _c, _d, _e;
        super(args);
        this.supportsMasking = true;
        this.numHeads = args.numHeads;
        this.keyDim = args.keyDim;
        this.valueDim = (_a = args.valueDim) !== null && _a !== void 0 ? _a : args.keyDim;
        this.dropout = (_b = args.dropout) !== null && _b !== void 0 ? _b : 0;
        this.useBias = (_c = args.useBias) !== null && _c !== void 0 ? _c : true;
        this._outputShape = args.outputShape;
        this.kernelInitializer = getInitializer((_d = args.kernelInitializer) !== null && _d !== void 0 ? _d : 'glorotUniform');
        this.biasInitializer = getInitializer((_e = args.biasInitializer) !== null && _e !== void 0 ? _e : 'zeros');
        this.kernelRegularizer = getRegularizer(args.kernelRegularizer);
        this.biasRegularizer = getRegularizer(args.biasRegularizer);
        this.activityRegularizer = getRegularizer(args.activityRegularizer);
        this.kernelConstraint = getConstraint(args.kernelConstraint);
        this.biasConstraint = getConstraint(args.biasConstraint);
        if (args.attentionAxes != null && !Array.isArray(args.attentionAxes)) {
            this.attentionAxes = [args.attentionAxes];
        }
        else {
            this.attentionAxes = args.attentionAxes;
        }
        this.builtFromSignature = false;
        this.queryShape = null;
        this.keyShape = null;
        this.valueShape = null;
    }
    /**
     * Should be used for testing purposes only.
     */
    get _queryDense() {
        return this.queryDense;
    }
    /**
     * Should be used for testing purposes only.
     */
    get _keyDense() {
        return this.keyDense;
    }
    /**
     * Should be used for testing purposes only.
     */
    get _valueDense() {
        return this.valueDense;
    }
    /**
     * Should be used for testing purposes only.
     */
    get _outputDense() {
        return this.outputDense;
    }
    getConfig() {
        const config = {
            numHeads: this.numHeads,
            keyDim: this.keyDim,
            valueDim: this.valueDim,
            dropout: this.dropout,
            useBias: this.useBias,
            outputShape: this._outputShape,
            attentionAxes: this.attentionAxes,
            kernelInitializer: serializeInitializer(this.kernelInitializer),
            biasInitializer: serializeInitializer(this.biasInitializer),
            kernelRegularizer: serializeRegularizer(this.kernelRegularizer),
            biasRegularizer: serializeRegularizer(this.biasRegularizer),
            activityRegularizer: serializeRegularizer(this.activityRegularizer),
            kernelConstraint: serializeConstraint(this.kernelConstraint),
            biasConstraint: serializeConstraint(this.biasConstraint),
            queryShape: this.queryShape,
            keyShape: this.keyShape,
            valueShape: this.valueShape,
        };
        const baseConfig = super.getConfig();
        Object.assign(config, baseConfig);
        return config;
    }
    static fromConfig(cls, config) {
        // If the layer has a different build() function from the default,
        // we need to trigger the customized build to create weights.
        const queryShape = config['queryShape'];
        const keyShape = config['keyShape'];
        const valueShape = config['valueShape'];
        delete config['queryShape'];
        delete config['keyShape'];
        delete config['valueShape'];
        const layer = new cls(config);
        if ([queryShape, keyShape, valueShape].includes(null)) {
            console.warn('One of dimensions of the input shape is missing. It ' +
                'should have been memorized when the layer was serialized. ' +
                `${cls.toString()} is created without weights.`);
        }
        else {
            layer.buildFromSignature(queryShape, valueShape, keyShape);
        }
        return layer;
    }
    /**
     * Builds layers and variables.
     *
     * Once the method is called, this.builtFromSignature will be set to true.
     */
    buildFromSignature(queryShape, valueShape, keyShape) {
        this.builtFromSignature = true;
        if (keyShape == null) {
            keyShape = valueShape;
        }
        this.queryShape = queryShape;
        this.valueShape = valueShape;
        this.keyShape = keyShape;
        // Not using SymbolicTensors since tf.input() adds a batch dimension to the
        // given shape, therefore giving the tensor the wrong rank.
        const queryRank = queryShape.length;
        const valueRank = valueShape.length;
        const keyRank = keyShape.length;
        const freeDims = queryRank - 1;
        let [einsumEquation, biasAxes, outputRank] = buildProjectionEquation(freeDims, 1, 2);
        this.queryDense = new EinsumDense(Object.assign({ equation: einsumEquation, outputShape: getOutputShape(outputRank - 1, [this.numHeads, this.keyDim]), biasAxes: this.useBias ? biasAxes : null, name: 'query' }, this.getCommonKwargsForSublayer()));
        [einsumEquation, biasAxes, outputRank] =
            buildProjectionEquation(keyRank - 1, 1, 2);
        this.keyDense = new EinsumDense(Object.assign({ equation: einsumEquation, outputShape: getOutputShape(outputRank - 1, [this.numHeads, this.keyDim]), biasAxes: this.useBias ? biasAxes : null, name: 'key' }, this.getCommonKwargsForSublayer()));
        [einsumEquation, biasAxes, outputRank] =
            buildProjectionEquation(valueRank - 1, 1, 2);
        this.valueDense = new EinsumDense(Object.assign({ equation: einsumEquation, outputShape: getOutputShape(outputRank - 1, [this.numHeads, this.valueDim]), biasAxes: this.useBias ? biasAxes : null, name: 'value' }, this.getCommonKwargsForSublayer()));
        // Builds the attention computations for multi-head dot product attention.
        this.buildAttention(outputRank);
        this.outputDense = this.makeOutputDense(freeDims, this.getCommonKwargsForSublayer(), 'attentionOutput');
    }
    getCommonKwargsForSublayer() {
        // Create new clone of kernel/bias initializer, so that we don't reuse
        // the initializer instance, which could lead to same init value since
        // initializer is stateless.
        const kernelInitializer = getInitializer({
            className: this.kernelInitializer.getClassName(),
            config: this.kernelInitializer.getConfig(),
        });
        const biasInitializer = getInitializer({
            className: this.biasInitializer.getClassName(),
            config: this.biasInitializer.getConfig(),
        });
        const commonKwargs = {
            kernelInitializer,
            biasInitializer,
            kernelRegularizer: this.kernelRegularizer,
            biasRegularizer: this.biasRegularizer,
            activityRegularizer: this.activityRegularizer,
            kernelConstraint: this.kernelConstraint,
            biasConstraint: this.biasConstraint,
        };
        return commonKwargs;
    }
    /**
     * Builds the output projection matrix.
     *
     * @param freeDims Number of free dimensions for einsum equation building.
     * @param commonKwargs Common keyword arguments for einsum layer.
     * @param name Name for the projection layer.
     * @returns Projection layer.
     */
    makeOutputDense(freeDims, commonKwargs, name) {
        let outputShape;
        if (this._outputShape) {
            if (!Array.isArray(this._outputShape)) {
                outputShape = [this._outputShape];
            }
            else {
                outputShape = this._outputShape;
            }
        }
        else {
            outputShape = [this.queryShape[this.queryShape.length - 1]];
        }
        const [einsumEquation, biasAxes, outputRank] = buildProjectionEquation(freeDims, 2, outputShape.length);
        return new EinsumDense(Object.assign({ equation: einsumEquation, outputShape: getOutputShape(outputRank - 1, outputShape), biasAxes: this.useBias ? biasAxes : null, name }, commonKwargs));
    }
    /**
     * Builds multi-head dot-product attention computations.
     *
     * This function builds attributes necessary for `computeAttention` to
     * customize attention computation to replace the default dot-product
     * attention.
     *
     * @param rank The rank of query, key, value tensors.
     */
    buildAttention(rank) {
        if (this.attentionAxes == null) {
            this.attentionAxes = [];
            for (let i = 1; i < rank - 2; i++) {
                this.attentionAxes.push(i);
            }
        }
        else {
            this.attentionAxes = [...this.attentionAxes];
        }
        const [dotProductEquation, combineEquation, attnScoresRank] = buildAttentionEquation(rank, this.attentionAxes);
        this.dotProductEquation = dotProductEquation;
        this.combineEquation = combineEquation;
        const normAxes = [];
        const startIdx = attnScoresRank - this.attentionAxes.length;
        for (let i = startIdx; i < attnScoresRank; i++) {
            normAxes.push(i);
        }
        this.softmax = new Softmax({ axis: normAxes });
        this.dropoutLayer = new Dropout({ rate: this.dropout });
    }
    maskedSoftmax(attentionScores, attentionMask) {
        return tidy(() => {
            // Normalize the attention scores to probabilities.
            // `attentionScores` = [B, N, T, S]
            if (attentionMask != null) {
                // The expand dim happens starting from the `numHeads` dimension,
                // (<batchDims>, numHeads, <queryAttentionDims, keyAttentionDims>)
                const maskExpansionAxis = -this.attentionAxes.length * 2 - 1;
                const endIdx = attentionScores.shape.length - attentionMask.shape.length;
                for (let _ = 0; _ < endIdx; _++) {
                    attentionMask = expandDims(attentionMask, maskExpansionAxis);
                }
            }
            return this.softmax.apply(attentionScores, { mask: attentionMask });
        });
    }
    /**
     * Applies Dot-product attention with query, key, value tensors.
     *
     * This function defines the computation inside `call` with projected
     * multi-head Q, K, V inputs. Users can override this function for
     * customized attention implementation.
     *
     * @param query Projected query `Tensor` of shape `(B, T, N, keyDim)`.
     * @param key  Projected key `Tensor` of shape `(B, S, N, keyDim)`.
     * @param value Projected value `Tensor` of shape `(B, S, N, valueDim)`.
     * @param attentionMask A boolean mask of shape `(B, T, S)`, that prevents
     *    attention to certain positions. It is generally not needed if
     *    the `query` and `value` (and/or `key`) are masked.
     * @param training Boolean indicating whether the layer should behave
     *    in training mode (adding dropout) or in inference mode (doing
     *    nothing).
     * @returns attentionOutput: Multi-headed outputs of attention computation.
     * @returns attentionScores: Multi-headed attention weights.
     */
    computeAttention(query, key, value, attentionMask, training) {
        return tidy(() => {
            // Note: Applying scalar multiply at the smaller end of einsum improves
            // XLA performance, but may introduce slight numeric differences in
            // the Transformer attention head.
            query = mul(query, 1.0 / Math.sqrt(this.keyDim));
            // Take the dot product between "query" and "key" to get the raw
            // attention scores.
            let attentionScores = einsum(this.dotProductEquation, key, query);
            attentionScores = this.maskedSoftmax(attentionScores, attentionMask);
            // This is actually dropping out entire tokens to attend to, which might
            // seem a bit unusual, but is taken from the original Transformer paper.
            const attentionScoresDropout = this.dropoutLayer.apply(attentionScores, { training });
            // `contextLayer` = [B, T, N, H]
            const attentionOutput = einsum(this.combineEquation, attentionScoresDropout, value);
            return [attentionOutput, attentionScores];
        });
    }
    apply(inputs, kwargs) {
        var _a;
        if (!kwargs || !kwargs['value']) {
            throw new ValueError('Must pass in `value` argument in `kwargs.`');
        }
        let newInputs;
        newInputs = [inputs, kwargs['value']].concat((_a = kwargs['key']) !== null && _a !== void 0 ? _a : []);
        // TODO(pforderique): Support mask propagation.
        return super.apply(newInputs, kwargs);
    }
    call(query, kwargs) {
        return tidy(() => {
            return this.callAndReturnAttentionScores(query, kwargs)[0];
        });
    }
    /**
     * Exactly like `call` except also returns the attention scores.
     */
    callAndReturnAttentionScores(query, { value, key, useCausalMask, attentionMask, training }) {
        return tidy(() => {
            if (!this.builtFromSignature) {
                this.buildFromSignature(query.shape, value.shape, key ? key.shape : null);
            }
            if (key == null) {
                key = value;
            }
            // TODO(pforderique): Support RaggedTensor inputs.
            attentionMask = this.computeAttentionMask(query, value, attentionMask, useCausalMask);
            //   N = `numAttentionHeads`
            //   H = `sizePerHead`
            // `query` = [B, T, N ,H]
            query = this.queryDense.apply(query);
            // `key` = [B, S, N, H]
            key = this.keyDense.apply(key);
            // `value` = [B, S, N, H]
            value = this.valueDense.apply(value);
            const [attentionOutputPreDense, attentionScores] = this.computeAttention(query, key, value, attentionMask, training);
            const attentionOutput = this.outputDense.apply(attentionOutputPreDense);
            return [attentionOutput, attentionScores];
        });
    }
    /**
     * Computes the attention mask.
     *
     * * The `query`'s mask is reshaped from [B, T] to [B, T, 1].
     * * The `value`'s mask is reshaped from [B, S] to [B, 1, S].
     * * The `key`'s mask is reshaped from [B, S] to [B, 1, S]. The `key`'s
     *   mask is ignored if `key` is `None` or if `key is value`.
     * * If `useCausalMask=true`, then the causal mask is computed. Its shape
     *   is [1, T, S].
     *
     * All defined masks are merged using a logical AND operation (`&`).
     *
     * In general, if the `query` and `value` are masked, then there is no need
     * to define the `attentionMask`.
     *
     * @param query Projected query `Tensor` of shape `(B, T, N, keyDim)`.
     * @param key  Projected key `Tensor` of shape `(B, S, N, keyDim)`.
     * @param value Projected value `Tensor` of shape `(B, S, N, valueDim)`.
     * @param attentionMask A boolean mask of shape `(B, T, S)`, that prevents
     *    attention to certain positions.
     * @param useCausalMask  A boolean to indicate whether to apply a causal
     *    mask to prevent tokens from attending to future tokens (e.g.,
     *    used in a decoder Transformer).
     * @returns attentionMask: A boolean mask of shape `(B, T, S)`, that prevents
     *    attention to certain positions, based on the Keras masks of the
     *    `query`, `key`, `value`, and `attentionMask` tensors, and the
     *    causal mask if `useCausalMask=true`.
     */
    computeAttentionMask(query, value, attentionMask, useCausalMask = false) {
        return tidy(() => {
            let autoMask;
            const queryMask = query.kerasMask;
            const valueMask = value.kerasMask;
            if (queryMask != null) {
                autoMask = queryMask.expandDims(2); // Shape is [B, T, 1]
            }
            if (valueMask != null) {
                const mask = valueMask.expandDims(1); // Shape is [B, 1, S]
                autoMask = autoMask ? logicalAnd(autoMask, mask) : mask;
            }
            if (useCausalMask) {
                // the shape of the causal mask is [1, T, S]
                const mask = this.computeCausalMask(query, value);
                autoMask = autoMask ? logicalAnd(autoMask, mask) : mask;
            }
            if (autoMask != null) {
                // Merge attentionMask & automatic mask, to shape [B, T, S]
                attentionMask = attentionMask ?
                    cast(attentionMask, 'bool').logicalAnd(autoMask) : autoMask;
            }
            return attentionMask;
        });
    }
    /**
     * Computes a causal mask (e.g., for masked self-attention layers).
     *
     * For example, if query and value both contain sequences of length 4,
     * this function returns a boolean `Tensor` equal to:
     *
     * ```
     * [[[true,  false, false, false],
     *   [true,  true,  false, false],
     *   [true,  true,  true,  false],
     *   [true,  true,  true,  true]]]
     * ```
     *
     * @param query query `Tensor` of shape `(B, T, ...)`.
     * @param value value `Tensor` of shape `(B, S, ...)` (defaults to query).
     * @returns mask: A boolean `Tensor` of shape [1, T, S] containing a lower
     *    triangular matrix of shape [T, S].
     */
    computeCausalMask(query, value) {
        return tidy(() => {
            const qSeqLength = query.shape[1];
            const vSeqLength = value ? value.shape[1] : qSeqLength;
            // Create a lower triangular matrix.
            return linalg.bandPart(ones([1, qSeqLength, vSeqLength], 'bool'), -1, 0);
        });
    }
    /**
     *
     * @param inputShapes A list of [queryShape, valueShape] or
     *    [queryShape, valueShape, keyShape]. If no keyShape provided, valueShape
     *    is assumed as the keyShape.
     */
    computeOutputShape(inputShapes) {
        const [queryShape, valueShape, maybeKeyShape] = inputShapes;
        const keyShape = maybeKeyShape !== null && maybeKeyShape !== void 0 ? maybeKeyShape : valueShape;
        if (queryShape.slice(-1)[0] !== valueShape.slice(-1)[0]) {
            throw new ValueError(`The last dimension of 'queryShape' and 'valueShape' must be equal, ` +
                `but are ${queryShape.slice(-1)[0]}, ${valueShape.slice(-1)[0]}. ` +
                `Received: queryShape=${queryShape}, valueShape=${valueShape}`);
        }
        if (!util.arraysEqual(valueShape.slice(1, -1), keyShape.slice(1, -1))) {
            throw new Error(`All dimensions of 'value' and 'key', except the last one, must be ` +
                `equal. Received ${valueShape} and ${keyShape}`);
        }
        if (this._outputShape) {
            return queryShape.slice(0, -1).concat(this._outputShape);
        }
        return queryShape;
    }
}
/** @nocollapse */
MultiHeadAttention.className = 'MultiHeadAttention';
export { MultiHeadAttention };
serialization.registerClass(MultiHeadAttention);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGloZWFkX2F0dGVudGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3RmanMtbGF5ZXJzL3NyYy9sYXllcnMvbmxwL211bHRpaGVhZF9hdHRlbnRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBRUg7O0dBRUc7QUFFSCxxRUFBcUU7QUFDckUsT0FBTyxFQUFVLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVqSCxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzlELE9BQU8sRUFBb0MsYUFBYSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekcsT0FBTyxFQUFFLEtBQUssRUFBNkIsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzFDLE9BQU8sRUFBc0MsY0FBYyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUcsT0FBTyxFQUFzQyxjQUFjLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNsQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFN0MsTUFBTSxRQUFRLEdBQUcsNEJBQTRCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3hEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FxQkc7QUFDSCxTQUFTLHNCQUFzQixDQUM3QixJQUFZLEVBQUUsUUFBa0I7SUFFaEMsTUFB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LElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUMxRDtRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7O0FBeGpCRCxrQkFBa0I7QUFDRiw0QkFBUyxHQUFHLG9CQUFvQixDQUFDO1NBRnRDLGtCQUFrQjtBQTJqQi9CLGFBQWEsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTEMuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gKi9cblxuLyoqXG4gKiAgVEZKUy1iYXNlZCBtdWx0aS1oZWFkIGF0dGVudGlvbiBsYXllci5cbiAqL1xuXG4vKiBPcmlnaW5hbCBzb3VyY2U6IGtlcmFzL2xheWVycy9hdHRlbnRpb24vbXVsdGlfaGVhZF9hdHRlbnRpb24ucHkgKi9cbmltcG9ydCB7IFRlbnNvciwgZWluc3VtLCBsaW5hbGcsIGxvZ2ljYWxBbmQsIG11bCwgb25lcywgc2VyaWFsaXphdGlvbiwgdGlkeSwgdXRpbCB9IGZyb20gJ0B0ZW5zb3JmbG93L3RmanMtY29yZSc7XG5cbmltcG9ydCB7IGNhc3QsIGV4cGFuZERpbXMgfSBmcm9tICcuLi8uLi9iYWNrZW5kL3RmanNfYmFja2VuZCc7XG5pbXBvcnQgeyBDb25zdHJhaW50LCBDb25zdHJhaW50SWRlbnRpZmllciwgZ2V0Q29uc3RyYWludCwgc2VyaWFsaXplQ29uc3RyYWludCB9IGZyb20gJy4uLy4uL2NvbnN0cmFpbnRzJztcbmltcG9ydCB7IExheWVyLCBMYXllckFyZ3MsIFN5bWJvbGljVGVuc29yIH0gZnJvbSAnLi4vLi4vZW5naW5lL3RvcG9sb2d5JztcbmltcG9ydCB7IFZhbHVlRXJyb3IgfSBmcm9tICcuLi8uLi9lcnJvcnMnO1xuaW1wb3J0IHsgSW5pdGlhbGl6ZXIsIEluaXRpYWxpemVySWRlbnRpZmllciwgZ2V0SW5pdGlhbGl6ZXIsIHNlcmlhbGl6ZUluaXRpYWxpemVyIH0gZnJvbSAnLi4vLi4vaW5pdGlhbGl6ZXJzJztcbmltcG9ydCB7IFNoYXBlIH0gZnJvbSAnLi4vLi4va2VyYXNfZm9ybWF0L2NvbW1vbic7XG5pbXBvcnQgeyBSZWd1bGFyaXplciwgUmVndWxhcml6ZXJJZGVudGlmaWVyLCBnZXRSZWd1bGFyaXplciwgc2VyaWFsaXplUmVndWxhcml6ZXIgfSBmcm9tICcuLi8uLi9yZWd1bGFyaXplcnMnO1xuaW1wb3J0IHsgS3dhcmdzIH0gZnJvbSAnLi4vLi4vdHlwZXMnO1xuaW1wb3J0IHsgU29mdG1heCB9IGZyb20gJy4uL2FkdmFuY2VkX2FjdGl2YXRpb25zJztcbmltcG9ydCB7IERyb3BvdXQgfSBmcm9tICcuLi9jb3JlJztcbmltcG9ydCB7IEVpbnN1bURlbnNlIH0gZnJvbSAnLi9laW5zdW1fZGVuc2UnO1xuXG5jb25zdCBfQ0hSX0lEWCA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicuc3BsaXQoJycpO1xuLyoqXG4gKiBCdWlsZHMgZWluc3VtIGVxdWF0aW9ucyBmb3IgdGhlIGF0dGVudGlvbiBjb21wdXRhdGlvbi5cbiAqXG4gKiBRdWVyeSwga2V5LCB2YWx1ZSBpbnB1dHMgYWZ0ZXIgcHJvamVjdGlvbiBhcmUgZXhwZWN0ZWQgdG8gaGF2ZSB0aGUgc2hhcGUgYXM6XG4gKiBgKGJzLCA8bm9uLWF0dGVudGlvbiBkaW1zPiwgPGF0dGVudGlvbiBkaW1zPiwgbnVtSGVhZHMsIGNoYW5uZWxzKWAuXG4gKiBgYnNgIGFuZCBgPG5vbi1hdHRlbnRpb24gZGltcz5gIGFyZSB0cmVhdGVkIGFzIGA8YmF0Y2ggZGltcz5gLlxuICpcbiAqIFRoZSBhdHRlbnRpb24gb3BlcmF0aW9ucyBjYW4gYmUgZ2VuZXJhbGl6ZWQ6XG4gKiAoMSkgUXVlcnkta2V5IGRvdCBwcm9kdWN0OlxuICogYCg8YmF0Y2ggZGltcz4sIDxxdWVyeSBhdHRlbnRpb24gZGltcz4sIG51bUhlYWRzLCBjaGFubmVscyksICg8YmF0Y2ggZGltcz4sXG4gKiA8a2V5IGF0dGVudGlvbiBkaW1zPiwgbnVtSGVhZHMsIGNoYW5uZWxzKSAtPiAoPGJhdGNoIGRpbXM+LFxuICogbnVtSGVhZHMsIDxxdWVyeSBhdHRlbnRpb24gZGltcz4sIDxrZXkgYXR0ZW50aW9uIGRpbXM+KWBcbiAqICgyKSBDb21iaW5hdGlvbjpcbiAqIGAoPGJhdGNoIGRpbXM+LCBudW1IZWFkcywgPHF1ZXJ5IGF0dGVudGlvbiBkaW1zPiwgPGtleSBhdHRlbnRpb24gZGltcz4pLFxuICogKDxiYXRjaCBkaW1zPiwgPHZhbHVlIGF0dGVudGlvbiBkaW1zPiwgbnVtSGVhZHMsIGNoYW5uZWxzKSAtPiAoPGJhdGNoXG4gKiBkaW1zPiwgPHF1ZXJ5IGF0dGVudGlvbiBkaW1zPiwgbnVtSGVhZHMsIGNoYW5uZWxzKWBcbiAqXG4gKiBAcGFyYW0gcmFuayBSYW5rIG9mIHF1ZXJ5LCBrZXksIHZhbHVlIHRlbnNvcnMuXG4gKiBAcGFyYW0gYXR0bkF4ZXMgQXJyYXkgb2YgYXhlcywgYFstMSwgcmFuaylgLFxuICogICAgdGhhdCBhdHRlbnRpb24gd2lsbCBiZSBhcHBsaWVkIHRvLlxuICogQHJldHVybnMgRWluc3VtIGVxdWF0aW9ucy5cbiAqL1xuZnVuY3Rpb24gYnVpbGRBdHRlbnRpb25FcXVhdGlvbihcbiAgcmFuazogbnVtYmVyLCBhdHRuQXhlczogbnVtYmVyW11cbik6IFtzdHJpbmcsIHN0cmluZywgbnVtYmVyXSB7XG4gIGNvbnN0IHRhcmdldE5vdGF0aW9uQXJyID0gX0NIUl9JRFguc2xpY2UoMCwgcmFuayk7XG4gIC8vIGBiYXRjaERpbXNgIGluY2x1ZGVzIHRoZSBoZWFkIGRpbS5cbiAgY29uc3QgZXhjbHVkZUluZGljZXMgPSBbLi4uYXR0bkF4ZXMsIHJhbmsgLSAxXTtcbiAgY29uc3QgYmF0Y2hEaW1zID0gW107XG4gIGZvciAoY29uc3QgZSBvZiBBcnJheShyYW5rKS5rZXlzKCkpIHtcbiAgICBpZiAoIWV4Y2x1ZGVJbmRpY2VzLmluY2x1ZGVzKGUpKSB7XG4gICAgICBiYXRjaERpbXMucHVzaChlKTtcbiAgICB9XG4gIH1cbiAgbGV0IGxldHRlck9mZnNldCA9IHJhbms7XG4gIGxldCBzb3VyY2VOb3RhdGlvbiA9ICcnO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHJhbms7IGkrKykge1xuICAgIGlmIChiYXRjaERpbXMuaW5jbHVkZXMoaSkgfHwgaSA9PT0gcmFuayAtIDEpIHtcbiAgICAgIHNvdXJjZU5vdGF0aW9uICs9IHRhcmdldE5vdGF0aW9uQXJyW2ldO1xuICAgIH0gZWxzZSB7XG4gICAgICBzb3VyY2VOb3RhdGlvbiArPSBfQ0hSX0lEWFtsZXR0ZXJPZmZzZXRdO1xuICAgICAgbGV0dGVyT2Zmc2V0Kys7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcHJvZHVjdE5vdGF0aW9uID1cbiAgICBiYXRjaERpbXMubWFwKGkgPT4gdGFyZ2V0Tm90YXRpb25BcnJbaV0pLmNvbmNhdChcbiAgICBhdHRuQXhlcy5tYXAoaSA9PiB0YXJnZXROb3RhdGlvbkFycltpXSksXG4gICAgYXR0bkF4ZXMubWFwKGkgPT4gc291cmNlTm90YXRpb25baV0pLFxuICApLmpvaW4oJycpO1xuICBjb25zdCB0YXJnZXROb3RhdGlvbiA9IHRhcmdldE5vdGF0aW9uQXJyLmpvaW4oJycpO1xuXG4gIGNvbnN0IGRvdFByb2R1Y3RFcXVhdGlvbiA9XG4gICAgYCR7c291cmNlTm90YXRpb259LCR7dGFyZ2V0Tm90YXRpb259LT4ke3Byb2R1Y3ROb3RhdGlvbn1gO1xuICBjb25zdCBhdHRuU2NvcmVzUmFuayA9IHByb2R1Y3ROb3RhdGlvbi5sZW5ndGg7XG4gIGNvbnN0IGNvbWJpbmVFcXVhdGlvbiA9XG4gICAgYCR7cHJvZHVjdE5vdGF0aW9ufSwke3NvdXJjZU5vdGF0aW9ufS0+JHt0YXJnZXROb3RhdGlvbn1gO1xuXG4gIHJldHVybiBbZG90UHJvZHVjdEVxdWF0aW9uLCBjb21iaW5lRXF1YXRpb24sIGF0dG5TY29yZXNSYW5rXTtcbn1cblxuLyoqXG4gKiBCdWlsZHMgYW4gZWluc3VtIGVxdWF0aW9uIGZvciBwcm9qZWN0aW9ucyBpbnNpZGUgbXVsdGktaGVhZCBhdHRlbnRpb24uXG4gKi9cbmZ1bmN0aW9uIGJ1aWxkUHJvamVjdGlvbkVxdWF0aW9uKFxuICBmcmVlRGltczogbnVtYmVyLCBib3VuZERpbXM6IG51bWJlciwgb3V0cHV0RGltczogbnVtYmVyXG4pOiBbc3RyaW5nLCBzdHJpbmcsIG51bWJlcl0ge1xuICBsZXQgaW5wdXRTdHIgPSAnJztcbiAgbGV0IGtlcm5lbFN0ciA9ICcnO1xuICBsZXQgb3V0cHV0U3RyID0gJyc7XG4gIGxldCBiaWFzQXhlcyA9ICcnO1xuICBsZXQgbGV0dGVyT2Zmc2V0ID0gMDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGZyZWVEaW1zOyBpKyspIHtcbiAgICBjb25zdCBjaGFyID0gX0NIUl9JRFhbaSArIGxldHRlck9mZnNldF07XG4gICAgaW5wdXRTdHIgKz0gY2hhcjtcbiAgICBvdXRwdXRTdHIgKz0gY2hhcjtcbiAgfVxuXG4gIGxldHRlck9mZnNldCArPSBmcmVlRGltcztcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBib3VuZERpbXM7IGkrKykge1xuICAgIGNvbnN0IGNoYXIgPSBfQ0hSX0lEWFtpICsgbGV0dGVyT2Zmc2V0XTtcbiAgICBpbnB1dFN0ciArPSBjaGFyO1xuICAgIGtlcm5lbFN0ciArPSBjaGFyO1xuICB9XG5cbiAgbGV0dGVyT2Zmc2V0ICs9IGJvdW5kRGltcztcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBvdXRwdXREaW1zOyBpKyspIHtcbiAgICBjb25zdCBjaGFyID0gX0NIUl9JRFhbaSArIGxldHRlck9mZnNldF07XG4gICAga2VybmVsU3RyICs9IGNoYXI7XG4gICAgb3V0cHV0U3RyICs9IGNoYXI7XG4gICAgYmlhc0F4ZXMgKz0gY2hhcjtcbiAgfVxuXG4gIGNvbnN0IGVxdWF0aW9uID0gYCR7aW5wdXRTdHJ9LCR7a2VybmVsU3RyfS0+JHtvdXRwdXRTdHJ9YDtcbiAgcmV0dXJuIFtlcXVhdGlvbiwgYmlhc0F4ZXMsIG91dHB1dFN0ci5sZW5ndGhdO1xufVxuXG5mdW5jdGlvbiBnZXRPdXRwdXRTaGFwZShcbiAgb3V0cHV0UmFuazogbnVtYmVyLCBrbm93bkxhc3REaW1zOiBudW1iZXJbXVxuKTogU2hhcGUge1xuICBjb25zdCBvdXRwdXRTaGFwZSA9XG4gICAgQXJyYXkob3V0cHV0UmFuayAtIGtub3duTGFzdERpbXMubGVuZ3RoKS5maWxsKG51bGwpLmNvbmNhdChrbm93bkxhc3REaW1zKTtcbiAgcmV0dXJuIG91dHB1dFNoYXBlO1xufVxuXG5leHBvcnQgZGVjbGFyZSBpbnRlcmZhY2UgTXVsdGlIZWFkQXR0ZW50aW9uQXJncyBleHRlbmRzIExheWVyQXJncyB7XG4gIC8qKlxuICAgKiBJbnRlZ2VyLiBOdW1iZXIgb2YgYXR0ZW50aW9uIGhlYWRzLlxuICAgKi9cbiAgbnVtSGVhZHM6IG51bWJlcjtcblxuICAvKipcbiAgICogSW50ZWdlci4gU2l6ZSBvZiBlYWNoIGF0dGVudGlvbiBoZWFkIGZvciBxdWVyeSBhbmQga2V5LlxuICAgKi9cbiAga2V5RGltOiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEludGVnZXIuIFNpemUgb2YgZWFjaCBhdHRlbnRpb24gaGVhZCBmb3IgdmFsdWUuXG4gICAqIERlZmF1bHRzIHRvIGBrZXlEaW1gLlxuICAgKi9cbiAgdmFsdWVEaW0/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIERyb3BvdXQgcHJvYmFiaWxpdHkuXG4gICAqIERlZmF1bHRzIHRvIDAuMC5cbiAgICovXG4gIGRyb3BvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFdoZXRoZXIgdGhlIGRlbnNlIGxheWVycyB1c2UgYmlhcyB2ZWN0b3JzL21hdHJpY2VzLlxuICAgKiBEZWZhdWx0cyB0byB0cnVlLlxuICAgKi9cbiAgdXNlQmlhcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBleHBlY3RlZCBzaGFwZSBvZiBhbiBvdXRwdXQgdGVuc29yLCBiZXNpZGVzIHRoZSBiYXRjaFxuICAgKiBhbmQgc2VxdWVuY2UgZGltcy4gSWYgbm90IHNwZWNpZmllZCwgcHJvamVjdHMgYmFjayB0byB0aGUgcXVlcnlcbiAgICogZmVhdHVyZSBkaW0gKHRoZSBxdWVyeSBpbnB1dCdzIGxhc3QgZGltZW5zaW9uKS5cbiAgICovXG4gIG91dHB1dFNoYXBlPzogU2hhcGU7XG5cbiAgLyoqXG4gICAqIEF4ZXMgb3ZlciB3aGljaCB0aGUgYXR0ZW50aW9uIGlzIGFwcGxpZWQuIGBudWxsYCBtZWFucyBhdHRlbnRpb24gb3ZlclxuICAgKiBhbGwgYXhlcywgYnV0IGJhdGNoLCBoZWFkcywgYW5kIGZlYXR1cmVzLlxuICAgKi9cbiAgYXR0ZW50aW9uQXhlcz86IG51bWJlcltdfG51bWJlcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIGRlbnNlIGxheWVyIGtlcm5lbHMuXG4gICAqIERlZmF1bHRzIHRvIGBcImdsb3JvdFVuaWZvcm1cImAuXG4gICAqL1xuICBrZXJuZWxJbml0aWFsaXplcj86IEluaXRpYWxpemVyfEluaXRpYWxpemVySWRlbnRpZmllcjtcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXIgZm9yIGRlbnNlIGxheWVyIGJpYXNlcy5cbiAgICogRGVmYXVsdHMgdG8gYFwiemVyb3NcImAuXG4gICAqL1xuICBiaWFzSW5pdGlhbGl6ZXI/OiBJbml0aWFsaXplcnxJbml0aWFsaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZvciBkZW5zZSBsYXllciBrZXJuZWxzLlxuICAgKi9cbiAga2VybmVsUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcnxSZWd1bGFyaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZvciBkZW5zZSBsYXllciBiaWFzZXMuXG4gICAqL1xuICBiaWFzUmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcnxSZWd1bGFyaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIFJlZ3VsYXJpemVyIGZvciBkZW5zZSBsYXllciBhY3Rpdml0eS5cbiAgICovXG4gIGFjdGl2aXR5UmVndWxhcml6ZXI/OiBSZWd1bGFyaXplcnxSZWd1bGFyaXplcklkZW50aWZpZXI7XG5cbiAgLyoqXG4gICAqIENvbnN0cmFpbnQgZm9yIGRlbnNlIGxheWVyIGtlcm5lbHMuXG4gICAqL1xuICBrZXJuZWxDb25zdHJhaW50PzogQ29uc3RyYWludHxDb25zdHJhaW50SWRlbnRpZmllcjtcblxuICAvKipcbiAgICogQ29uc3RyYWludCBmb3IgZGVuc2UgbGF5ZXIga2VybmVscy5cbiAgICovXG4gIGJpYXNDb25zdHJhaW50PzogQ29uc3RyYWludHxDb25zdHJhaW50SWRlbnRpZmllcjtcbn1cblxuZXhwb3J0IGRlY2xhcmUgaW50ZXJmYWNlIE11bHRpSGVhZEF0dGVudGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogUXVlcnkgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBULCBkaW0pYC5cbiAgICovXG5cbiAgLyoqXG4gICAqIFZhbHVlIGBUZW5zb3JgIG9mIHNoYXBlIGAoQiwgUywgZGltKWAuXG4gICAqL1xuICB2YWx1ZTogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBLZXkgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBTLCBkaW0pYC4gSWYgbm90IGdpdmVuLCB3aWxsIHVzZSBgdmFsdWVgIGZvclxuICAgKiBib3RoIGBrZXlgIGFuZCBgdmFsdWVgLCB3aGljaCBpcyB0aGUgbW9zdCBjb21tb24gY2FzZS5cbiAgICovXG4gIGtleT86IFRlbnNvcjtcblxuICAvKipcbiAgICogQSBib29sZWFuIG1hc2sgb2Ygc2hhcGUgYChCLCBULCBTKWAsIHRoYXQgcHJldmVudHNcbiAgICogYXR0ZW50aW9uIHRvIGNlcnRhaW4gcG9zaXRpb25zLiBUaGUgYm9vbGVhbiBtYXNrIHNwZWNpZmllcyB3aGljaFxuICAgKiBxdWVyeSBlbGVtZW50cyBjYW4gYXR0ZW5kIHRvIHdoaWNoIGtleSBlbGVtZW50cywgMSBpbmRpY2F0ZXNcbiAgICogYXR0ZW50aW9uIGFuZCAwIGluZGljYXRlcyBubyBhdHRlbnRpb24uIEJyb2FkY2FzdGluZyBjYW4gaGFwcGVuIGZvclxuICAgKiB0aGUgbWlzc2luZyBiYXRjaCBkaW1lbnNpb25zIGFuZCB0aGUgaGVhZCBkaW1lbnNpb24uXG4gICAqL1xuICBhdHRlbnRpb25NYXNrPzogVGVuc29yO1xuXG4gIC8qKlxuICAgKiBJbmRpY2F0ZXMgd2hldGhlciB0aGUgbGF5ZXIgc2hvdWxkIGJlaGF2ZSBpbiB0cmFpbmluZyBtb2RlXG4gICAqIChhZGRpbmcgZHJvcG91dCkgb3IgaW4gaW5mZXJlbmNlIG1vZGUgKG5vIGRyb3BvdXQpLlxuICAgKiBXaWxsIGdvIHdpdGggZWl0aGVyIHVzaW5nIHRoZSB0cmFpbmluZyBtb2RlIG9mIHRoZSBwYXJlbnRcbiAgICogbGF5ZXIvbW9kZWwsIG9yIGZhbHNlIChpbmZlcmVuY2UpIGlmIHRoZXJlIGlzIG5vIHBhcmVudCBsYXllci5cbiAgICovXG4gIHRyYWluaW5nPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSW5kaWNhdGVzIHdoZXRoZXIgdG8gYXBwbHkgYSBjYXVzYWwgbWFzayB0byBwcmV2ZW50IHRva2VucyBmcm9tIGF0dGVuZGluZ1xuICAgKiB0byBmdXR1cmUgdG9rZW5zIChlLmcuLCB1c2VkIGluIGEgZGVjb2RlciBUcmFuc2Zvcm1lcikuXG4gICAqIERlZmF1bHRzIHRvIGZhbHNlLlxuICAgKi9cbiAgdXNlQ2F1c2FsTWFzaz86IGJvb2xlYW47XG59XG5cbi8qKlxuICogTXVsdGlIZWFkQXR0ZW50aW9uIGxheWVyLlxuICpcbiAqIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgbXVsdGktaGVhZGVkIGF0dGVudGlvbiBhcyBkZXNjcmliZWQgaW4gdGhlXG4gKiBwYXBlciBcIkF0dGVudGlvbiBpcyBhbGwgeW91IE5lZWRcIiAoVmFzd2FuaSBldCBhbC4sIDIwMTcpLlxuICogSWYgYHF1ZXJ5YCwgYGtleSxgIGB2YWx1ZWAgYXJlIHRoZSBzYW1lLCB0aGVuXG4gKiB0aGlzIGlzIHNlbGYtYXR0ZW50aW9uLiBFYWNoIHRpbWVzdGVwIGluIGBxdWVyeWAgYXR0ZW5kcyB0byB0aGVcbiAqIGNvcnJlc3BvbmRpbmcgc2VxdWVuY2UgaW4gYGtleWAsIGFuZCByZXR1cm5zIGEgZml4ZWQtd2lkdGggdmVjdG9yLlxuICpcbiAqIFRoaXMgbGF5ZXIgZmlyc3QgcHJvamVjdHMgYHF1ZXJ5YCwgYGtleWAgYW5kIGB2YWx1ZWAuIFRoZXNlIGFyZVxuICogKGVmZmVjdGl2ZWx5KSBhIGxpc3Qgb2YgdGVuc29ycyBvZiBsZW5ndGggYG51bUF0dGVudGlvbkhlYWRzYCwgd2hlcmUgdGhlXG4gKiBjb3JyZXNwb25kaW5nIHNoYXBlcyBhcmUgYChiYXRjaFNpemUsIDxxdWVyeSBkaW1lbnNpb25zPiwga2V5RGltKWAsXG4gKiBgKGJhdGNoU2l6ZSwgPGtleS92YWx1ZSBkaW1lbnNpb25zPiwga2V5RGltKWAsXG4gKiBgKGJhdGNoU2l6ZSwgPGtleS92YWx1ZSBkaW1lbnNpb25zPiwgdmFsdWVEaW0pYC5cbiAqXG4gKiBUaGVuLCB0aGUgcXVlcnkgYW5kIGtleSB0ZW5zb3JzIGFyZSBkb3QtcHJvZHVjdGVkIGFuZCBzY2FsZWQuIFRoZXNlIGFyZVxuICogc29mdG1heGVkIHRvIG9idGFpbiBhdHRlbnRpb24gcHJvYmFiaWxpdGllcy4gVGhlIHZhbHVlIHRlbnNvcnMgYXJlIHRoZW5cbiAqIGludGVycG9sYXRlZCBieSB0aGVzZSBwcm9iYWJpbGl0aWVzLCB0aGVuIGNvbmNhdGVuYXRlZCBiYWNrIHRvIGEgc2luZ2xlXG4gKiB0ZW5zb3IuXG4gKlxuICogRmluYWxseSwgdGhlIHJlc3VsdCB0ZW5zb3Igd2l0aCB0aGUgbGFzdCBkaW1lbnNpb24gYXMgdmFsdWVEaW0gY2FuIHRha2UgYW5cbiAqIGxpbmVhciBwcm9qZWN0aW9uIGFuZCByZXR1cm4uXG4gKlxuICogV2hlbiB1c2luZyBgTXVsdGlIZWFkQXR0ZW50aW9uYCBpbnNpZGUgYSBjdXN0b20gbGF5ZXIsIHRoZSBjdXN0b20gbGF5ZXIgbXVzdFxuICogaW1wbGVtZW50IGl0cyBvd24gYGJ1aWxkKClgIG1ldGhvZCBhbmQgY2FsbCBgTXVsdGlIZWFkQXR0ZW50aW9uYCdzXG4gKiBgYnVpbGRGcm9tU2lnbmF0dXJlKClgIHRoZXJlLlxuICogVGhpcyBlbmFibGVzIHdlaWdodHMgdG8gYmUgcmVzdG9yZWQgY29ycmVjdGx5IHdoZW4gdGhlIG1vZGVsIGlzIGxvYWRlZC5cbiAqXG4gKiBFeGFtcGxlczpcbiAqXG4gKiBQZXJmb3JtcyAxRCBjcm9zcy1hdHRlbnRpb24gb3ZlciB0d28gc2VxdWVuY2UgaW5wdXRzIHdpdGggYW4gYXR0ZW50aW9uIG1hc2suXG4gKiBSZXR1cm5zIHRoZSBhZGRpdGlvbmFsIGF0dGVudGlvbiB3ZWlnaHRzIG92ZXIgaGVhZHMuXG4gKlxuICogYGBganNcbiAqIGNvbnN0IGxheWVyID0gbmV3IE11bHRpSGVhZEF0dGVudGlvbih7bnVtSGVhZHM6IDIsIGtleURpbTogMn0pO1xuICogY29uc3QgdGFyZ2V0ID0gdGYuaW5wdXQoe3NoYXBlOiBbOCwgMTZdfSk7XG4gKiBjb25zdCBzb3VyY2UgPSB0Zi5pbnB1dCh7c2hhcGU6IFs0LCAxNl19KTtcbiAqIGNvbnN0IG91dHB1dFRlbnNvciwgd2VpZ2h0cyA9IGxheWVyLmNhbGxBbmRSZXR1cm5BdHRlbnRpb25TY29yZXMoXG4gKiAgICAgdGFyZ2V0LCB7dmFsdWU6IHNvdXJjZX0pO1xuICogY29uc29sZS5sb2cob3V0cHV0VGVuc29yLnNoYXBlKTsgIC8vIFtudWxsLCA4LCAxNl1cbiAqIGNvbnNvbGUubG9nKHdlaWdodHMuc2hhcGUpOyAgLy8gW251bGwsIDIsIDgsIDRdXG4gKiBgYGBcbiAqXG4gKiBQZXJmb3JtcyAyRCBzZWxmLWF0dGVudGlvbiBvdmVyIGEgNUQgaW5wdXQgdGVuc29yIG9uIGF4ZXMgMiBhbmQgMy5cbiAqXG4gKiBgYGBqc1xuICogY29uc3QgbGF5ZXIgPSBuZXcgTXVsdGlIZWFkQXR0ZW50aW9uKHtcbiAqICAgIG51bUhlYWRzOiAyLCBrZXlEaW06IDIsIGF0dGVudGlvbkF4ZXM6IFsyLCAzXX0pO1xuICogY29uc3QgaW5wdXRUZW5zb3IgPSB0Zi5pbnB1dCh7c2hhcGU6IFs1LCAzLCA0LCAxNl19KTtcbiAqIGNvbnN0IG91dHB1dFRlbnNvciA9IGxheWVyLmNhbGwoaW5wdXRUZW5zb3IsIHt2YWx1ZTogaW5wdXRUZW5zb3J9KTtcbiAqIGNvbnNvbGUubG9nKG91dHB1dFRlbnNvci5zaGFwZSk7ICAvLyBbbnVsbCwgNSwgMywgNCwgMTZdXG4gKiBgYGBcbiAqXG4gKiBSZXR1cm5zOlxuICogICAgYXR0ZW50aW9uT3V0cHV0OiBUaGUgcmVzdWx0IG9mIHRoZSBjb21wdXRhdGlvbiwgb2Ygc2hhcGUgYChCLCBULCBFKWAsXG4gKiAgICAgICAgd2hlcmUgYFRgIGlzIGZvciB0YXJnZXQgc2VxdWVuY2Ugc2hhcGVzIGFuZCBgRWAgaXMgdGhlIHF1ZXJ5IGlucHV0XG4gKiAgICAgICAgbGFzdCBkaW1lbnNpb24gaWYgYG91dHB1dFNoYXBlYCBpcyBgTm9uZWAuIE90aGVyd2lzZSwgdGhlXG4gKiAgICAgICAgbXVsdGktaGVhZCBvdXRwdXRzIGFyZSBwcm9qZWN0ZWQgdG8gdGhlIHNoYXBlIHNwZWNpZmllZCBieVxuICogICAgICAgIGBvdXRwdXRTaGFwZWAuXG4gKiAgICBhdHRlbnRpb25TY29yZXM6IG11bHRpLWhlYWQgYXR0ZW50aW9uIGNvZWZmaWNpZW50cyBvdmVyIGF0dGVudGlvbiBheGVzLlxuICovXG5leHBvcnQgY2xhc3MgTXVsdGlIZWFkQXR0ZW50aW9uIGV4dGVuZHMgTGF5ZXIge1xuICAvKiogQG5vY29sbGFwc2UgKi9cbiAgc3RhdGljIHJlYWRvbmx5IGNsYXNzTmFtZSA9ICdNdWx0aUhlYWRBdHRlbnRpb24nO1xuXG4gIHByb3RlY3RlZCByZWFkb25seSBudW1IZWFkczogbnVtYmVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkga2V5RGltOiBudW1iZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSB2YWx1ZURpbTogbnVtYmVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgZHJvcG91dDogbnVtYmVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgdXNlQmlhczogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IF9vdXRwdXRTaGFwZTogU2hhcGU7XG4gIHByb3RlY3RlZCByZWFkb25seSBrZXJuZWxJbml0aWFsaXplcjogSW5pdGlhbGl6ZXI7XG4gIHByb3RlY3RlZCByZWFkb25seSBiaWFzSW5pdGlhbGl6ZXI6IEluaXRpYWxpemVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkga2VybmVsUmVndWxhcml6ZXI6IFJlZ3VsYXJpemVyO1xuICBwcm90ZWN0ZWQgcmVhZG9ubHkgYmlhc1JlZ3VsYXJpemVyOiBSZWd1bGFyaXplcjtcbiAgcHJvdGVjdGVkIHJlYWRvbmx5IGtlcm5lbENvbnN0cmFpbnQ6IENvbnN0cmFpbnQ7XG4gIHByb3RlY3RlZCByZWFkb25seSBiaWFzQ29uc3RyYWludDogQ29uc3RyYWludDtcbiAgcHJvdGVjdGVkIGRvdFByb2R1Y3RFcXVhdGlvbjogc3RyaW5nO1xuICBwcm90ZWN0ZWQgY29tYmluZUVxdWF0aW9uOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBhdHRlbnRpb25BeGVzOiBudW1iZXJbXTtcbiAgcHJvdGVjdGVkIGJ1aWx0RnJvbVNpZ25hdHVyZTogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHNvZnRtYXg6IFNvZnRtYXg7XG4gIHByb3RlY3RlZCBkcm9wb3V0TGF5ZXI6IERyb3BvdXQ7XG4gIHByb3RlY3RlZCBxdWVyeVNoYXBlOiBTaGFwZTtcbiAgcHJvdGVjdGVkIGtleVNoYXBlOiBTaGFwZTtcbiAgcHJvdGVjdGVkIHZhbHVlU2hhcGU6IFNoYXBlO1xuICBwcm90ZWN0ZWQgcXVlcnlEZW5zZTogRWluc3VtRGVuc2U7XG4gIHByb3RlY3RlZCBrZXlEZW5zZTogRWluc3VtRGVuc2U7XG4gIHByb3RlY3RlZCB2YWx1ZURlbnNlOiBFaW5zdW1EZW5zZTtcbiAgcHJvdGVjdGVkIG91dHB1dERlbnNlOiBFaW5zdW1EZW5zZTtcblxuICBjb25zdHJ1Y3RvcihhcmdzOiBNdWx0aUhlYWRBdHRlbnRpb25BcmdzKSB7XG4gICAgc3VwZXIoYXJncyk7XG4gICAgdGhpcy5zdXBwb3J0c01hc2tpbmcgPSB0cnVlO1xuICAgIHRoaXMubnVtSGVhZHMgPSBhcmdzLm51bUhlYWRzO1xuICAgIHRoaXMua2V5RGltID0gYXJncy5rZXlEaW07XG4gICAgdGhpcy52YWx1ZURpbSA9IGFyZ3MudmFsdWVEaW0gPz8gYXJncy5rZXlEaW07XG4gICAgdGhpcy5kcm9wb3V0ID0gYXJncy5kcm9wb3V0ID8/IDA7XG4gICAgdGhpcy51c2VCaWFzID0gYXJncy51c2VCaWFzID8/IHRydWU7XG4gICAgdGhpcy5fb3V0cHV0U2hhcGUgPSBhcmdzLm91dHB1dFNoYXBlO1xuICAgIHRoaXMua2VybmVsSW5pdGlhbGl6ZXIgPSBnZXRJbml0aWFsaXplcihcbiAgICAgIGFyZ3Mua2VybmVsSW5pdGlhbGl6ZXIgPz8gJ2dsb3JvdFVuaWZvcm0nKTtcbiAgICB0aGlzLmJpYXNJbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKGFyZ3MuYmlhc0luaXRpYWxpemVyID8/ICd6ZXJvcycpO1xuICAgIHRoaXMua2VybmVsUmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmtlcm5lbFJlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmJpYXNSZWd1bGFyaXplciA9IGdldFJlZ3VsYXJpemVyKGFyZ3MuYmlhc1JlZ3VsYXJpemVyKTtcbiAgICB0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIgPSBnZXRSZWd1bGFyaXplcihhcmdzLmFjdGl2aXR5UmVndWxhcml6ZXIpO1xuICAgIHRoaXMua2VybmVsQ29uc3RyYWludCA9IGdldENvbnN0cmFpbnQoYXJncy5rZXJuZWxDb25zdHJhaW50KTtcbiAgICB0aGlzLmJpYXNDb25zdHJhaW50ID0gZ2V0Q29uc3RyYWludChhcmdzLmJpYXNDb25zdHJhaW50KTtcbiAgICBpZiAoYXJncy5hdHRlbnRpb25BeGVzICE9IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoYXJncy5hdHRlbnRpb25BeGVzKSkge1xuICAgICAgdGhpcy5hdHRlbnRpb25BeGVzID0gW2FyZ3MuYXR0ZW50aW9uQXhlc107XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuYXR0ZW50aW9uQXhlcyA9IGFyZ3MuYXR0ZW50aW9uQXhlcyBhcyBudW1iZXJbXTtcbiAgICB9XG4gICAgdGhpcy5idWlsdEZyb21TaWduYXR1cmUgPSBmYWxzZTtcbiAgICB0aGlzLnF1ZXJ5U2hhcGUgPSBudWxsO1xuICAgIHRoaXMua2V5U2hhcGUgPSBudWxsO1xuICAgIHRoaXMudmFsdWVTaGFwZSA9IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogU2hvdWxkIGJlIHVzZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seS5cbiAgICovXG4gIGdldCBfcXVlcnlEZW5zZSgpIHtcbiAgICByZXR1cm4gdGhpcy5xdWVyeURlbnNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3VsZCBiZSB1c2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG4gICAqL1xuICBnZXQgX2tleURlbnNlKCkge1xuICAgIHJldHVybiB0aGlzLmtleURlbnNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFNob3VsZCBiZSB1c2VkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkuXG4gICAqL1xuICBnZXQgX3ZhbHVlRGVuc2UoKSB7XG4gICAgcmV0dXJuIHRoaXMudmFsdWVEZW5zZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTaG91bGQgYmUgdXNlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5LlxuICAgKi9cbiAgZ2V0IF9vdXRwdXREZW5zZSgpIHtcbiAgICByZXR1cm4gdGhpcy5vdXRwdXREZW5zZTtcbiAgfVxuXG4gIG92ZXJyaWRlIGdldENvbmZpZygpOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3Qge1xuICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgIG51bUhlYWRzOiB0aGlzLm51bUhlYWRzLFxuICAgICAga2V5RGltOiB0aGlzLmtleURpbSxcbiAgICAgIHZhbHVlRGltOiB0aGlzLnZhbHVlRGltLFxuICAgICAgZHJvcG91dDogdGhpcy5kcm9wb3V0LFxuICAgICAgdXNlQmlhczogdGhpcy51c2VCaWFzLFxuICAgICAgb3V0cHV0U2hhcGU6IHRoaXMuX291dHB1dFNoYXBlLFxuICAgICAgYXR0ZW50aW9uQXhlczogdGhpcy5hdHRlbnRpb25BeGVzLFxuICAgICAga2VybmVsSW5pdGlhbGl6ZXI6IHNlcmlhbGl6ZUluaXRpYWxpemVyKHRoaXMua2VybmVsSW5pdGlhbGl6ZXIpLFxuICAgICAgYmlhc0luaXRpYWxpemVyOiBzZXJpYWxpemVJbml0aWFsaXplcih0aGlzLmJpYXNJbml0aWFsaXplciksXG4gICAgICBrZXJuZWxSZWd1bGFyaXplcjogc2VyaWFsaXplUmVndWxhcml6ZXIodGhpcy5rZXJuZWxSZWd1bGFyaXplciksXG4gICAgICBiaWFzUmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMuYmlhc1JlZ3VsYXJpemVyKSxcbiAgICAgIGFjdGl2aXR5UmVndWxhcml6ZXI6IHNlcmlhbGl6ZVJlZ3VsYXJpemVyKHRoaXMuYWN0aXZpdHlSZWd1bGFyaXplciksXG4gICAgICBrZXJuZWxDb25zdHJhaW50OiBzZXJpYWxpemVDb25zdHJhaW50KHRoaXMua2VybmVsQ29uc3RyYWludCksXG4gICAgICBiaWFzQ29uc3RyYWludDogc2VyaWFsaXplQ29uc3RyYWludCh0aGlzLmJpYXNDb25zdHJhaW50KSxcbiAgICAgIHF1ZXJ5U2hhcGU6IHRoaXMucXVlcnlTaGFwZSxcbiAgICAgIGtleVNoYXBlOiB0aGlzLmtleVNoYXBlLFxuICAgICAgdmFsdWVTaGFwZTogdGhpcy52YWx1ZVNoYXBlLFxuICAgIH07XG4gICAgY29uc3QgYmFzZUNvbmZpZyA9IHN1cGVyLmdldENvbmZpZygpO1xuICAgIE9iamVjdC5hc3NpZ24oY29uZmlnLCBiYXNlQ29uZmlnKTtcbiAgICByZXR1cm4gY29uZmlnO1xuICB9XG5cbiAgc3RhdGljIG92ZXJyaWRlIGZyb21Db25maWc8VCBleHRlbmRzIHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlPihcbiAgICBjbHM6IHNlcmlhbGl6YXRpb24uU2VyaWFsaXphYmxlQ29uc3RydWN0b3I8VD4sXG4gICAgY29uZmlnOiBzZXJpYWxpemF0aW9uLkNvbmZpZ0RpY3RcbiAgKTogVCB7XG4gICAgLy8gSWYgdGhlIGxheWVyIGhhcyBhIGRpZmZlcmVudCBidWlsZCgpIGZ1bmN0aW9uIGZyb20gdGhlIGRlZmF1bHQsXG4gICAgLy8gd2UgbmVlZCB0byB0cmlnZ2VyIHRoZSBjdXN0b21pemVkIGJ1aWxkIHRvIGNyZWF0ZSB3ZWlnaHRzLlxuICAgIGNvbnN0IHF1ZXJ5U2hhcGUgPSBjb25maWdbJ3F1ZXJ5U2hhcGUnXSBhcyBTaGFwZTtcbiAgICBjb25zdCBrZXlTaGFwZSA9IGNvbmZpZ1sna2V5U2hhcGUnXSBhcyBTaGFwZTtcbiAgICBjb25zdCB2YWx1ZVNoYXBlID0gY29uZmlnWyd2YWx1ZVNoYXBlJ10gYXMgU2hhcGU7XG4gICAgZGVsZXRlIGNvbmZpZ1sncXVlcnlTaGFwZSddO1xuICAgIGRlbGV0ZSBjb25maWdbJ2tleVNoYXBlJ107XG4gICAgZGVsZXRlIGNvbmZpZ1sndmFsdWVTaGFwZSddO1xuXG4gICAgY29uc3QgbGF5ZXIgPSBuZXcgY2xzKGNvbmZpZyk7XG4gICAgaWYgKFtxdWVyeVNoYXBlLCBrZXlTaGFwZSwgdmFsdWVTaGFwZV0uaW5jbHVkZXMobnVsbCkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICAgJ09uZSBvZiBkaW1lbnNpb25zIG9mIHRoZSBpbnB1dCBzaGFwZSBpcyBtaXNzaW5nLiBJdCAnICtcbiAgICAgICAgICAgICdzaG91bGQgaGF2ZSBiZWVuIG1lbW9yaXplZCB3aGVuIHRoZSBsYXllciB3YXMgc2VyaWFsaXplZC4gJyArXG4gICAgICAgICAgICBgJHtjbHMudG9TdHJpbmcoKX0gaXMgY3JlYXRlZCB3aXRob3V0IHdlaWdodHMuYFxuICAgICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAobGF5ZXIgYXMgdW5rbm93biBhcyBNdWx0aUhlYWRBdHRlbnRpb24pLmJ1aWxkRnJvbVNpZ25hdHVyZShcbiAgICAgICAgcXVlcnlTaGFwZSwgdmFsdWVTaGFwZSwga2V5U2hhcGUpO1xuICAgIH1cbiAgICByZXR1cm4gbGF5ZXI7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIGxheWVycyBhbmQgdmFyaWFibGVzLlxuICAgKlxuICAgKiBPbmNlIHRoZSBtZXRob2QgaXMgY2FsbGVkLCB0aGlzLmJ1aWx0RnJvbVNpZ25hdHVyZSB3aWxsIGJlIHNldCB0byB0cnVlLlxuICAgKi9cbiAgYnVpbGRGcm9tU2lnbmF0dXJlKFxuICAgIHF1ZXJ5U2hhcGU6IFNoYXBlLFxuICAgIHZhbHVlU2hhcGU6IFNoYXBlLFxuICAgIGtleVNoYXBlPzogU2hhcGVcbiAgKSB7XG4gICAgdGhpcy5idWlsdEZyb21TaWduYXR1cmUgPSB0cnVlO1xuXG4gICAgaWYgKGtleVNoYXBlID09IG51bGwpIHtcbiAgICAgIGtleVNoYXBlID0gdmFsdWVTaGFwZTtcbiAgICB9XG5cbiAgICB0aGlzLnF1ZXJ5U2hhcGUgPSBxdWVyeVNoYXBlO1xuICAgIHRoaXMudmFsdWVTaGFwZSA9IHZhbHVlU2hhcGU7XG4gICAgdGhpcy5rZXlTaGFwZSA9IGtleVNoYXBlO1xuXG4gICAgLy8gTm90IHVzaW5nIFN5bWJvbGljVGVuc29ycyBzaW5jZSB0Zi5pbnB1dCgpIGFkZHMgYSBiYXRjaCBkaW1lbnNpb24gdG8gdGhlXG4gICAgLy8gZ2l2ZW4gc2hhcGUsIHRoZXJlZm9yZSBnaXZpbmcgdGhlIHRlbnNvciB0aGUgd3JvbmcgcmFuay5cbiAgICBjb25zdCBxdWVyeVJhbmsgPSBxdWVyeVNoYXBlLmxlbmd0aDtcbiAgICBjb25zdCB2YWx1ZVJhbmsgPSB2YWx1ZVNoYXBlLmxlbmd0aDtcbiAgICBjb25zdCBrZXlSYW5rID0ga2V5U2hhcGUubGVuZ3RoO1xuXG4gICAgY29uc3QgZnJlZURpbXMgPSBxdWVyeVJhbmsgLSAxO1xuICAgIGxldCBbZWluc3VtRXF1YXRpb24sIGJpYXNBeGVzLCBvdXRwdXRSYW5rXSA9XG4gICAgICBidWlsZFByb2plY3Rpb25FcXVhdGlvbihmcmVlRGltcywgMSwgMik7XG4gICAgdGhpcy5xdWVyeURlbnNlID0gbmV3IEVpbnN1bURlbnNlKHtcbiAgICAgIGVxdWF0aW9uOiBlaW5zdW1FcXVhdGlvbixcbiAgICAgIG91dHB1dFNoYXBlOiBnZXRPdXRwdXRTaGFwZShvdXRwdXRSYW5rIC0gMSwgW3RoaXMubnVtSGVhZHMsIHRoaXMua2V5RGltXSksXG4gICAgICBiaWFzQXhlczogdGhpcy51c2VCaWFzID8gYmlhc0F4ZXMgOiBudWxsLFxuICAgICAgbmFtZTogJ3F1ZXJ5JyxcbiAgICAgIC4uLnRoaXMuZ2V0Q29tbW9uS3dhcmdzRm9yU3VibGF5ZXIoKSxcbiAgICB9KTtcblxuICAgIFtlaW5zdW1FcXVhdGlvbiwgYmlhc0F4ZXMsIG91dHB1dFJhbmtdID1cbiAgICAgIGJ1aWxkUHJvamVjdGlvbkVxdWF0aW9uKGtleVJhbmsgLSAxLCAxLCAyKTtcbiAgICB0aGlzLmtleURlbnNlID0gbmV3IEVpbnN1bURlbnNlKHtcbiAgICAgIGVxdWF0aW9uOiBlaW5zdW1FcXVhdGlvbixcbiAgICAgIG91dHB1dFNoYXBlOiBnZXRPdXRwdXRTaGFwZShvdXRwdXRSYW5rIC0gMSwgW3RoaXMubnVtSGVhZHMsIHRoaXMua2V5RGltXSksXG4gICAgICBiaWFzQXhlczogdGhpcy51c2VCaWFzID8gYmlhc0F4ZXMgOiBudWxsLFxuICAgICAgbmFtZTogJ2tleScsXG4gICAgICAuLi50aGlzLmdldENvbW1vbkt3YXJnc0ZvclN1YmxheWVyKCksXG4gICAgfSk7XG5cbiAgICBbZWluc3VtRXF1YXRpb24sIGJpYXNBeGVzLCBvdXRwdXRSYW5rXSA9XG4gICAgICBidWlsZFByb2plY3Rpb25FcXVhdGlvbih2YWx1ZVJhbmsgLSAxLCAxLCAyKTtcbiAgICB0aGlzLnZhbHVlRGVuc2UgPSBuZXcgRWluc3VtRGVuc2Uoe1xuICAgICAgZXF1YXRpb246IGVpbnN1bUVxdWF0aW9uLFxuICAgICAgb3V0cHV0U2hhcGU6IGdldE91dHB1dFNoYXBlKFxuICAgICAgICBvdXRwdXRSYW5rIC0gMSwgW3RoaXMubnVtSGVhZHMsIHRoaXMudmFsdWVEaW1dKSxcbiAgICAgIGJpYXNBeGVzOiB0aGlzLnVzZUJpYXMgPyBiaWFzQXhlcyA6IG51bGwsXG4gICAgICBuYW1lOiAndmFsdWUnLFxuICAgICAgLi4udGhpcy5nZXRDb21tb25Ld2FyZ3NGb3JTdWJsYXllcigpLFxuICAgIH0pO1xuXG4gICAgLy8gQnVpbGRzIHRoZSBhdHRlbnRpb24gY29tcHV0YXRpb25zIGZvciBtdWx0aS1oZWFkIGRvdCBwcm9kdWN0IGF0dGVudGlvbi5cbiAgICB0aGlzLmJ1aWxkQXR0ZW50aW9uKG91dHB1dFJhbmspO1xuICAgIHRoaXMub3V0cHV0RGVuc2UgPSB0aGlzLm1ha2VPdXRwdXREZW5zZShcbiAgICAgIGZyZWVEaW1zLFxuICAgICAgdGhpcy5nZXRDb21tb25Ld2FyZ3NGb3JTdWJsYXllcigpLFxuICAgICAgJ2F0dGVudGlvbk91dHB1dCdcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRDb21tb25Ld2FyZ3NGb3JTdWJsYXllcigpOiBLd2FyZ3Mge1xuICAgIC8vIENyZWF0ZSBuZXcgY2xvbmUgb2Yga2VybmVsL2JpYXMgaW5pdGlhbGl6ZXIsIHNvIHRoYXQgd2UgZG9uJ3QgcmV1c2VcbiAgICAvLyB0aGUgaW5pdGlhbGl6ZXIgaW5zdGFuY2UsIHdoaWNoIGNvdWxkIGxlYWQgdG8gc2FtZSBpbml0IHZhbHVlIHNpbmNlXG4gICAgLy8gaW5pdGlhbGl6ZXIgaXMgc3RhdGVsZXNzLlxuICAgIGNvbnN0IGtlcm5lbEluaXRpYWxpemVyID0gZ2V0SW5pdGlhbGl6ZXIoe1xuICAgICAgY2xhc3NOYW1lOiB0aGlzLmtlcm5lbEluaXRpYWxpemVyLmdldENsYXNzTmFtZSgpLFxuICAgICAgY29uZmlnOiB0aGlzLmtlcm5lbEluaXRpYWxpemVyLmdldENvbmZpZygpLFxuICAgIH0pO1xuICAgIGNvbnN0IGJpYXNJbml0aWFsaXplciA9IGdldEluaXRpYWxpemVyKHtcbiAgICAgIGNsYXNzTmFtZTogdGhpcy5iaWFzSW5pdGlhbGl6ZXIuZ2V0Q2xhc3NOYW1lKCksXG4gICAgICBjb25maWc6IHRoaXMuYmlhc0luaXRpYWxpemVyLmdldENvbmZpZygpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY29tbW9uS3dhcmdzID0ge1xuICAgICAga2VybmVsSW5pdGlhbGl6ZXIsXG4gICAgICBiaWFzSW5pdGlhbGl6ZXIsXG4gICAgICBrZXJuZWxSZWd1bGFyaXplcjogdGhpcy5rZXJuZWxSZWd1bGFyaXplcixcbiAgICAgIGJpYXNSZWd1bGFyaXplcjogdGhpcy5iaWFzUmVndWxhcml6ZXIsXG4gICAgICBhY3Rpdml0eVJlZ3VsYXJpemVyOiB0aGlzLmFjdGl2aXR5UmVndWxhcml6ZXIsXG4gICAgICBrZXJuZWxDb25zdHJhaW50OiB0aGlzLmtlcm5lbENvbnN0cmFpbnQsXG4gICAgICBiaWFzQ29uc3RyYWludDogdGhpcy5iaWFzQ29uc3RyYWludCxcbiAgICB9O1xuICAgIHJldHVybiBjb21tb25Ld2FyZ3M7XG4gIH1cblxuICAvKipcbiAgICogQnVpbGRzIHRoZSBvdXRwdXQgcHJvamVjdGlvbiBtYXRyaXguXG4gICAqXG4gICAqIEBwYXJhbSBmcmVlRGltcyBOdW1iZXIgb2YgZnJlZSBkaW1lbnNpb25zIGZvciBlaW5zdW0gZXF1YXRpb24gYnVpbGRpbmcuXG4gICAqIEBwYXJhbSBjb21tb25Ld2FyZ3MgQ29tbW9uIGtleXdvcmQgYXJndW1lbnRzIGZvciBlaW5zdW0gbGF5ZXIuXG4gICAqIEBwYXJhbSBuYW1lIE5hbWUgZm9yIHRoZSBwcm9qZWN0aW9uIGxheWVyLlxuICAgKiBAcmV0dXJucyBQcm9qZWN0aW9uIGxheWVyLlxuICAgKi9cbiAgcHJpdmF0ZSBtYWtlT3V0cHV0RGVuc2UoXG4gICAgZnJlZURpbXM6IG51bWJlciwgY29tbW9uS3dhcmdzOiBLd2FyZ3MsIG5hbWU/OiBzdHJpbmdcbiAgKTogRWluc3VtRGVuc2Uge1xuICAgIGxldCBvdXRwdXRTaGFwZTogU2hhcGU7XG4gICAgaWYgKHRoaXMuX291dHB1dFNoYXBlKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodGhpcy5fb3V0cHV0U2hhcGUpKSB7XG4gICAgICAgIG91dHB1dFNoYXBlID0gW3RoaXMuX291dHB1dFNoYXBlXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dFNoYXBlID0gdGhpcy5fb3V0cHV0U2hhcGU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dFNoYXBlID0gW3RoaXMucXVlcnlTaGFwZVt0aGlzLnF1ZXJ5U2hhcGUubGVuZ3RoIC0gMV1dO1xuICAgIH1cblxuICAgIGNvbnN0IFtlaW5zdW1FcXVhdGlvbiwgYmlhc0F4ZXMsIG91dHB1dFJhbmtdID1cbiAgICAgIGJ1aWxkUHJvamVjdGlvbkVxdWF0aW9uKGZyZWVEaW1zLCAyLCBvdXRwdXRTaGFwZS5sZW5ndGgpO1xuXG4gICAgcmV0dXJuIG5ldyBFaW5zdW1EZW5zZSh7XG4gICAgICBlcXVhdGlvbjogZWluc3VtRXF1YXRpb24sXG4gICAgICBvdXRwdXRTaGFwZTogZ2V0T3V0cHV0U2hhcGUob3V0cHV0UmFuayAtIDEsIG91dHB1dFNoYXBlKSxcbiAgICAgIGJpYXNBeGVzOiB0aGlzLnVzZUJpYXMgPyBiaWFzQXhlcyA6IG51bGwsXG4gICAgICBuYW1lLFxuICAgICAgLi4uY29tbW9uS3dhcmdzLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJ1aWxkcyBtdWx0aS1oZWFkIGRvdC1wcm9kdWN0IGF0dGVudGlvbiBjb21wdXRhdGlvbnMuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gYnVpbGRzIGF0dHJpYnV0ZXMgbmVjZXNzYXJ5IGZvciBgY29tcHV0ZUF0dGVudGlvbmAgdG9cbiAgICogY3VzdG9taXplIGF0dGVudGlvbiBjb21wdXRhdGlvbiB0byByZXBsYWNlIHRoZSBkZWZhdWx0IGRvdC1wcm9kdWN0XG4gICAqIGF0dGVudGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHJhbmsgVGhlIHJhbmsgb2YgcXVlcnksIGtleSwgdmFsdWUgdGVuc29ycy5cbiAgICovXG4gIHByb3RlY3RlZCBidWlsZEF0dGVudGlvbihyYW5rOiBudW1iZXIpIHtcbiAgICBpZiAodGhpcy5hdHRlbnRpb25BeGVzID09IG51bGwpIHtcbiAgICAgIHRoaXMuYXR0ZW50aW9uQXhlcyA9IFtdO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCByYW5rIC0gMjsgaSsrKSB7XG4gICAgICAgIHRoaXMuYXR0ZW50aW9uQXhlcy5wdXNoKGkpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmF0dGVudGlvbkF4ZXMgPSBbLi4udGhpcy5hdHRlbnRpb25BeGVzXTtcbiAgICB9XG5cbiAgICBjb25zdCBbZG90UHJvZHVjdEVxdWF0aW9uLCBjb21iaW5lRXF1YXRpb24sIGF0dG5TY29yZXNSYW5rXSA9XG4gICAgICBidWlsZEF0dGVudGlvbkVxdWF0aW9uKHJhbmssIHRoaXMuYXR0ZW50aW9uQXhlcyk7XG4gICAgdGhpcy5kb3RQcm9kdWN0RXF1YXRpb24gPSBkb3RQcm9kdWN0RXF1YXRpb247XG4gICAgdGhpcy5jb21iaW5lRXF1YXRpb24gPSBjb21iaW5lRXF1YXRpb247XG5cbiAgICBjb25zdCBub3JtQXhlczogbnVtYmVyW10gPSBbXTtcbiAgICBjb25zdCBzdGFydElkeCA9IGF0dG5TY29yZXNSYW5rIC0gdGhpcy5hdHRlbnRpb25BeGVzLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gc3RhcnRJZHg7IGkgPCBhdHRuU2NvcmVzUmFuazsgaSsrKSB7XG4gICAgICBub3JtQXhlcy5wdXNoKGkpO1xuICAgIH1cbiAgICB0aGlzLnNvZnRtYXggPSBuZXcgU29mdG1heCh7YXhpczogbm9ybUF4ZXN9KTtcbiAgICB0aGlzLmRyb3BvdXRMYXllciA9IG5ldyBEcm9wb3V0KHtyYXRlOiB0aGlzLmRyb3BvdXR9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBtYXNrZWRTb2Z0bWF4KFxuICAgIGF0dGVudGlvblNjb3JlczogVGVuc29yLCBhdHRlbnRpb25NYXNrPzogVGVuc29yXG4gICk6IFRlbnNvciB7XG4gICAgcmV0dXJuIHRpZHkoKCkgPT4ge1xuICAgICAgLy8gTm9ybWFsaXplIHRoZSBhdHRlbnRpb24gc2NvcmVzIHRvIHByb2JhYmlsaXRpZXMuXG4gICAgICAvLyBgYXR0ZW50aW9uU2NvcmVzYCA9IFtCLCBOLCBULCBTXVxuICAgICAgaWYgKGF0dGVudGlvbk1hc2sgIT0gbnVsbCkge1xuICAgICAgICAvLyBUaGUgZXhwYW5kIGRpbSBoYXBwZW5zIHN0YXJ0aW5nIGZyb20gdGhlIGBudW1IZWFkc2AgZGltZW5zaW9uLFxuICAgICAgICAvLyAoPGJhdGNoRGltcz4sIG51bUhlYWRzLCA8cXVlcnlBdHRlbnRpb25EaW1zLCBrZXlBdHRlbnRpb25EaW1zPilcbiAgICAgICAgY29uc3QgbWFza0V4cGFuc2lvbkF4aXMgPSAtdGhpcy5hdHRlbnRpb25BeGVzLmxlbmd0aCAqIDIgLSAxO1xuICAgICAgICBjb25zdCBlbmRJZHggPVxuICAgICAgICAgIGF0dGVudGlvblNjb3Jlcy5zaGFwZS5sZW5ndGggLSBhdHRlbnRpb25NYXNrLnNoYXBlLmxlbmd0aDtcbiAgICAgICAgZm9yIChsZXQgXyA9IDA7IF8gPCBlbmRJZHg7IF8rKykge1xuICAgICAgICAgIGF0dGVudGlvbk1hc2sgPSBleHBhbmREaW1zKGF0dGVudGlvbk1hc2ssIG1hc2tFeHBhbnNpb25BeGlzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuc29mdG1heC5hcHBseShcbiAgICAgICAgYXR0ZW50aW9uU2NvcmVzLCB7bWFzazogYXR0ZW50aW9uTWFza30pIGFzIFRlbnNvcjtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBsaWVzIERvdC1wcm9kdWN0IGF0dGVudGlvbiB3aXRoIHF1ZXJ5LCBrZXksIHZhbHVlIHRlbnNvcnMuXG4gICAqXG4gICAqIFRoaXMgZnVuY3Rpb24gZGVmaW5lcyB0aGUgY29tcHV0YXRpb24gaW5zaWRlIGBjYWxsYCB3aXRoIHByb2plY3RlZFxuICAgKiBtdWx0aS1oZWFkIFEsIEssIFYgaW5wdXRzLiBVc2VycyBjYW4gb3ZlcnJpZGUgdGhpcyBmdW5jdGlvbiBmb3JcbiAgICogY3VzdG9taXplZCBhdHRlbnRpb24gaW1wbGVtZW50YXRpb24uXG4gICAqXG4gICAqIEBwYXJhbSBxdWVyeSBQcm9qZWN0ZWQgcXVlcnkgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBULCBOLCBrZXlEaW0pYC5cbiAgICogQHBhcmFtIGtleSAgUHJvamVjdGVkIGtleSBgVGVuc29yYCBvZiBzaGFwZSBgKEIsIFMsIE4sIGtleURpbSlgLlxuICAgKiBAcGFyYW0gdmFsdWUgUHJvamVjdGVkIHZhbHVlIGBUZW5zb3JgIG9mIHNoYXBlIGAoQiwgUywgTiwgdmFsdWVEaW0pYC5cbiAgICogQHBhcmFtIGF0dGVudGlvbk1hc2sgQSBib29sZWFuIG1hc2sgb2Ygc2hhcGUgYChCLCBULCBTKWAsIHRoYXQgcHJldmVudHNcbiAgICogICAgYXR0ZW50aW9uIHRvIGNlcnRhaW4gcG9zaXRpb25zLiBJdCBpcyBnZW5lcmFsbHkgbm90IG5lZWRlZCBpZlxuICAgKiAgICB0aGUgYHF1ZXJ5YCBhbmQgYHZhbHVlYCAoYW5kL29yIGBrZXlgKSBhcmUgbWFza2VkLlxuICAgKiBAcGFyYW0gdHJhaW5pbmcgQm9vbGVhbiBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIGxheWVyIHNob3VsZCBiZWhhdmVcbiAgICogICAgaW4gdHJhaW5pbmcgbW9kZSAoYWRkaW5nIGRyb3BvdXQpIG9yIGluIGluZmVyZW5jZSBtb2RlIChkb2luZ1xuICAgKiAgICBub3RoaW5nKS5cbiAgICogQHJldHVybnMgYXR0ZW50aW9uT3V0cHV0OiBNdWx0aS1oZWFkZWQgb3V0cHV0cyBvZiBhdHRlbnRpb24gY29tcHV0YXRpb24uXG4gICAqIEByZXR1cm5zIGF0dGVudGlvblNjb3JlczogTXVsdGktaGVhZGVkIGF0dGVudGlvbiB3ZWlnaHRzLlxuICAgKi9cbiAgcHJvdGVjdGVkIGNvbXB1dGVBdHRlbnRpb24oXG4gICAgcXVlcnk6IFRlbnNvcixcbiAgICBrZXk6IFRlbnNvcixcbiAgICB2YWx1ZTogVGVuc29yLFxuICAgIGF0dGVudGlvbk1hc2s/OiBUZW5zb3IsXG4gICAgdHJhaW5pbmc/OiBib29sZWFuXG4gICk6IFtUZW5zb3IsIFRlbnNvcl0ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIC8vIE5vdGU6IEFwcGx5aW5nIHNjYWxhciBtdWx0aXBseSBhdCB0aGUgc21hbGxlciBlbmQgb2YgZWluc3VtIGltcHJvdmVzXG4gICAgICAvLyBYTEEgcGVyZm9ybWFuY2UsIGJ1dCBtYXkgaW50cm9kdWNlIHNsaWdodCBudW1lcmljIGRpZmZlcmVuY2VzIGluXG4gICAgICAvLyB0aGUgVHJhbnNmb3JtZXIgYXR0ZW50aW9uIGhlYWQuXG4gICAgICBxdWVyeSA9IG11bChxdWVyeSwgMS4wIC8gTWF0aC5zcXJ0KHRoaXMua2V5RGltKSk7XG5cbiAgICAgIC8vIFRha2UgdGhlIGRvdCBwcm9kdWN0IGJldHdlZW4gXCJxdWVyeVwiIGFuZCBcImtleVwiIHRvIGdldCB0aGUgcmF3XG4gICAgICAvLyBhdHRlbnRpb24gc2NvcmVzLlxuICAgICAgbGV0IGF0dGVudGlvblNjb3JlcyA9IGVpbnN1bSh0aGlzLmRvdFByb2R1Y3RFcXVhdGlvbiwga2V5LCBxdWVyeSk7XG5cbiAgICAgIGF0dGVudGlvblNjb3JlcyA9IHRoaXMubWFza2VkU29mdG1heChhdHRlbnRpb25TY29yZXMsIGF0dGVudGlvbk1hc2spO1xuXG4gICAgICAvLyBUaGlzIGlzIGFjdHVhbGx5IGRyb3BwaW5nIG91dCBlbnRpcmUgdG9rZW5zIHRvIGF0dGVuZCB0bywgd2hpY2ggbWlnaHRcbiAgICAgIC8vIHNlZW0gYSBiaXQgdW51c3VhbCwgYnV0IGlzIHRha2VuIGZyb20gdGhlIG9yaWdpbmFsIFRyYW5zZm9ybWVyIHBhcGVyLlxuICAgICAgY29uc3QgYXR0ZW50aW9uU2NvcmVzRHJvcG91dCA9XG4gICAgICAgIHRoaXMuZHJvcG91dExheWVyLmFwcGx5KGF0dGVudGlvblNjb3Jlcywge3RyYWluaW5nfSkgYXMgVGVuc29yO1xuXG4gICAgICAvLyBgY29udGV4dExheWVyYCA9IFtCLCBULCBOLCBIXVxuICAgICAgY29uc3QgYXR0ZW50aW9uT3V0cHV0ID1cbiAgICAgICAgZWluc3VtKHRoaXMuY29tYmluZUVxdWF0aW9uLCBhdHRlbnRpb25TY29yZXNEcm9wb3V0LCB2YWx1ZSk7XG5cbiAgICAgIHJldHVybiBbYXR0ZW50aW9uT3V0cHV0LCBhdHRlbnRpb25TY29yZXNdO1xuICAgIH0pO1xuICB9XG5cbiAgb3ZlcnJpZGUgYXBwbHkoXG4gICAgaW5wdXRzOiBUZW5zb3IgfCBTeW1ib2xpY1RlbnNvcixcbiAgICBrd2FyZ3M/OiBLd2FyZ3NcbiAgKTogVGVuc29yIHwgVGVuc29yW10gfCBTeW1ib2xpY1RlbnNvciB8IFN5bWJvbGljVGVuc29yW10ge1xuICAgIGlmICgha3dhcmdzIHx8ICFrd2FyZ3NbJ3ZhbHVlJ10pIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKCdNdXN0IHBhc3MgaW4gYHZhbHVlYCBhcmd1bWVudCBpbiBga3dhcmdzLmAnKTtcbiAgICB9XG4gICAgbGV0IG5ld0lucHV0czogVGVuc29yW118U3ltYm9saWNUZW5zb3JbXTtcblxuICAgIG5ld0lucHV0cyA9IFtpbnB1dHMsIGt3YXJnc1sndmFsdWUnXV0uY29uY2F0KGt3YXJnc1sna2V5J10gPz8gW10pO1xuXG4gICAgLy8gVE9ETyhwZm9yZGVyaXF1ZSk6IFN1cHBvcnQgbWFzayBwcm9wYWdhdGlvbi5cbiAgICByZXR1cm4gc3VwZXIuYXBwbHkobmV3SW5wdXRzLCBrd2FyZ3MpO1xuICB9XG5cbiAgb3ZlcnJpZGUgY2FsbChcbiAgICBxdWVyeTogVGVuc29yLCBrd2FyZ3M6IE11bHRpSGVhZEF0dGVudGlvbk9wdGlvbnNcbiAgKTogVGVuc29yIHtcbiAgICByZXR1cm4gdGlkeSgoKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5jYWxsQW5kUmV0dXJuQXR0ZW50aW9uU2NvcmVzKHF1ZXJ5LCBrd2FyZ3MpWzBdO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4YWN0bHkgbGlrZSBgY2FsbGAgZXhjZXB0IGFsc28gcmV0dXJucyB0aGUgYXR0ZW50aW9uIHNjb3Jlcy5cbiAgICovXG4gIGNhbGxBbmRSZXR1cm5BdHRlbnRpb25TY29yZXMoXG4gICAgcXVlcnk6IFRlbnNvcixcbiAgICB7XG4gICAgICB2YWx1ZSxcbiAgICAgIGtleSxcbiAgICAgIHVzZUNhdXNhbE1hc2ssXG4gICAgICBhdHRlbnRpb25NYXNrLFxuICAgICAgdHJhaW5pbmdcbiAgICB9OiBNdWx0aUhlYWRBdHRlbnRpb25PcHRpb25zXG4gICk6IFtUZW5zb3IsIFRlbnNvcl0ge1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGlmICghdGhpcy5idWlsdEZyb21TaWduYXR1cmUpIHtcbiAgICAgICAgdGhpcy5idWlsZEZyb21TaWduYXR1cmUoXG4gICAgICAgICAgcXVlcnkuc2hhcGUsXG4gICAgICAgICAgdmFsdWUuc2hhcGUsXG4gICAgICAgICAga2V5ID8ga2V5LnNoYXBlIDogbnVsbFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PSBudWxsKSB7XG4gICAgICAgIGtleSA9IHZhbHVlO1xuICAgICAgfVxuXG4gICAgICAvLyBUT0RPKHBmb3JkZXJpcXVlKTogU3VwcG9ydCBSYWdnZWRUZW5zb3IgaW5wdXRzLlxuXG4gICAgICBhdHRlbnRpb25NYXNrID0gdGhpcy5jb21wdXRlQXR0ZW50aW9uTWFzayhcbiAgICAgICAgcXVlcnksXG4gICAgICAgIHZhbHVlLFxuICAgICAgICBhdHRlbnRpb25NYXNrLFxuICAgICAgICB1c2VDYXVzYWxNYXNrLFxuICAgICAgKTtcblxuICAgICAgLy8gICBOID0gYG51bUF0dGVudGlvbkhlYWRzYFxuICAgICAgLy8gICBIID0gYHNpemVQZXJIZWFkYFxuICAgICAgLy8gYHF1ZXJ5YCA9IFtCLCBULCBOICxIXVxuICAgICAgcXVlcnkgPSB0aGlzLnF1ZXJ5RGVuc2UuYXBwbHkocXVlcnkpIGFzIFRlbnNvcjtcblxuICAgICAgLy8gYGtleWAgPSBbQiwgUywgTiwgSF1cbiAgICAgIGtleSA9IHRoaXMua2V5RGVuc2UuYXBwbHkoa2V5KSBhcyBUZW5zb3I7XG5cbiAgICAgIC8vIGB2YWx1ZWAgPSBbQiwgUywgTiwgSF1cbiAgICAgIHZhbHVlID0gdGhpcy52YWx1ZURlbnNlLmFwcGx5KHZhbHVlKSBhcyBUZW5zb3I7XG5cbiAgICAgIGNvbnN0IFthdHRlbnRpb25PdXRwdXRQcmVEZW5zZSwgYXR0ZW50aW9uU2NvcmVzXSA9IHRoaXMuY29tcHV0ZUF0dGVudGlvbihcbiAgICAgICAgcXVlcnksXG4gICAgICAgIGtleSxcbiAgICAgICAgdmFsdWUsXG4gICAgICAgIGF0dGVudGlvbk1hc2ssXG4gICAgICAgIHRyYWluaW5nXG4gICAgICApO1xuICAgICAgY29uc3QgYXR0ZW50aW9uT3V0cHV0ID1cbiAgICAgICAgdGhpcy5vdXRwdXREZW5zZS5hcHBseShhdHRlbnRpb25PdXRwdXRQcmVEZW5zZSkgYXMgVGVuc29yO1xuXG4gICAgICByZXR1cm4gW2F0dGVudGlvbk91dHB1dCwgYXR0ZW50aW9uU2NvcmVzXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21wdXRlcyB0aGUgYXR0ZW50aW9uIG1hc2suXG4gICAqXG4gICAqICogVGhlIGBxdWVyeWAncyBtYXNrIGlzIHJlc2hhcGVkIGZyb20gW0IsIFRdIHRvIFtCLCBULCAxXS5cbiAgICogKiBUaGUgYHZhbHVlYCdzIG1hc2sgaXMgcmVzaGFwZWQgZnJvbSBbQiwgU10gdG8gW0IsIDEsIFNdLlxuICAgKiAqIFRoZSBga2V5YCdzIG1hc2sgaXMgcmVzaGFwZWQgZnJvbSBbQiwgU10gdG8gW0IsIDEsIFNdLiBUaGUgYGtleWAnc1xuICAgKiAgIG1hc2sgaXMgaWdub3JlZCBpZiBga2V5YCBpcyBgTm9uZWAgb3IgaWYgYGtleSBpcyB2YWx1ZWAuXG4gICAqICogSWYgYHVzZUNhdXNhbE1hc2s9dHJ1ZWAsIHRoZW4gdGhlIGNhdXNhbCBtYXNrIGlzIGNvbXB1dGVkLiBJdHMgc2hhcGVcbiAgICogICBpcyBbMSwgVCwgU10uXG4gICAqXG4gICAqIEFsbCBkZWZpbmVkIG1hc2tzIGFyZSBtZXJnZWQgdXNpbmcgYSBsb2dpY2FsIEFORCBvcGVyYXRpb24gKGAmYCkuXG4gICAqXG4gICAqIEluIGdlbmVyYWwsIGlmIHRoZSBgcXVlcnlgIGFuZCBgdmFsdWVgIGFyZSBtYXNrZWQsIHRoZW4gdGhlcmUgaXMgbm8gbmVlZFxuICAgKiB0byBkZWZpbmUgdGhlIGBhdHRlbnRpb25NYXNrYC5cbiAgICpcbiAgICogQHBhcmFtIHF1ZXJ5IFByb2plY3RlZCBxdWVyeSBgVGVuc29yYCBvZiBzaGFwZSBgKEIsIFQsIE4sIGtleURpbSlgLlxuICAgKiBAcGFyYW0ga2V5ICBQcm9qZWN0ZWQga2V5IGBUZW5zb3JgIG9mIHNoYXBlIGAoQiwgUywgTiwga2V5RGltKWAuXG4gICAqIEBwYXJhbSB2YWx1ZSBQcm9qZWN0ZWQgdmFsdWUgYFRlbnNvcmAgb2Ygc2hhcGUgYChCLCBTLCBOLCB2YWx1ZURpbSlgLlxuICAgKiBAcGFyYW0gYXR0ZW50aW9uTWFzayBBIGJvb2xlYW4gbWFzayBvZiBzaGFwZSBgKEIsIFQsIFMpYCwgdGhhdCBwcmV2ZW50c1xuICAgKiAgICBhdHRlbnRpb24gdG8gY2VydGFpbiBwb3NpdGlvbnMuXG4gICAqIEBwYXJhbSB1c2VDYXVzYWxNYXNrICBBIGJvb2xlYW4gdG8gaW5kaWNhdGUgd2hldGhlciB0byBhcHBseSBhIGNhdXNhbFxuICAgKiAgICBtYXNrIHRvIHByZXZlbnQgdG9rZW5zIGZyb20gYXR0ZW5kaW5nIHRvIGZ1dHVyZSB0b2tlbnMgKGUuZy4sXG4gICAqICAgIHVzZWQgaW4gYSBkZWNvZGVyIFRyYW5zZm9ybWVyKS5cbiAgICogQHJldHVybnMgYXR0ZW50aW9uTWFzazogQSBib29sZWFuIG1hc2sgb2Ygc2hhcGUgYChCLCBULCBTKWAsIHRoYXQgcHJldmVudHNcbiAgICogICAgYXR0ZW50aW9uIHRvIGNlcnRhaW4gcG9zaXRpb25zLCBiYXNlZCBvbiB0aGUgS2VyYXMgbWFza3Mgb2YgdGhlXG4gICAqICAgIGBxdWVyeWAsIGBrZXlgLCBgdmFsdWVgLCBhbmQgYGF0dGVudGlvbk1hc2tgIHRlbnNvcnMsIGFuZCB0aGVcbiAgICogICAgY2F1c2FsIG1hc2sgaWYgYHVzZUNhdXNhbE1hc2s9dHJ1ZWAuXG4gICAqL1xuICBwcml2YXRlIGNvbXB1dGVBdHRlbnRpb25NYXNrKFxuICAgIHF1ZXJ5OiBUZW5zb3IsXG4gICAgdmFsdWU6IFRlbnNvcixcbiAgICBhdHRlbnRpb25NYXNrPzogVGVuc29yLFxuICAgIHVzZUNhdXNhbE1hc2sgPSBmYWxzZVxuICApOiBUZW5zb3Ige1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGxldCBhdXRvTWFzazogVGVuc29yO1xuXG4gICAgICBjb25zdCBxdWVyeU1hc2sgPSBxdWVyeS5rZXJhc01hc2s7XG4gICAgICBjb25zdCB2YWx1ZU1hc2sgPSB2YWx1ZS5rZXJhc01hc2s7XG4gICAgICBpZiAocXVlcnlNYXNrICE9IG51bGwpIHtcbiAgICAgICAgYXV0b01hc2sgPSBxdWVyeU1hc2suZXhwYW5kRGltcygyKTsgLy8gU2hhcGUgaXMgW0IsIFQsIDFdXG4gICAgICB9XG4gICAgICBpZiAodmFsdWVNYXNrICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgbWFzayA9IHZhbHVlTWFzay5leHBhbmREaW1zKDEpOyAvLyBTaGFwZSBpcyBbQiwgMSwgU11cbiAgICAgICAgYXV0b01hc2sgPSBhdXRvTWFzayA/IGxvZ2ljYWxBbmQoYXV0b01hc2ssIG1hc2spIDogbWFzaztcbiAgICAgIH1cbiAgICAgIGlmICh1c2VDYXVzYWxNYXNrKSB7XG4gICAgICAgIC8vIHRoZSBzaGFwZSBvZiB0aGUgY2F1c2FsIG1hc2sgaXMgWzEsIFQsIFNdXG4gICAgICAgIGNvbnN0IG1hc2sgPSB0aGlzLmNvbXB1dGVDYXVzYWxNYXNrKHF1ZXJ5LCB2YWx1ZSk7XG4gICAgICAgIGF1dG9NYXNrID0gYXV0b01hc2sgPyBsb2dpY2FsQW5kKGF1dG9NYXNrLCBtYXNrKSA6IG1hc2s7XG4gICAgICB9XG4gICAgICBpZiAoYXV0b01hc2sgIT0gbnVsbCkge1xuICAgICAgICAvLyBNZXJnZSBhdHRlbnRpb25NYXNrICYgYXV0b21hdGljIG1hc2ssIHRvIHNoYXBlIFtCLCBULCBTXVxuICAgICAgICBhdHRlbnRpb25NYXNrID0gYXR0ZW50aW9uTWFzayA/XG4gICAgICAgICAgY2FzdChhdHRlbnRpb25NYXNrLCAnYm9vbCcpLmxvZ2ljYWxBbmQoYXV0b01hc2spIDogYXV0b01hc2s7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhdHRlbnRpb25NYXNrO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbXB1dGVzIGEgY2F1c2FsIG1hc2sgKGUuZy4sIGZvciBtYXNrZWQgc2VsZi1hdHRlbnRpb24gbGF5ZXJzKS5cbiAgICpcbiAgICogRm9yIGV4YW1wbGUsIGlmIHF1ZXJ5IGFuZCB2YWx1ZSBib3RoIGNvbnRhaW4gc2VxdWVuY2VzIG9mIGxlbmd0aCA0LFxuICAgKiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYSBib29sZWFuIGBUZW5zb3JgIGVxdWFsIHRvOlxuICAgKlxuICAgKiBgYGBcbiAgICogW1tbdHJ1ZSwgIGZhbHNlLCBmYWxzZSwgZmFsc2VdLFxuICAgKiAgIFt0cnVlLCAgdHJ1ZSwgIGZhbHNlLCBmYWxzZV0sXG4gICAqICAgW3RydWUsICB0cnVlLCAgdHJ1ZSwgIGZhbHNlXSxcbiAgICogICBbdHJ1ZSwgIHRydWUsICB0cnVlLCAgdHJ1ZV1dXVxuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIHF1ZXJ5IHF1ZXJ5IGBUZW5zb3JgIG9mIHNoYXBlIGAoQiwgVCwgLi4uKWAuXG4gICAqIEBwYXJhbSB2YWx1ZSB2YWx1ZSBgVGVuc29yYCBvZiBzaGFwZSBgKEIsIFMsIC4uLilgIChkZWZhdWx0cyB0byBxdWVyeSkuXG4gICAqIEByZXR1cm5zIG1hc2s6IEEgYm9vbGVhbiBgVGVuc29yYCBvZiBzaGFwZSBbMSwgVCwgU10gY29udGFpbmluZyBhIGxvd2VyXG4gICAqICAgIHRyaWFuZ3VsYXIgbWF0cml4IG9mIHNoYXBlIFtULCBTXS5cbiAgICovXG4gIHByaXZhdGUgY29tcHV0ZUNhdXNhbE1hc2socXVlcnk6IFRlbnNvciwgdmFsdWU/OiBUZW5zb3IpOiBUZW5zb3Ige1xuICAgIHJldHVybiB0aWR5KCgpID0+IHtcbiAgICAgIGNvbnN0IHFTZXFMZW5ndGggPSBxdWVyeS5zaGFwZVsxXTtcbiAgICAgIGNvbnN0IHZTZXFMZW5ndGggPSB2YWx1ZSA/IHZhbHVlLnNoYXBlWzFdIDogcVNlcUxlbmd0aDtcbiAgICAgIC8vIENyZWF0ZSBhIGxvd2VyIHRyaWFuZ3VsYXIgbWF0cml4LlxuICAgICAgcmV0dXJuIGxpbmFsZy5iYW5kUGFydChvbmVzKFsxLCBxU2VxTGVuZ3RoLCB2U2VxTGVuZ3RoXSwgJ2Jvb2wnKSwgLTEsIDApO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqXG4gICAqIEBwYXJhbSBpbnB1dFNoYXBlcyBBIGxpc3Qgb2YgW3F1ZXJ5U2hhcGUsIHZhbHVlU2hhcGVdIG9yXG4gICAqICAgIFtxdWVyeVNoYXBlLCB2YWx1ZVNoYXBlLCBrZXlTaGFwZV0uIElmIG5vIGtleVNoYXBlIHByb3ZpZGVkLCB2YWx1ZVNoYXBlXG4gICAqICAgIGlzIGFzc3VtZWQgYXMgdGhlIGtleVNoYXBlLlxuICAgKi9cbiAgb3ZlcnJpZGUgY29tcHV0ZU91dHB1dFNoYXBlKGlucHV0U2hhcGVzOiBbU2hhcGUsIFNoYXBlLCBTaGFwZXxudWxsXSk6IFNoYXBlIHtcbiAgICBjb25zdCBbcXVlcnlTaGFwZSwgdmFsdWVTaGFwZSwgbWF5YmVLZXlTaGFwZV0gPSBpbnB1dFNoYXBlcztcbiAgICBjb25zdCBrZXlTaGFwZSA9IG1heWJlS2V5U2hhcGUgPz8gdmFsdWVTaGFwZTtcblxuICAgIGlmIChxdWVyeVNoYXBlLnNsaWNlKC0xKVswXSAhPT0gdmFsdWVTaGFwZS5zbGljZSgtMSlbMF0pIHtcbiAgICAgIHRocm93IG5ldyBWYWx1ZUVycm9yKFxuICAgICAgICBgVGhlIGxhc3QgZGltZW5zaW9uIG9mICdxdWVyeVNoYXBlJyBhbmQgJ3ZhbHVlU2hhcGUnIG11c3QgYmUgZXF1YWwsIGAgK1xuICAgICAgICBgYnV0IGFyZSAke3F1ZXJ5U2hhcGUuc2xpY2UoLTEpWzBdfSwgJHt2YWx1ZVNoYXBlLnNsaWNlKC0xKVswXX0uIGAgK1xuICAgICAgICBgUmVjZWl2ZWQ6IHF1ZXJ5U2hhcGU9JHtxdWVyeVNoYXBlfSwgdmFsdWVTaGFwZT0ke3ZhbHVlU2hhcGV9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXV0aWwuYXJyYXlzRXF1YWwodmFsdWVTaGFwZS5zbGljZSgxLCAtMSksIGtleVNoYXBlLnNsaWNlKDEsIC0xKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYEFsbCBkaW1lbnNpb25zIG9mICd2YWx1ZScgYW5kICdrZXknLCBleGNlcHQgdGhlIGxhc3Qgb25lLCBtdXN0IGJlIGAgK1xuICAgICAgICBgZXF1YWwuIFJlY2VpdmVkICR7dmFsdWVTaGFwZX0gYW5kICR7a2V5U2hhcGV9YFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fb3V0cHV0U2hhcGUpIHtcbiAgICAgIHJldHVybiBxdWVyeVNoYXBlLnNsaWNlKDAsIC0xKS5jb25jYXQodGhpcy5fb3V0cHV0U2hhcGUpO1xuICAgIH1cblxuICAgIHJldHVybiBxdWVyeVNoYXBlO1xuICB9XG59XG5zZXJpYWxpemF0aW9uLnJlZ2lzdGVyQ2xhc3MoTXVsdGlIZWFkQXR0ZW50aW9uKTtcbiJdfQ==