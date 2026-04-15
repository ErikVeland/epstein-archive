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
/// <amd-module name="@tensorflow/tfjs-layers/dist/layers/nlp/modeling/transformer_decoder" />
/**
 *  Transformer decoder block implementation based on TFJS `Layer`.
 */
import { Tensor, serialization } from '@tensorflow/tfjs-core';
import { Activation } from '../../../activations';
import { Layer, LayerArgs, SymbolicTensor } from '../../../engine/topology';
import { Initializer, InitializerIdentifier } from '../../../initializers';
import { ActivationIdentifier } from '../../../keras_format/activation_config';
import { Shape } from '../../../keras_format/common';
import { Dense, Dropout } from '../../core';
import { LayerNormalization } from '../../normalization';
import { CachedMultiHeadAttention } from './cached_multihead_attention';
export declare interface TransformerDecoderArgs extends LayerArgs {
    /**
     * Integer. The hidden size of feedforward network.
     */
    intermediateDim: number;
    /**
     * Integer. The number of heads in MultiHeadAttention.
     */
    numHeads: number;
    /**
     * The dropout value, shared by MultiHeadAttention and feedforward network.
     * Defaults to `0.`.
     */
    dropout?: number;
    /**
     * The activation function of feedforward network.
     * Defaults to `"relu"`.
     */
    activation?: Activation | ActivationIdentifier;
    /**
     * The eps value in layer normalization components.
     * Defaults to `1e-5`.
     */
    layerNormEpsilon?: number;
    /**
     * The kernel initializer for the dense and multiheaded attention layers.
     * Defaults to `"glorotUniform"`.
     */
    kernelInitializer?: Initializer | InitializerIdentifier;
    /**
     * The bias initializer for the dense and multiheaded attention layers.
     * Defaults to `"zeros"`.
     */
    biasInitializer?: Initializer | InitializerIdentifier;
    /**
     * If true, the inputs to the attention layer(s) and the intermediate dense
     * layer are normalized (similar to GPT-2). If set to false, outputs of
     * attention layer and intermediate dense layer are normalized
     * (similar to BERT).
     * Defaults to `false`.
     */
    normalizeFirst?: boolean;
}
export declare interface TransformerDecoderOptions {
    /**
     * decoderSequence: The decode input sequence.
     */
    /**
     * The encoder input sequence. For decoder only models (like GPT2), this
     * should be left `null`. Once the model is called without an encoderSequence,
     * you cannot call it again with encoderSequence.
     */
    encoderSequence?: Tensor | SymbolicTensor;
    /**
     * A boolean Tensor, the padding mask of decoder sequence, must be of shape
     * `[batchSize, decoderSequenceLength]`.
     */
    decoderPaddingMask?: Tensor | SymbolicTensor;
    /**
     * A boolean Tensor. Customized decoder sequence mask, must be of shape
     * `[batchSize, decoderSequenceLength, decoderSequenceLength]`.
     */
    decoderAttentionMask?: Tensor;
    /**
     * A boolean Tensor, the padding mask of encoder sequence, must be of shape
     * `[batchSize, encoderSequenceLength]`.
     */
    encoderPaddingMask?: Tensor;
    /**
     * A boolean Tensor. Customized encoder sequence mask, must be of shape
     * `[batchSize, encoderSequenceLength, encoderSequenceLength]`.
     */
    encoderAttentionMask?: Tensor;
    /**
     * A dense float Tensor. The cache of key/values pairs in the self-attention
     * layer. Has shape `[batchSize, 2, maxSeqLen, numHeads, keyDims]`.
     */
    selfAttentionCache?: Tensor;
    /**
     * Integer or Integer Tensor. The index at which to update the
     * `selfAttentionCache`. Usually, this is the index of the current token
     * being processed during decoding.
     */
    selfAttentionCacheUpdateIndex?: number;
    /**
     * A dense float Tensor. The cache of key/value pairs in the cross-attention
     * layer. Has shape `[batchSize, 2, S, numHeads, keyDims]`.
     */
    crossAttentionCache?: Tensor;
    /**
     * Integer or Integer Tensor. The index at which to update the
     * `crossAttentionCache`. Usually, this is either `0` (compute the entire
     * `crossAttentionCache`), or `null` (reuse a previously computed
     * `crossAttentionCache`).
     */
    crossAttentionCacheUpdateIndex?: number;
    /**
     * If true, a causal mask (masking out future input) is applied on the decoder
     * sequence.
     * Defaults to `true`.
     */
    useCausalMask?: boolean;
}
/**
 * Transformer decoder.
 *
 * This class follows the architecture of the transformer decoder layer in the
 * paper [Attention is All You Need](https://arxiv.org/abs/1706.03762). Users
 * can instantiate multiple instances of this class to stack up a decoder.
 *
 * By default, this layer will apply a causal mask to the decoder attention
 * layer. This layer will correctly compute an attention mask from an implicit
 * padding mask (for example, by passing `maskZero=true` to a
 * `tf.layers.embedding` layer). See the Masking and Padding
 * [guide](https://keras.io/guides/understanding_masking_and_padding/)
 * for more details.
 *
 * This layer can be called with either one or two inputs. The number of inputs
 * must be consistent across all calls. The options are as follows:
 *    `layer.call(decoderSequence)`: no cross-attention will be built into the
 *         decoder block. This is useful when building a "decoder-only"
 *         transformer such as GPT-2.
 *    `layer.call(decoderSequence, {encoderSequence})`: cross-attention will be
 *         built into the decoder block. This is useful when building an
 *         "encoder-decoder" transformer, such as the original transformer
 *         model described in Attention is All You Need.
 *
 * Examples:
 * ```js
 * // Create a single transformer decoder layer.
 * const decoder = new TransformerDecoder({intermediateDim: 64, numHeads: 8});
 *
 * // Create a simple model containing the decoder.
 * const decoderInput = tf.input({shape: [10, 64]});
 * const encoderInput = tf.input({shape: {[10, 64]});
 * const output = decoder.call(decoderInput, {encoderInput});
 * const model = tf.model({
 *     inputs: [decoderInput, encoderInput],
 *     outputs: output,
 * );
 *
 * // Call decoder on the inputs.
 * const decoderInputData = tf.randomUniform([2, 10, 64]);
 * const encoderInputData = tf.randomUniform([2, 10, 64]);
 * const decoderOutput = model.predict([decoderInputData, encoderInputData]);
 * ```
 *
 * References:
 *  - [Vaswani et al., 2017](https://arxiv.org/abs/1706.03762)
 */
export declare class TransformerDecoder extends Layer {
    /** @nocollapse */
    static readonly className = "TransformerDecoder";
    protected intermediateDim: number;
    protected numHeads: number;
    protected dropout: number;
    protected activation: Activation;
    protected layerNormEpsilon: number;
    protected kernelInitializer: Initializer;
    protected biasInitializer: Initializer;
    protected normalizeFirst: boolean;
    protected decoderSequenceShape: Shape;
    protected encoderSequenceShape: Shape;
    protected selfAttentionLayer: CachedMultiHeadAttention;
    protected selfAttentionLayernorm: LayerNormalization;
    protected selfAttentionDropout: Dropout;
    protected selfCrossAttentionLayer: CachedMultiHeadAttention;
    protected selfCrossAttentionLayernorm: LayerNormalization;
    protected selfCrossAttentionDropout: Dropout;
    protected feedforwardIntermediateDense: Dense;
    protected feedforwardOutputDense: Dense;
    protected feedforwardLayernorm: LayerNormalization;
    protected feedforwardDropout: Dropout;
    constructor(args: TransformerDecoderArgs);
    /**
     *
     * @param inputShape decoderSequenceShape or
     *  [decoderSequenceShape, encoderSequenceShape]
     */
    build(inputShape: Shape | [Shape, Shape]): void;
    apply(decoderSequence: Tensor | SymbolicTensor, kwargs?: TransformerDecoderOptions): Tensor | SymbolicTensor;
    call(decoderSequence: Tensor, kwargs: TransformerDecoderOptions): Tensor;
    /**
     * Forward pass of the TransformerDecoder.
     *
     * @returns One of three things, depending on call arguments:
     *   - `[outputs, null, null]`, if `selfAttentionCache` is `null`.
     *   - `[outputs, selfAttentionCache, null]`, if `selfAttentionCache` is
     *     set and the layer has no cross-attention.
     *   - `[outputs, selfAttentionCache, crossAttentionCache]`, if
     *     `selfAttentionCache` and `crossAttentionCache` are set and
     *     the layer has cross-attention.
     */
    callAndReturnCaches(decoderSequence: Tensor, kwargs: TransformerDecoderOptions): [Tensor, Tensor, Tensor];
    private computeSelfAttentionMask;
    getConfig(): serialization.ConfigDict;
    computeOutputShape(decoderSequenceShape: Shape): Shape;
}
